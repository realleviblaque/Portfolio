import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createPublicController } from '../controllers/publicController.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  contactSchema,
  projectListQuerySchema,
  slugParamsSchema,
} from '../validators/apiValidators.js'
import { noStore } from '../utils/httpErrors.js'

export function createPublicRouter({ models, contactLimiter } = {}) {
  const router = Router()
  const controller = createPublicController(models)
  const limiter = contactLimiter || rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      success: false,
      error: { code: 'CONTACT_RATE_LIMITED', message: 'Too many messages were submitted. Please try again later.' },
    }),
  })

  router.get('/projects', validateRequest(projectListQuerySchema, 'query'), controller.listProjects)
  router.get('/projects/:slug', validateRequest(slugParamsSchema, 'params'), controller.getProject)
  router.get('/profile', controller.getProfile)
  router.get('/settings/public', controller.getSettings)
  router.get('/technologies', controller.getTechnologies)
  router.post('/contact', noStore, limiter, validateRequest(contactSchema), controller.submitContact)

  return router
}
