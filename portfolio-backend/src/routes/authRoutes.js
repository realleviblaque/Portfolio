import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireCsrf } from '../middleware/csrf.js'
import { createAdminAuthorization } from '../middleware/adminAuthorization.js'
import { createAuthController } from '../controllers/authController.js'

export function createAuthRouter({ AdminModel, config, now = Date.now, loginLimiter }) {
  const router = Router()
  const controller = createAuthController({ AdminModel, config, now })
  const { requireAdmin } = createAdminAuthorization({ AdminModel, config, now })
  const csrf = requireCsrf(config.frontendOrigin)
  const limiter = loginLimiter || rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      success: false,
      error: { code: 'LOGIN_RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.' },
    }),
  })

  router.get('/csrf', controller.csrf)
  router.post('/login', limiter, csrf, controller.login)
  router.get('/me', requireAdmin, controller.me)
  router.post('/logout', csrf, requireAdmin, controller.logout)

  return router
}
