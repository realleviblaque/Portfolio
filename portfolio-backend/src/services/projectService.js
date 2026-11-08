import mongoose from 'mongoose'
import { HttpError } from '../utils/httpErrors.js'
import { adminProject, publicProject } from '../utils/query.js'
import { escapeRegex, pageSort, paginationOptions } from '../utils/pagination.js'
import { runMongoTransaction } from '../utils/mongoTransactions.js'
import { lockTechnologyReferences } from '../utils/technologyReferences.js'

const publicFields = 'title slug shortDescription description category status publicationStatus coverImage gallery technologies liveUrl repositoryUrl startedAt completedAt timeline createdAt updatedAt'
const adminFields = `${publicFields} _id`

function queryFilter(query, { includePublication = false } = {}) {
  const filter = {}
  if (includePublication && query.publicationStatus !== 'all') filter.publicationStatus = query.publicationStatus
  else if (!includePublication) filter.publicationStatus = 'published'
  if (query.status) filter.status = query.status
  if (query.category) filter.category = query.category
  if (query.search) {
    const expression = new RegExp(escapeRegex(query.search), 'i')
    filter.$or = [{ title: expression }, { shortDescription: expression }, { description: expression }]
  }
  return filter
}

async function resolveTechnologyFilter(technology, TechnologyModel) {
  if (!technology) return null
  const found = mongoose.isValidObjectId(technology)
    ? await TechnologyModel.findById(technology).select('_id')
    : await TechnologyModel.findOne({ $or: [{ slug: technology.toLowerCase() }, { name: new RegExp(`^${escapeRegex(technology)}$`, 'i') }] }).select('_id')
  return found ? found._id : false
}

async function resolveTechnologyValues(value, TechnologyModel, session) {
  if (value === undefined) return undefined
  const values = Array.isArray(value) ? value : value.split(',').map((item) => item.trim()).filter(Boolean)
  const ids = values.filter((item) => mongoose.isValidObjectId(item))
  const names = values.filter((item) => !mongoose.isValidObjectId(item))
  const found = []
  if (ids.length) {
    let query = TechnologyModel.find({ _id: { $in: ids } }).select('_id')
    if (session && typeof query?.session === 'function') query = query.session(session)
    const records = await query
    found.push(...records.map((record) => String(record._id)))
    if (found.length !== ids.length) throw new HttpError(400, 'INVALID_TECHNOLOGY', 'One or more technology identifiers do not exist.')
  }
  if (names.length) {
    let query = TechnologyModel.find({ name: { $in: names.map((name) => new RegExp(`^${escapeRegex(name)}$`, 'i')) } }).select('_id name')
    if (session && typeof query?.session === 'function') query = query.session(session)
    const records = await query
    const byName = new Map(records.map((record) => [record.name.toLowerCase(), String(record._id)]))
    for (const name of names) {
      const resolved = byName.get(name.toLowerCase())
      if (!resolved) throw new HttpError(400, 'UNKNOWN_TECHNOLOGY', `Technology “${name}” does not exist. Create it in technology management first.`)
      found.push(resolved)
    }
  }
  return [...new Set(found)].map((item) => new mongoose.Types.ObjectId(item))
}

async function uniqueSlug(base, ProjectModel, excludeId) {
  const slugBase = base.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180).replace(/-+$/g, '')
  if (!slugBase) throw new HttpError(400, 'INVALID_SLUG', 'The project title cannot produce a valid URL slug.')
  let slug = slugBase
  let suffix = 2
  while (await ProjectModel.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${slugBase}-${suffix}`
    suffix += 1
  }
  return slug
}

function normalizeProjectInput(input) {
  const values = { ...input }
  if (Object.hasOwn(values, 'coverFile') && values.coverFile !== null) {
    throw new HttpError(400, 'IMAGE_UPLOAD_UNAVAILABLE', 'Project image uploads are not available yet. Supply stored image metadata instead.')
  }
  delete values.coverFile
  if (Object.hasOwn(values, 'coverPreview')) {
    const preview = values.coverPreview
    if (preview && !values.coverImage) values.coverImage = { url: preview }
    if (preview && values.coverImage?.url !== preview) {
      throw new HttpError(400, 'IMAGE_UPLOAD_UNAVAILABLE', 'Project image uploads are not available yet. Supply stored image metadata instead.')
    }
    delete values.coverPreview
  }
  if (Object.hasOwn(values, 'gallery')) {
    values.gallery = values.gallery.map((image) => {
      if (image.file !== undefined && image.file !== null) {
        throw new HttpError(400, 'IMAGE_UPLOAD_UNAVAILABLE', 'Project image uploads are not available yet. Supply stored image metadata instead.')
      }
      const { id: _id, preview, file: _file, ...metadata } = image
      if (preview && metadata.url !== preview) {
        throw new HttpError(400, 'IMAGE_UPLOAD_UNAVAILABLE', 'Project image uploads are not available yet. Supply stored image metadata instead.')
      }
      return metadata
    })
  }
  if (Object.hasOwn(values, 'startDate')) {
    if (Object.hasOwn(values, 'startedAt')) throw new HttpError(400, 'AMBIGUOUS_DATE', 'Send either startDate or startedAt, not both.')
    values.startedAt = values.startDate
    delete values.startDate
  }
  if (Object.hasOwn(values, 'endDate')) {
    if (Object.hasOwn(values, 'completedAt')) throw new HttpError(400, 'AMBIGUOUS_DATE', 'Send either endDate or completedAt, not both.')
    values.completedAt = values.endDate
    delete values.endDate
  }
  if (Object.hasOwn(values, 'status')) values.status = values.status.toLowerCase()
  if (Object.hasOwn(values, 'category')) values.category = values.category.toLowerCase()
  return values
}

function assertPublishedRequirements(values) {
  if (values.publicationStatus !== 'published') return
  const missing = []
  if (!values.description?.trim()) missing.push('description')
  if (!values.category?.trim()) missing.push('category')
  if (!values.coverImage?.url) missing.push('coverImage')
  if (missing.length) throw new HttpError(400, 'PUBLISHED_PROJECT_INCOMPLETE', `A published project requires: ${missing.join(', ')}.`)
}

function assertProjectDates(values) {
  if (values.startedAt && values.completedAt && new Date(values.completedAt) < new Date(values.startedAt)) {
    throw new HttpError(400, 'INVALID_PROJECT_DATES', 'The completion date must be on or after the start date.')
  }
}

function queryWith(query, operation, ...args) {
  return typeof query?.[operation] === 'function' ? query[operation](...args) : query
}

export function createProjectService({ ProjectModel, TechnologyModel, runTransaction = runMongoTransaction }) {
  async function overview() {
    const count = (filter) => ProjectModel.countDocuments(filter)
    const [totalProjects, publishedProjects, draftProjects, ongoingProjects, completedProjects, pausedProjects] = await Promise.all([
      count({}), count({ publicationStatus: 'published' }), count({ publicationStatus: 'draft' }),
      count({ status: 'ongoing' }), count({ status: 'completed' }), count({ status: 'paused' }),
    ])
    let cursor = ProjectModel.find({}).select('title slug shortDescription status publicationStatus coverImage createdAt updatedAt')
    cursor = queryWith(cursor, 'sort', { createdAt: -1, _id: -1 })
    cursor = queryWith(cursor, 'limit', 5)
    cursor = queryWith(cursor, 'lean')
    const recentProjects = (await cursor).map(adminProject)
    return { totalProjects, publishedProjects, draftProjects, ongoingProjects, completedProjects, pausedProjects, recentProjects }
  }

  async function getProject(id, { publicOnly = false } = {}) {
    const filter = { _id: id, ...(publicOnly ? { publicationStatus: 'published' } : {}) }
    const project = await queryWith(ProjectModel.findOne(filter), 'populate', { path: 'technologies', select: 'name slug category icon' })
    if (!project) throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found.')
    return publicOnly ? publicProject(project) : adminProject(project)
  }

  async function getBySlug(slug) {
    const project = await queryWith(ProjectModel.findOne({ slug, publicationStatus: 'published' }), 'populate', { path: 'technologies', select: 'name slug category icon' })
    if (!project) throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found.')
    return publicProject(project)
  }

  async function listProjects(query, { publicOnly = false } = {}) {
    const { page, limit, skip } = paginationOptions(query)
    const filter = queryFilter(query, { includePublication: !publicOnly })
    if (query.technology) {
      const technologyId = await resolveTechnologyFilter(query.technology, TechnologyModel)
      if (technologyId === false) return { items: [], page, limit, total: 0 }
      filter.technologies = technologyId
    }
    const countPromise = ProjectModel.countDocuments(filter)
    let cursor = ProjectModel.find(filter)
    cursor = queryWith(cursor, 'select', publicOnly ? publicFields : adminFields)
    cursor = queryWith(cursor, 'populate', { path: 'technologies', select: 'name slug category icon' })
    cursor = queryWith(cursor, 'sort', pageSort(query.sort))
    cursor = queryWith(cursor, 'skip', skip)
    cursor = queryWith(cursor, 'limit', limit)
    cursor = queryWith(cursor, 'lean')
    const [records, total] = await Promise.all([cursor, countPromise])
    return { items: records.map((item) => publicOnly ? publicProject(item) : adminProject(item)), page, limit, total }
  }

  async function createProject(input) {
    return runTransaction(async (session) => {
      const data = normalizeProjectInput(input)
      const requestedSlug = data.slug
      delete data.slug
      data.slug = requestedSlug || await uniqueSlug(data.title, ProjectModel)
      if (requestedSlug && await ProjectModel.exists({ slug: requestedSlug })) {
        throw new HttpError(409, 'DUPLICATE_SLUG', 'A project with this slug already exists.')
      }
      if (data.technologies !== undefined) {
        data.technologies = await resolveTechnologyValues(data.technologies, TechnologyModel, session)
        await lockTechnologyReferences(data.technologies, TechnologyModel, session)
      }
      assertPublishedRequirements({ ...data, publicationStatus: data.publicationStatus || 'draft' })
      assertProjectDates(data)
      try {
        const createdRows = await ProjectModel.create([data], session ? { session } : {})
        const created = createdRows[0]
        let populatedQuery = queryWith(ProjectModel.findById(created._id), 'populate', { path: 'technologies', select: 'name slug category icon' })
        if (session && typeof populatedQuery?.session === 'function') populatedQuery = populatedQuery.session(session)
        const populated = await populatedQuery
        return adminProject(populated || created)
      } catch (error) {
        if (error?.code === 11000) throw new HttpError(409, 'DUPLICATE_SLUG', 'A project with this slug already exists.')
        throw error
      }
    })
  }

  async function updateProject(id, input) {
    return runTransaction(async (session) => {
      let existingQuery = ProjectModel.findById(id)
      if (session && typeof existingQuery?.session === 'function') existingQuery = existingQuery.session(session)
      const existing = await existingQuery
      if (!existing) throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found.')
      const data = normalizeProjectInput(input)
      if (Object.hasOwn(data, 'technologies')) {
        data.technologies = await resolveTechnologyValues(data.technologies, TechnologyModel, session)
        await lockTechnologyReferences(data.technologies, TechnologyModel, session)
      }
      const currentValues = existing.toObject ? existing.toObject() : existing
      assertPublishedRequirements({ ...currentValues, ...data, publicationStatus: data.publicationStatus || existing.publicationStatus })
      assertProjectDates({ ...currentValues, ...data })
      if (data.slug) {
        const collision = await ProjectModel.exists({ slug: data.slug, _id: { $ne: id } })
        if (collision) throw new HttpError(409, 'DUPLICATE_SLUG', 'A project with this slug already exists.')
      }
      try {
        const updated = await ProjectModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true, ...(session ? { session } : {}) })
        if (!updated) throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found.')
        let populatedQuery = queryWith(ProjectModel.findById(id), 'populate', { path: 'technologies', select: 'name slug category icon' })
        if (session && typeof populatedQuery?.session === 'function') populatedQuery = populatedQuery.session(session)
        const populated = await populatedQuery
        return adminProject(populated || updated)
      } catch (error) {
        if (error?.code === 11000) throw new HttpError(409, 'DUPLICATE_SLUG', 'A project with this slug already exists.')
        throw error
      }
    })
  }

  async function deleteProject(id) {
    const deleted = await ProjectModel.findByIdAndDelete(id)
    if (!deleted) throw new HttpError(404, 'PROJECT_NOT_FOUND', 'Project not found.')
    return { id: String(deleted._id ?? deleted.id), deleted: true }
  }

  return { overview, listProjects, getProject, getBySlug, createProject, updateProject, deleteProject }
}
