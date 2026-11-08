import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import express from 'express'
import session from 'express-session'
import request from 'supertest'
import argon2 from 'argon2'
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config/env.js'
import { createSessionOptions, getSessionStoreOptions } from '../src/config/session.js'
import { createAdminAuthorization } from '../src/middleware/adminAuthorization.js'

const frontendOrigin = 'http://localhost:5173'
let password
let sessionSecret
let passwordHash

function makeConfig(overrides = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    PORT: '5000',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/portfolio-test',
    SESSION_SECRET: sessionSecret,
    SESSION_IDLE_TIMEOUT: '60000',
    SESSION_ABSOLUTE_TIMEOUT: '300000',
    TRUST_PROXY: '0',
    FRONTEND_ORIGIN: frontendOrigin,
    ...overrides,
  })
}

function makeAdminModel(admin) {
  return {
    findOne: ({ email }) => ({ select: async () => admin?.email === email ? admin : null }),
    findById: () => ({ select: async () => admin ? { ...admin } : null }),
    updateOne: async () => ({ acknowledged: true }),
  }
}

function createTestApp({ admin, clock, config = makeConfig(), loginLimiter } = {}) {
  const AdminModel = makeAdminModel(admin === undefined ? {
    _id: 'admin-1',
    name: 'Levi Blaque',
    email: 'levi@example.test',
    role: 'superadmin',
    isActive: true,
    passwordHash,
  } : admin)
  const sessionStore = new session.MemoryStore()
  const middleware = session({
    ...createSessionOptions(config, sessionStore),
  })
  const adminRouter = express.Router()
  const { requireRole } = createAdminAuthorization({ AdminModel, config, now: clock || Date.now })
  adminRouter.get('/summary', (req, res) => res.json({ adminId: String(req.admin._id) }))
  adminRouter.get('/superadmin', requireRole('superadmin'), (_req, res) => res.json({ ok: true }))
  return {
    app: createApp({ config, AdminModel, sessionMiddleware: middleware, adminRouter, loginLimiter, now: clock || Date.now }),
    sessionStore,
  }
}

async function getCsrf(agent, origin = frontendOrigin) {
  const response = await agent.get('/api/auth/csrf').set('Origin', origin).expect(200)
  return response.body.csrfToken
}

function signIn(agent, options = {}) {
  const csrfToken = options.csrfToken
  assert.ok(csrfToken, 'signIn requires a CSRF token')
  return agent.post('/api/auth/login')
    .set('Origin', options.origin || frontendOrigin)
    .set('X-CSRF-Token', csrfToken)
    .send(options.body || { email: ' LEVI@EXAMPLE.TEST ', password })
}

beforeEach(async () => {
  password = `test-${randomBytes(32).toString('hex')}`
  sessionSecret = randomBytes(48).toString('base64')
  passwordHash = await argon2.hash(password, { type: argon2.argon2id })
})

const wrongPassword = () => `${password}-incorrect`

describe('authentication endpoints', () => {
  it('logs in, normalizes email, regenerates the session, and returns safe admin data', async () => {
    const { app } = createTestApp()
    const agent = request.agent(app)
    const csrfToken = await getCsrf(agent)
    const csrfResponse = await agent.get('/api/auth/csrf').set('Origin', frontendOrigin).expect(200)
    const oldCookie = csrfResponse.headers['set-cookie'][0].split(';')[0]
    const response = await signIn(agent, { csrfToken }).expect(200)

    assert.deepEqual(response.body.admin, { id: 'admin-1', name: 'Levi Blaque', email: 'levi@example.test', role: 'superadmin' })
    assert.doesNotMatch(JSON.stringify(response.body), /passwordHash/)
    assert.ok(response.body.csrfToken)
    const setCookie = response.headers['set-cookie'][0]
    assert.match(setCookie, /HttpOnly/)
    assert.match(setCookie, /SameSite=Lax/)
    assert.match(setCookie, /Path=\//)
    assert.doesNotMatch(setCookie, /Domain=/)
    const newCookie = response.headers['set-cookie'][0].split(';')[0]
    assert.notEqual(newCookie, oldCookie)
  })

  it('uses a generic credential error for an incorrect password and unknown email', async () => {
    const { app } = createTestApp()
    const agent = request.agent(app)
    const csrfToken = await getCsrf(agent)
    const incorrect = await signIn(agent, { csrfToken, body: { email: 'levi@example.test', password: wrongPassword() } }).expect(401)
    assert.equal(incorrect.body.error.message, 'Email or password is incorrect.')

    const missingAdminApp = createTestApp({ admin: null }).app
    const unknownAgent = request.agent(missingAdminApp)
    const unknownCsrf = await getCsrf(unknownAgent)
    const unknown = await signIn(unknownAgent, { csrfToken: unknownCsrf }).expect(401)
    assert.equal(unknown.body.error.message, incorrect.body.error.message)
  })

  it('rejects inactive administrators without revealing account state', async () => {
    const { app } = createTestApp({ admin: {
      _id: 'admin-inactive', name: 'Inactive', email: 'inactive@example.test', role: 'admin', isActive: false, passwordHash,
    } })
    const agent = request.agent(app)
    const csrfToken = await getCsrf(agent)
    const response = await signIn(agent, { csrfToken, body: { email: 'inactive@example.test', password } }).expect(401)
    assert.equal(response.body.error.message, 'Email or password is incorrect.')
  })

  it('rejects missing and invalid credentials with validation errors', async () => {
    const { app } = createTestApp()
    const agent = request.agent(app)
    const csrfToken = await getCsrf(agent)
    await signIn(agent, { csrfToken, body: {} }).expect(400)
    await signIn(agent, { csrfToken, body: { email: 'not-an-email', password: '' } }).expect(400)
  })

  it('limits repeated login attempts', async () => {
    const { app } = createTestApp()
    const agent = request.agent(app)
    const csrfToken = await getCsrf(agent)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await signIn(agent, { csrfToken, body: { email: 'levi@example.test', password: wrongPassword() } }).expect(401)
    }
    const limited = await signIn(agent, { csrfToken, body: { email: 'levi@example.test', password: wrongPassword() } }).expect(429)
    assert.equal(limited.body.error.code, 'LOGIN_RATE_LIMITED')
  })

  it('requires CSRF tokens and rejects untrusted Origin headers', async () => {
    const { app } = createTestApp()
    const agent = request.agent(app)
    const csrfToken = await getCsrf(agent)
    await agent.post('/api/auth/login').set('Origin', frontendOrigin).send({ email: 'levi@example.test', password }).expect(403)
    await agent.post('/api/auth/login').set('Origin', frontendOrigin).set('X-CSRF-Token', 'wrong')
      .send({ email: 'levi@example.test', password }).expect(403)
    await agent.post('/api/auth/login').set('Origin', 'https://attacker.invalid').set('X-CSRF-Token', csrfToken)
      .send({ email: 'levi@example.test', password }).expect(403)
    await signIn(agent, { csrfToken }).expect(200)
  })

  it('provides the current administrator and keeps auth responses uncacheable', async () => {
    const { app } = createTestApp()
    const agent = request.agent(app)
    await agent.get('/api/auth/me').expect(401)
    const csrfToken = await getCsrf(agent)
    await signIn(agent, { csrfToken }).expect(200)
    const response = await agent.get('/api/auth/me').expect(200)
    assert.equal(response.body.admin.email, 'levi@example.test')
    assert.match(response.headers['cache-control'], /no-store/)
    assert.equal(response.headers.pragma, 'no-cache')
  })

  it('keeps malformed authentication requests uncacheable too', async () => {
    const { app } = createTestApp()
    const response = await request(app).post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400)
    assert.match(response.headers['cache-control'], /no-store/)
  })

  it('enforces idle and absolute timeouts and rejects inactive accounts', async () => {
    let currentTime = 100000
    const admin = { _id: 'admin-1', name: 'Levi', email: 'levi@example.test', role: 'admin', isActive: true, passwordHash }
    const idleConfig = makeConfig({ SESSION_IDLE_TIMEOUT: '5000', SESSION_ABSOLUTE_TIMEOUT: '30000' })
    const idleAgent = request.agent(createTestApp({ admin, clock: () => currentTime, config: idleConfig }).app)
    const idleCsrf = await getCsrf(idleAgent)
    await signIn(idleAgent, { csrfToken: idleCsrf }).expect(200)
    currentTime += 5001
    await idleAgent.get('/api/auth/me').expect(401)

    currentTime = 200000
    const absoluteConfig = makeConfig({ SESSION_IDLE_TIMEOUT: '30000', SESSION_ABSOLUTE_TIMEOUT: '5000' })
    const absoluteAgent = request.agent(createTestApp({ admin, clock: () => currentTime, config: absoluteConfig }).app)
    const absoluteCsrf = await getCsrf(absoluteAgent)
    await signIn(absoluteAgent, { csrfToken: absoluteCsrf }).expect(200)
    currentTime += 5001
    await absoluteAgent.get('/api/auth/me').expect(401)

    const inactiveAgent = request.agent(createTestApp({
      admin: { ...admin, isActive: false }, clock: () => currentTime,
    }).app)
    const inactiveCsrf = await getCsrf(inactiveAgent)
    await signIn(inactiveAgent, { csrfToken: inactiveCsrf }).expect(401)

    const account = { ...admin, isActive: true }
    const disabledAgent = request.agent(createTestApp({ admin: account, clock: () => currentTime }).app)
    const disabledCsrf = await getCsrf(disabledAgent)
    await signIn(disabledAgent, { csrfToken: disabledCsrf }).expect(200)
    account.isActive = false
    await disabledAgent.get('/api/auth/me').expect(401)
    await disabledAgent.get('/api/admin/summary').expect(401)
  })

  it('destroys the session on logout and protects future admin routes by role', async () => {
    const { app } = createTestApp()
    const agent = request.agent(app)
    await agent.get('/api/admin/summary').expect(401)
    const csrfToken = await getCsrf(agent)
    const login = await signIn(agent, { csrfToken }).expect(200)
    await agent.get('/api/admin/summary').expect(200)
    await agent.get('/api/admin/superadmin').expect(200)

    await agent.post('/api/auth/logout').set('Origin', frontendOrigin).set('X-CSRF-Token', login.body.csrfToken).expect(200)
    await agent.get('/api/auth/me').expect(401)
    await agent.get('/api/admin/summary').expect(401)
  })

  it('returns 403 when an authenticated admin lacks the required role', async () => {
    const { app } = createTestApp({ admin: {
      _id: 'admin-1', name: 'Levi', email: 'levi@example.test', role: 'admin', isActive: true, passwordHash,
    } })
    const agent = request.agent(app)
    const csrfToken = await getCsrf(agent)
    await signIn(agent, { csrfToken }).expect(200)
    await agent.get('/api/admin/superadmin').expect(403)
  })

  it('sets the production __Host cookie flags and rejects insecure production configuration', () => {
    const config = makeConfig({ NODE_ENV: 'production', TRUST_PROXY: '1', FRONTEND_ORIGIN: 'https://portfolio.example' })
    const options = createSessionOptions(config, new session.MemoryStore())
    assert.equal(options.name, '__Host-levi.sid')
    assert.deepEqual({ httpOnly: options.cookie.httpOnly, secure: options.cookie.secure, sameSite: options.cookie.sameSite, path: options.cookie.path },
      { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
    assert.equal(options.cookie.domain, undefined)
    assert.throws(() => makeConfig({ NODE_ENV: 'production', TRUST_PROXY: '0', FRONTEND_ORIGIN: 'https://portfolio.example' }), /TRUST_PROXY/)
    assert.throws(() => loadConfig({
      NODE_ENV: 'production', PORT: '5000', MONGODB_URI: 'mongodb://localhost/db',
      SESSION_SECRET: sessionSecret, TRUST_PROXY: '1',
      SESSION_IDLE_TIMEOUT: '1800000', SESSION_ABSOLUTE_TIMEOUT: '43200000',
    }), /FRONTEND_ORIGIN/)
  })

  it('keeps Mongo session TTL aligned with the idle cookie timeout', () => {
    const config = makeConfig({ SESSION_IDLE_TIMEOUT: '12345' })
    const options = createSessionOptions(config, new session.MemoryStore())
    assert.equal(options.cookie.maxAge, 12345)
    assert.equal(getSessionStoreOptions(config).ttl, 13)
  })

  it('exposes a minimal health response', async () => {
    const { app } = createTestApp()
    await request(app).get('/api/health').expect(200, { status: 'ok' })
  })
})
