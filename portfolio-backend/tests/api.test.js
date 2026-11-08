import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import express from 'express'
import session from 'express-session'
import request from 'supertest'
import argon2 from 'argon2'
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config/env.js'
import { runMongoTransaction } from '../src/utils/mongoTransactions.js'
import { HttpError } from '../src/utils/httpErrors.js'

const origin = 'http://localhost:5173'
const ADMIN_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const PROJECT_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb'
const TECH_ID = 'cccccccccccccccccccccccc'
let password
let passwordHash

function idOf(value) { return value == null ? value : String(value._id ?? value) }

function matchesValue(value, expected) {
  if (expected instanceof RegExp) return expected.test(String(value ?? ''))
  if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
    if ('$in' in expected) {
      const candidates = Array.isArray(value) ? value.map(idOf) : [idOf(value)]
      return expected.$in.some((item) => candidates.some((candidate) => item instanceof RegExp
        ? item.test(String(candidate))
        : idOf(item) === candidate))
    }
    if ('$ne' in expected) return idOf(value) !== idOf(expected.$ne)
  }
  if (Array.isArray(value)) return value.some((item) => idOf(item) === idOf(expected))
  return idOf(value) === idOf(expected)
}

function matches(record, filter = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some((part) => matches(record, part))
    return matchesValue(record[key], expected)
  })
}

function makeQuery(run, populateRecords) {
  const settings = { sort: null, skip: 0, limit: Infinity, populate: null }
  const query = {
    sort(value) { settings.sort = value; return query },
    skip(value) { settings.skip = value; return query },
    limit(value) { settings.limit = value; return query },
    select() { return query },
    lean() { return query },
    populate(value) { settings.populate = value; return query },
    then(resolve, reject) {
      return Promise.resolve().then(async () => {
        let result = await run()
        const list = Array.isArray(result) ? result : result ? [result] : []
        if (settings.sort) {
          const [[field, direction]] = Object.entries(settings.sort)
          list.sort((left, right) => {
            const a = left[field] instanceof Date ? left[field].getTime() : left[field]
            const b = right[field] instanceof Date ? right[field].getTime() : right[field]
            return (a < b ? -1 : a > b ? 1 : 0) * direction
          })
        }
        if (Array.isArray(result)) result = list.slice(settings.skip, settings.skip + settings.limit)
        if (settings.populate && populateRecords && result) {
          const populateOne = (record) => ({ ...record, technologies: (record.technologies || []).map((id) => populateRecords.find((item) => idOf(item._id) === idOf(id))).filter(Boolean) })
          result = Array.isArray(result) ? result.map(populateOne) : populateOne(result)
        }
        return result
      }).then(resolve, reject)
    },
  }
  return query
}

function makeModel(initial = [], { populateRecords } = {}) {
  const records = initial.map((item) => ({ ...item }))
  let nextId = 1
  return {
    records,
    find(filter = {}) { return makeQuery(() => records.filter((item) => matches(item, filter)), populateRecords) },
    findOne(filter = {}) { return makeQuery(() => records.find((item) => matches(item, filter)) || null, populateRecords) },
    findById(id) { return makeQuery(() => records.find((item) => idOf(item._id) === idOf(id)) || null, populateRecords) },
    countDocuments(filter = {}) { return Promise.resolve(records.filter((item) => matches(item, filter)).length) },
    exists(filter = {}) { return Promise.resolve(records.find((item) => matches(item, filter))?._id ? { _id: records.find((item) => matches(item, filter))._id } : null) },
    distinct(field, filter = {}) { return Promise.resolve([...new Set(records.filter((item) => matches(item, filter)).flatMap((item) => item[field] || []).map(idOf))]) },
    async create(data) {
      const createOne = (values) => {
        const item = { _id: `${String(nextId++).padStart(24, '0')}`, createdAt: new Date(), updatedAt: new Date(), ...values }
        records.push(item)
        return item
      }
      return Array.isArray(data) ? data.map(createOne) : createOne(data)
    },
    async findOneAndUpdate(filter, update) {
      const item = records.find((record) => matches(record, filter))
      if (!item) return null
      Object.assign(item, update.$set || {})
      for (const [key, value] of Object.entries(update.$inc || {})) item[key] = (item[key] || 0) + value
      return item
    },
    async findByIdAndUpdate(id, update) {
      const item = records.find((record) => idOf(record._id) === idOf(id))
      if (!item) return null
      Object.assign(item, update.$set || {})
      item.updatedAt = new Date()
      return item
    },
    async findByIdAndDelete(id) {
      const index = records.findIndex((record) => idOf(record._id) === idOf(id))
      return index < 0 ? null : records.splice(index, 1)[0]
    },
  }
}

function makeHarness({ projects = [], technologies = [], messages = [], profiles = [], settings = [], contactLimiter, runTransaction } = {}) {
  const TechnologyModel = makeModel(technologies)
  const ProjectModel = makeModel(projects, { populateRecords: TechnologyModel.records })
  const ContactMessageModel = makeModel(messages)
  const ProfileModel = makeModel(profiles)
  const SiteSettingModel = makeModel(settings)
  const admin = { _id: ADMIN_ID, name: 'Levi Blaque', email: 'levi@example.test', role: 'superadmin', isActive: true, passwordHash }
  const AdminModel = {
    findOne: ({ email }) => makeQuery(() => email === admin.email ? admin : null),
    findById: (id) => makeQuery(() => idOf(id) === ADMIN_ID && admin.isActive ? admin : null),
    updateOne: async () => ({ acknowledged: true }),
  }
  const config = loadConfig({
    NODE_ENV: 'test', PORT: '5000', MONGODB_URI: 'mongodb://127.0.0.1:27017/not-used',
    SESSION_SECRET: randomBytes(48).toString('base64'), SESSION_IDLE_TIMEOUT: '60000',
    SESSION_ABSOLUTE_TIMEOUT: '300000', TRUST_PROXY: '0', FRONTEND_ORIGIN: origin,
  })
  const store = new session.MemoryStore()
  const app = createApp({
    config,
    AdminModel,
    ProjectModel,
    TechnologyModel,
    ContactMessageModel,
    ProfileModel,
    SiteSettingModel,
    sessionMiddleware: session({ name: 'test.sid', secret: config.sessionSecret, store, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', path: '/', maxAge: config.idleTimeoutMs } }),
    contactLimiter,
    runTransaction: runTransaction || (async (operation) => operation(null)),
  })
  return { app, ProjectModel, TechnologyModel, ContactMessageModel, ProfileModel, SiteSettingModel }
}

async function login(agent) {
  const csrf = await agent.get('/api/auth/csrf').set('Origin', origin).expect(200)
  const response = await agent.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', csrf.body.csrfToken)
    .send({ email: 'levi@example.test', password }).expect(200)
  return response.body.csrfToken
}

function withCsrf(agent, token, method, path) {
  return agent[method](path).set('Origin', origin).set('X-CSRF-Token', token)
}

before(async () => {
  password = `api-test-${randomBytes(24).toString('hex')}`
  passwordHash = await argon2.hash(password, { type: argon2.argon2id })
})

describe('public API', () => {
  it('registers public endpoints at the canonical root paths and does not retain the old namespace', async () => {
    const { app } = makeHarness()
    await request(app).get('/api/profile').expect(200)
    await request(app).get('/api/settings/public').expect(200)
    await request(app).get('/api/technologies').expect(200)
    await request(app).get('/api/public/projects').expect(404)
    await request(app).get('/api/admin/projects').expect(401)
    await request(app).get('/api/auth/me').expect(401)
  })

  it('lists only published projects with database-side filters, pagination, and safe technology data', async () => {
    const { app } = makeHarness({
      technologies: [{ _id: TECH_ID, name: 'React', slug: 'react', category: 'frontend', icon: 'react' }],
      projects: [
        { _id: PROJECT_ID, title: 'Portfolio', slug: 'portfolio', shortDescription: 'A portfolio', description: 'React work', category: 'web', status: 'ongoing', publicationStatus: 'published', technologies: [TECH_ID], coverImage: { url: 'https://images.example.test/cover.webp', altText: 'Cover', storageProvider: 'private-provider', publicId: 'private-asset-id' }, createdAt: new Date('2025-01-01') },
        { _id: 'dddddddddddddddddddddddd', title: 'Secret Draft', slug: 'secret-draft', shortDescription: 'Hidden', description: '', category: '', status: 'paused', publicationStatus: 'draft', technologies: [] },
        { _id: 'eeeeeeeeeeeeeeeeeeeeeeee', title: 'Older public project', slug: 'older-public', shortDescription: 'Another item', description: 'Details', category: 'design', status: 'completed', publicationStatus: 'published', technologies: [], createdAt: new Date('2024-01-01') },
      ],
    })
    const response = await request(app).get('/api/projects?search=react&category=web&status=ONGOING&page=1&limit=1').expect(200)
    assert.equal(response.body.success, true)
    assert.equal(response.body.data.length, 1)
    assert.equal(response.body.data[0].title, 'Portfolio')
    assert.equal(response.body.data[0].technologies[0].name, 'React')
    assert.equal(response.body.data[0].coverImage.storageProvider, undefined)
    assert.equal(response.body.data[0].coverImage.publicId, undefined)
    assert.equal(response.body.pagination.total, 1)
    const nextPage = await request(app).get('/api/projects?page=2&limit=1&sort=oldest').expect(200)
    assert.equal(nextPage.body.data.length, 1)
    assert.equal(nextPage.body.data[0].slug, 'portfolio')
    const byTechnology = await request(app).get('/api/projects?technology=react').expect(200)
    assert.equal(byTechnology.body.pagination.total, 1)
    assert.equal((await request(app).get('/api/projects?publicationStatus=draft')).status, 400)
    assert.equal((await request(app).get('/api/projects?limit=1000')).status, 400)
    assert.equal((await request(app).get('/api/projects?page=10001')).status, 400)
    assert.equal((await request(app).get('/api/projects?$where=this.status')).status, 400)
  })

  it('returns public published details and treats drafts as unavailable', async () => {
    const { app } = makeHarness({ projects: [
      { _id: PROJECT_ID, title: 'Released', slug: 'released', shortDescription: 'Summary', description: 'Full text', category: 'web', status: 'completed', publicationStatus: 'published', technologies: [], gallery: [], timeline: [] },
      { _id: 'dddddddddddddddddddddddd', title: 'Private', slug: 'private', publicationStatus: 'draft', technologies: [] },
    ] })
    const result = await request(app).get('/api/projects/released').expect(200)
    assert.equal(result.body.data.title, 'Released')
    assert.equal(result.body.data.passwordHash, undefined)
    assert.equal((await request(app).get('/api/projects/private')).status, 404)
    assert.equal((await request(app).get('/api/projects/not-found')).status, 404)
    assert.equal((await request(app).get('/api/projects/not-valid/slug')).status, 404)
  })

  it('returns profile and site settings without administrative fields and supports empty state', async () => {
    const empty = makeHarness()
    assert.equal((await request(empty.app).get('/api/profile').expect(200)).body.data, null)
    assert.equal((await request(empty.app).get('/api/settings/public').expect(200)).body.data, null)
    const { app } = makeHarness({
      profiles: [{ _id: 'eeeeeeeeeeeeeeeeeeeeeeee', displayName: 'Levi Blaque', introduction: 'Intro', profileImage: { url: 'https://images.example.test/profile.webp', storageProvider: 'private-provider', publicId: 'private-profile-id', positionX: 50, positionY: 12, zoom: 1 }, isActive: true, achievements: [], technologies: [] }],
      settings: [{ _id: 'ffffffffffffffffffffffff', siteTitle: 'Portfolio', siteDescription: 'Description', contactEmail: 'contact@example.test', maintenanceMode: true, footerText: 'Footer', isPrimary: true, socialLinks: [] }],
    })
    const profile = (await request(app).get('/api/profile')).body.data
    assert.equal(profile.displayName, 'Levi Blaque')
    assert.equal(profile.isActive, undefined)
    assert.equal(profile.profileImage.storageProvider, undefined)
    assert.equal(profile.profileImage.positionY, 12)
    const settingsResponse = (await request(app).get('/api/settings/public')).body.data
    assert.equal(settingsResponse.seoDescription, 'Description')
    assert.equal(settingsResponse.maintenanceMode, undefined)
    assert.equal(settingsResponse.contactEmail, 'contact@example.test')
  })

  it('lists only technologies referenced by published projects', async () => {
    const { app } = makeHarness({
      technologies: [
        { _id: TECH_ID, name: 'React', slug: 'react', category: 'frontend' },
        { _id: 'eeeeeeeeeeeeeeeeeeeeeeee', name: 'Private Tool', slug: 'private-tool', category: 'other' },
      ],
      projects: [
        { _id: PROJECT_ID, publicationStatus: 'published', technologies: [TECH_ID] },
        { _id: 'dddddddddddddddddddddddd', publicationStatus: 'draft', technologies: ['eeeeeeeeeeeeeeeeeeeeeeee'] },
      ],
    })
    const response = await request(app).get('/api/technologies').expect(200)
    assert.deepEqual(response.body.data.map((item) => item.name), ['React'])
  })

  it('validates and persists public contact submissions without allowing status fields', async () => {
    const { app, ContactMessageModel } = makeHarness()
    await request(app).post('/api/contact').send({ name: '  Ada  ', email: ' ADA@EXAMPLE.TEST ', subject: ' Hello ', message: ' Message ' }).expect(201)
    assert.equal(ContactMessageModel.records[0].name, 'Ada')
    assert.equal(ContactMessageModel.records[0].email, 'ada@example.test')
    assert.equal(ContactMessageModel.records[0].status, 'new')
    assert.equal(ContactMessageModel.records[0].emailStatus, 'pending')
    assert.equal((await request(app).post('/api/contact').send({ name: 'Ada', email: 'bad', subject: 'Hi', message: 'X' })).status, 400)
    assert.equal((await request(app).post('/api/contact').send({ name: 'Ada', email: 'ada@example.test', subject: 'Hi', message: 'X', status: 'read' })).status, 400)
    assert.equal((await request(app).get('/api/public/messages')).status, 404)
  })

  it('applies a dedicated injectable contact rate limiter', async () => {
    const { app } = makeHarness({ contactLimiter: (_req, res) => res.status(429).json({ error: { code: 'CONTACT_RATE_LIMITED' } }) })
    const response = await request(app).post('/api/contact').send({ name: 'Ada', email: 'ada@example.test', subject: 'Hi', message: 'Hello' }).expect(429)
    assert.equal(response.body.error.code, 'CONTACT_RATE_LIMITED')
  })

  it('enforces the configured contact submission limit', async () => {
    const { app, ContactMessageModel } = makeHarness()
    const submission = { name: 'Ada', email: 'ada@example.test', subject: 'Hi', message: 'Hello' }
    for (let index = 0; index < 5; index += 1) await request(app).post('/api/contact').send(submission).expect(201)
    await request(app).post('/api/contact').send(submission).expect(429)
    assert.equal(ContactMessageModel.records.length, 5)
  })
})

describe('MongoDB transaction requirements', () => {
  it('returns a clear operational error when MongoDB rejects transactions', async () => {
    const connection = {
      async startSession() {
        return {
          async withTransaction() {
            const error = new Error('Transaction numbers are only allowed on a replica set member or mongos')
            error.code = 20
            throw error
          },
          async endSession() {},
        }
      },
    }
    await assert.rejects(runMongoTransaction(async () => {}, connection), (error) => {
      assert.ok(error instanceof HttpError)
      assert.equal(error.status, 503)
      assert.equal(error.code, 'MONGODB_TRANSACTIONS_REQUIRED')
      return true
    })
  })

  it('surfaces unsupported transaction deployment as an actionable 503 response', async () => {
    const { app } = makeHarness({
      technologies: [{ _id: TECH_ID, name: 'React', normalizedName: 'react', slug: 'react' }],
      runTransaction: async () => { throw new HttpError(503, 'MONGODB_TRANSACTIONS_REQUIRED', 'Configure MongoDB as a replica set.') },
    })
    const agent = request.agent(app)
    const csrf = await login(agent)
    const response = await withCsrf(agent, csrf, 'delete', `/api/admin/technologies/${TECH_ID}`).expect(503)
    assert.equal(response.body.error.code, 'MONGODB_TRANSACTIONS_REQUIRED')
    assert.match(response.body.error.message, /replica set/)
  })
})

describe('admin API', () => {
  it('rejects unauthenticated access and requires CSRF on state changes', async () => {
    const { app } = makeHarness()
    await request(app).get('/api/admin/projects').expect(401)
    const agent = request.agent(app)
    const csrf = await login(agent)
    const denied = await agent.post('/api/admin/projects').send({ title: 'A', shortDescription: 'B' }).expect(403)
    assert.match(denied.headers['cache-control'], /no-store/)
    await withCsrf(agent, csrf, 'post', '/api/admin/projects').send({ title: 'Draft', shortDescription: 'Summary' }).expect(201)
  })

  it('creates projects with generated slugs and maps frontend date/status/technology values', async () => {
    const { app } = makeHarness({ technologies: [{ _id: TECH_ID, name: 'React', slug: 'react' }] })
    const agent = request.agent(app)
    const csrf = await login(agent)
    const response = await withCsrf(agent, csrf, 'post', '/api/admin/projects').send({
      title: 'My New Project', shortDescription: 'An item', status: 'Ongoing', publicationStatus: 'draft',
      startDate: '2025-01-02', technologies: 'React', category: 'Web',
    }).expect(201)
    assert.equal(response.body.data.slug, 'my-new-project')
    assert.equal(response.body.data.status, 'Ongoing')
    assert.equal(response.body.data.startDate, '2025-01-02')
    assert.equal(response.body.data.technologies, 'React')
  })

  it('filters admin project records and paginates without exposing unrequested records', async () => {
    const { app } = makeHarness({ projects: [
      { _id: PROJECT_ID, title: 'Published React', slug: 'published-react', shortDescription: 'Frontend', category: 'web', status: 'ongoing', publicationStatus: 'published', technologies: [], createdAt: new Date('2025-01-01') },
      { _id: 'dddddddddddddddddddddddd', title: 'Draft React', slug: 'draft-react', shortDescription: 'Draft', category: 'web', status: 'paused', publicationStatus: 'draft', technologies: [], createdAt: new Date('2025-02-01') },
      { _id: 'eeeeeeeeeeeeeeeeeeeeeeee', title: 'Other', slug: 'other', shortDescription: 'Other', category: 'design', status: 'completed', publicationStatus: 'published', technologies: [], createdAt: new Date('2025-03-01') },
    ] })
    const agent = request.agent(app)
    await login(agent)
    const response = await agent.get('/api/admin/projects?publicationStatus=draft&status=PAUSED&search=draft&page=1&limit=1').expect(200)
    assert.equal(response.body.pagination.total, 1)
    assert.equal(response.body.data[0].slug, 'draft-react')
  })

  it('returns a conflict for explicit duplicate slugs and allocates a unique generated slug', async () => {
    const { app } = makeHarness({ projects: [{ _id: PROJECT_ID, title: 'Existing', slug: 'same-slug', shortDescription: 'Summary', publicationStatus: 'draft', status: 'ongoing', technologies: [] }] })
    const agent = request.agent(app)
    const csrf = await login(agent)
    const duplicate = await withCsrf(agent, csrf, 'post', '/api/admin/projects').send({ title: 'Another', slug: 'same-slug', shortDescription: 'Summary' }).expect(409)
    assert.equal(duplicate.body.error.code, 'DUPLICATE_SLUG')
    const generated = await withCsrf(agent, csrf, 'post', '/api/admin/projects').send({ title: 'Same Slug', shortDescription: 'Summary' }).expect(201)
    assert.equal(generated.body.data.slug, 'same-slug-2')
  })

  it('provides the authenticated dashboard overview counts and recent records', async () => {
    const { app } = makeHarness({
      projects: [
        { _id: PROJECT_ID, title: 'Live', slug: 'live', shortDescription: 'Summary', publicationStatus: 'published', status: 'ongoing', technologies: [], createdAt: new Date() },
        { _id: 'dddddddddddddddddddddddd', title: 'Draft', slug: 'draft', shortDescription: 'Summary', publicationStatus: 'draft', status: 'completed', technologies: [], createdAt: new Date() },
      ],
      messages: [{ _id: 'eeeeeeeeeeeeeeeeeeeeeeee', name: 'Ada', email: 'ada@example.test', subject: 'Hello', message: 'Hi', status: 'new', emailStatus: 'pending', createdAt: new Date() }],
    })
    const agent = request.agent(app)
    await login(agent)
    const response = await agent.get('/api/admin/overview').expect(200)
    assert.equal(response.body.data.totalProjects, 2)
    assert.equal(response.body.data.publishedProjects, 1)
    assert.equal(response.body.data.draftProjects, 1)
    assert.equal(response.body.data.unreadMessages, 1)
    assert.equal(response.body.data.recentMessages[0].status, 'unread')
  })

  it('rejects incomplete published projects, unknown technologies, and malformed identifiers', async () => {
    const { app } = makeHarness()
    const agent = request.agent(app)
    const csrf = await login(agent)
    const incomplete = await withCsrf(agent, csrf, 'post', '/api/admin/projects').send({ title: 'Public', shortDescription: 'Summary', publicationStatus: 'published' }).expect(400)
    assert.equal(incomplete.body.error.code, 'PUBLISHED_PROJECT_INCOMPLETE')
    const unknown = await withCsrf(agent, csrf, 'post', '/api/admin/projects').send({ title: 'Draft', shortDescription: 'Summary', technologies: 'Missing Tech' }).expect(400)
    assert.equal(unknown.body.error.code, 'UNKNOWN_TECHNOLOGY')
    const invalidReference = await withCsrf(agent, csrf, 'post', '/api/admin/projects').send({ title: 'Draft Two', shortDescription: 'Summary', technologies: ['aaaaaaaaaaaaaaaaaaaaaaaa'] }).expect(400)
    assert.equal(invalidReference.body.error.code, 'INVALID_TECHNOLOGY')
    await agent.get('/api/admin/projects/bad-id').expect(400)
  })

  it('patches only supplied project fields and supports deletion', async () => {
    const { app } = makeHarness({ projects: [{ _id: PROJECT_ID, title: 'Original', slug: 'original', shortDescription: 'Summary', description: '', category: '', status: 'ongoing', publicationStatus: 'draft', startedAt: null, completedAt: null, technologies: [], gallery: [] }] })
    const agent = request.agent(app)
    const csrf = await login(agent)
    const updated = await withCsrf(agent, csrf, 'patch', `/api/admin/projects/${PROJECT_ID}`).send({ title: 'Changed' }).expect(200)
    assert.equal(updated.body.data.title, 'Changed')
    assert.equal(updated.body.data.slug, 'original')
    const invalidDates = await withCsrf(agent, csrf, 'patch', `/api/admin/projects/${PROJECT_ID}`).send({ startDate: '2025-02-01', endDate: '2025-01-01' }).expect(400)
    assert.equal(invalidDates.body.error.code, 'INVALID_PROJECT_DATES')
    assert.equal((await withCsrf(agent, csrf, 'delete', `/api/admin/projects/${PROJECT_ID}`).expect(200)).body.data.deleted, true)
    await withCsrf(agent, csrf, 'delete', `/api/admin/projects/${PROJECT_ID}`).expect(404)
  })

  it('supports technology CRUD and blocks deletion while a project references a technology', async () => {
    const { app } = makeHarness({ projects: [{ _id: PROJECT_ID, technologies: [TECH_ID] }], technologies: [{ _id: TECH_ID, name: 'React', slug: 'react' }] })
    const agent = request.agent(app)
    const csrf = await login(agent)
    await agent.get('/api/admin/technologies').expect(200)
    await withCsrf(agent, csrf, 'post', '/api/admin/technologies').send({ name: 'react' }).expect(409)
    const created = await withCsrf(agent, csrf, 'post', '/api/admin/technologies').send({ name: 'Node JS', category: 'Backend' }).expect(201)
    assert.equal(created.body.data.slug, 'node-js')
    await withCsrf(agent, csrf, 'patch', `/api/admin/technologies/${TECH_ID}`).send({ category: 'Frontend' }).expect(200)
    const blocked = await withCsrf(agent, csrf, 'delete', `/api/admin/technologies/${TECH_ID}`).expect(409)
    assert.equal(blocked.body.error.code, 'TECHNOLOGY_IN_USE')
    await withCsrf(agent, csrf, 'delete', `/api/admin/technologies/${created.body.data.id}`).expect(200)
  })

  it('gets technology detail only for authenticated admins and rejects invalid or missing IDs', async () => {
    const { app } = makeHarness({ technologies: [{ _id: TECH_ID, name: 'React', slug: 'react', normalizedName: 'react', __v: 3, secret: 'internal' }] })
    await request(app).get(`/api/admin/technologies/${TECH_ID}`).expect(401)
    const agent = request.agent(app)
    await login(agent)
    const detail = await agent.get(`/api/admin/technologies/${TECH_ID}`).expect(200)
    assert.equal(detail.body.data.name, 'React')
    assert.equal(detail.body.data.normalizedName, undefined)
    assert.equal(detail.body.data.secret, undefined)
    assert.equal(detail.body.data.__v, undefined)
    await agent.get('/api/admin/technologies/not-an-id').expect(400)
    await agent.get('/api/admin/technologies/dddddddddddddddddddddddd').expect(404)
  })

  it('gets message detail only for authenticated admins and rejects invalid or missing IDs', async () => {
    const { app } = makeHarness({ messages: [{ _id: TECH_ID, name: 'Ada', email: 'ada@example.test', subject: 'Hello', message: 'Message', status: 'new', emailStatus: 'pending', readAt: null, createdAt: new Date(), __v: 9, internalSecret: 'internal' }] })
    await request(app).get(`/api/admin/messages/${TECH_ID}`).expect(401)
    const agent = request.agent(app)
    await login(agent)
    const detail = await agent.get(`/api/admin/messages/${TECH_ID}`).expect(200)
    assert.equal(detail.body.data.status, 'unread')
    assert.equal(detail.body.data.emailStatus, 'pending')
    assert.equal(detail.body.data.internalSecret, undefined)
    assert.equal(detail.body.data.__v, undefined)
    await agent.get('/api/admin/messages/not-an-id').expect(400)
    await agent.get('/api/admin/messages/dddddddddddddddddddddddd').expect(404)
  })

  it('lists messages, maps new/unread, sets readAt, and rejects email-status changes', async () => {
    const { app, ContactMessageModel } = makeHarness({ messages: [{ _id: PROJECT_ID, name: 'Ada', email: 'ada@example.test', subject: 'Hello', message: 'Message', status: 'new', emailStatus: 'pending', readAt: null, createdAt: new Date() }] })
    const agent = request.agent(app)
    const csrf = await login(agent)
    const list = await agent.get('/api/admin/messages?status=unread').expect(200)
    assert.equal(list.body.data[0].status, 'unread')
    await withCsrf(agent, csrf, 'patch', `/api/admin/messages/${PROJECT_ID}/status`).send({ status: 'read' }).expect(200)
    assert.equal(ContactMessageModel.records[0].status, 'read')
    assert.ok(ContactMessageModel.records[0].readAt)
    await withCsrf(agent, csrf, 'patch', `/api/admin/messages/${PROJECT_ID}/status`).send({ status: 'read', emailStatus: 'sent' }).expect(400)
    await withCsrf(agent, csrf, 'patch', `/api/admin/messages/${PROJECT_ID}/status`).send({ status: 'unknown' }).expect(400)
    await withCsrf(agent, csrf, 'delete', `/api/admin/messages/${PROJECT_ID}`).expect(200)
  })

  it('gets and updates the active profile and maps the known portfolio identity for first creation', async () => {
    const { app, ProfileModel } = makeHarness()
    const agent = request.agent(app)
    const csrf = await login(agent)
    assert.equal((await agent.get('/api/admin/profile').expect(200)).body.data, null)
    await withCsrf(agent, csrf, 'put', '/api/admin/profile').send({ introduction: 'Hello', skills: ['Design'] }).expect(200)
    assert.equal(ProfileModel.records[0].displayName, 'Levi Blaque')
    assert.equal(ProfileModel.records[0].introduction, 'Hello')
    await withCsrf(agent, csrf, 'put', '/api/admin/profile').send({ biography: 'Updated' }).expect(200)
    assert.equal(ProfileModel.records[0].introduction, 'Hello')
    assert.equal(ProfileModel.records[0].biography, 'Updated')
  })

  it('creates and updates primary settings with seoDescription mapping', async () => {
    const { app, SiteSettingModel } = makeHarness()
    const agent = request.agent(app)
    const csrf = await login(agent)
    const missingTitle = await withCsrf(agent, csrf, 'put', '/api/admin/settings').send({ seoTitle: 'SEO' }).expect(400)
    assert.equal(missingTitle.body.error.code, 'SITE_TITLE_REQUIRED')
    const created = await withCsrf(agent, csrf, 'put', '/api/admin/settings').send({ siteTitle: 'Portfolio', seoDescription: 'Description', maintenanceMode: true, socialLinks: 'GitHub: https://github.com/levi' }).expect(200)
    assert.equal(created.body.data.seoDescription, 'Description')
    assert.equal(SiteSettingModel.records[0].siteDescription, 'Description')
    assert.equal(SiteSettingModel.records[0].socialLinks[0].platform, 'GitHub')
    assert.equal((await request(app).get('/api/settings/public')).body.data.maintenanceMode, undefined)
    const updated = await withCsrf(agent, csrf, 'put', '/api/admin/settings').send({ footerText: 'Updated footer' }).expect(200)
    assert.equal(updated.body.data.footerText, 'Updated footer')
  })
})
