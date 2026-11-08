import { HttpError } from '../utils/httpErrors.js'
import { adminTechnology } from '../utils/query.js'
import { escapeRegex, pageSort, paginationOptions } from '../utils/pagination.js'
import { normalizeTechnologyName } from '../utils/technologyName.js'
import { runMongoTransaction } from '../utils/mongoTransactions.js'
import { lockTechnologyReferences } from '../utils/technologyReferences.js'

function createSlug(name) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 110).replace(/-+$/g, '')
}

function withQuery(query, method, ...args) {
  return typeof query?.[method] === 'function' ? query[method](...args) : query
}

export function createTechnologyService({ TechnologyModel, ProjectModel, runTransaction = runMongoTransaction }) {
  async function getTechnology(id) {
    const technology = await TechnologyModel.findById(id)
    if (!technology) throw new HttpError(404, 'TECHNOLOGY_NOT_FOUND', 'Technology not found.')
    return adminTechnology(technology)
  }

  async function listTechnologies(query) {
    const { page, limit, skip } = paginationOptions(query)
    const filter = {}
    if (query.category) filter.category = query.category
    if (query.search) filter.name = new RegExp(escapeRegex(query.search), 'i')
    const [total, records] = await Promise.all([
      TechnologyModel.countDocuments(filter),
      withQuery(withQuery(withQuery(withQuery(TechnologyModel.find(filter), 'sort', pageSort(query.sort)), 'skip', skip), 'limit', limit), 'lean'),
    ])
    return { items: records.map(adminTechnology), page, limit, total }
  }

  async function createTechnology(input) {
    const data = { ...input, name: input.name.trim(), normalizedName: normalizeTechnologyName(input.name), slug: input.slug || createSlug(input.name), category: input.category?.trim().toLowerCase() || 'other' }
    if (!data.slug) throw new HttpError(400, 'INVALID_SLUG', 'The technology name cannot produce a valid URL slug.')
    const duplicateName = await TechnologyModel.findOne({ normalizedName: data.normalizedName })
    if (duplicateName) throw new HttpError(409, 'DUPLICATE_TECHNOLOGY', 'A technology with this name already exists.')
    if (await TechnologyModel.findOne({ slug: data.slug })) throw new HttpError(409, 'DUPLICATE_TECHNOLOGY', 'A technology with this slug already exists.')
    try {
      return adminTechnology(await TechnologyModel.create(data))
    } catch (error) {
      if (error?.code === 11000) throw new HttpError(409, 'DUPLICATE_TECHNOLOGY', 'A technology with this name or slug already exists.')
      throw error
    }
  }

  async function updateTechnology(id, input) {
    const current = await TechnologyModel.findById(id)
    if (!current) throw new HttpError(404, 'TECHNOLOGY_NOT_FOUND', 'Technology not found.')
    const data = { ...input }
    if (data.name) {
      data.name = data.name.trim()
      data.normalizedName = normalizeTechnologyName(data.name)
      const collision = await TechnologyModel.findOne({ normalizedName: data.normalizedName, _id: { $ne: id } })
      if (collision) throw new HttpError(409, 'DUPLICATE_TECHNOLOGY', 'A technology with this name already exists.')
    }
    if (data.category) data.category = data.category.trim().toLowerCase()
    try {
      const updated = await TechnologyModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      if (!updated) throw new HttpError(404, 'TECHNOLOGY_NOT_FOUND', 'Technology not found.')
      return adminTechnology(updated)
    } catch (error) {
      if (error?.code === 11000) throw new HttpError(409, 'DUPLICATE_TECHNOLOGY', 'A technology with this name or slug already exists.')
      throw error
    }
  }

  async function deleteTechnology(id) {
    return runTransaction(async (session) => {
      const technology = await TechnologyModel.findOneAndUpdate(
        { _id: id }, { $inc: { __v: 1 } }, { returnDocument: 'after', ...(session ? { session } : {}) },
      )
      if (!technology) throw new HttpError(404, 'TECHNOLOGY_NOT_FOUND', 'Technology not found.')
      let referenceQuery = ProjectModel.exists({ technologies: id })
      if (session && typeof referenceQuery?.session === 'function') referenceQuery = referenceQuery.session(session)
      if (await referenceQuery) {
        throw new HttpError(409, 'TECHNOLOGY_IN_USE', 'Remove this technology from its projects before deleting it.')
      }
      const deleted = await TechnologyModel.findByIdAndDelete(id, session ? { session } : {})
      if (!deleted) throw new HttpError(404, 'TECHNOLOGY_NOT_FOUND', 'Technology not found.')
      return { id: String(deleted._id ?? deleted.id), deleted: true }
    })
  }

  async function publicTechnologies() {
    const ids = await ProjectModel.distinct('technologies', { publicationStatus: 'published' })
    if (!ids.length) return []
    const records = await withQuery(withQuery(TechnologyModel.find({ _id: { $in: ids } }), 'sort', { category: 1, name: 1 }), 'lean')
    return records.map(({ _id, name, slug, category, icon }) => ({ id: String(_id), name, slug, category, icon }))
  }

  return { getTechnology, listTechnologies, createTechnology, updateTechnology, deleteTechnology, publicTechnologies }
}
