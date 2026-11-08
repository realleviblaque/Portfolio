import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import Admin from './models/Admin.js'
import Project from './models/Project.js'
import Technology from './models/Technology.js'
import ContactMessage from './models/ContactMessage.js'
import Profile from './models/Profile.js'
import SiteSetting from './models/SiteSetting.js'
import { loadConfig } from './config/env.js'
import { createSessionMiddleware, createSessionStore } from './config/session.js'
import { createAuthRouter } from './routes/authRoutes.js'
import { createPublicRouter } from './routes/publicRoutes.js'
import { createAdminRouter } from './routes/adminRoutes.js'
import { createAdminAuthorization } from './middleware/adminAuthorization.js'
import { errorHandler, noStore, notFound } from './utils/httpErrors.js'
import { runMongoTransaction } from './utils/mongoTransactions.js'

export function createApp({
  config = loadConfig(),
  AdminModel = Admin,
  ProjectModel = Project,
  TechnologyModel = Technology,
  ContactMessageModel = ContactMessage,
  ProfileModel = Profile,
  SiteSettingModel = SiteSetting,
  sessionMiddleware,
  adminRouter,
  contactLimiter,
  loginLimiter,
  runTransaction = runMongoTransaction,
  now = Date.now,
} = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)

  app.use(helmet())
  app.use('/api/auth', noStore)
  app.use('/api/admin', noStore)
  app.use(express.json({ limit: '32kb' }))

  const sessionStore = sessionMiddleware ? null : createSessionStore(config)
  app.use(sessionMiddleware || createSessionMiddleware(config, sessionStore))
  app.locals.sessionStore = sessionStore

  app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }))
  app.use('/api/auth', createAuthRouter({ AdminModel, config, now, loginLimiter }))
  const models = { ProjectModel, TechnologyModel, ContactMessageModel, ProfileModel, SiteSettingModel }
  app.use('/api', createPublicRouter({ models, contactLimiter }))

  const { requireAdmin } = createAdminAuthorization({ AdminModel, config, now })
  const protectedRouter = adminRouter || createAdminRouter({ models, frontendOrigin: config.frontendOrigin, runTransaction })
  app.use('/api/admin', requireAdmin, protectedRouter)

  app.use(notFound)
  app.use(errorHandler)
  return app
}

export async function connectDatabase(config = loadConfig()) {
  await mongoose.connect(config.mongodbUri)
}
