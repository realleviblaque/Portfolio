import argon2 from 'argon2'
import { loginSchema } from '../validators/authValidators.js'
import { createCsrfToken } from '../middleware/csrf.js'
import { HttpError } from '../utils/httpErrors.js'

const INVALID_CREDENTIALS = 'Email or password is incorrect.'

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()))
  })
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()))
  })
}

function publicAdmin(admin) {
  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    role: admin.role,
  }
}

export function createAuthController({ AdminModel, config, now = Date.now }) {
  return {
    csrf: async (req, res, next) => {
      try {
        if (!req.session.csrfToken) req.session.csrfToken = createCsrfToken()
        await saveSession(req)
        res.json({ success: true, data: { csrfToken: req.session.csrfToken }, csrfToken: req.session.csrfToken })
      } catch (error) {
        next(error)
      }
    },

    login: async (req, res, next) => {
      const parsed = loginSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Enter a valid email address and password.' },
        })
      }

      try {
        const { email, password } = parsed.data
        const admin = await AdminModel.findOne({ email }).select('+passwordHash')
        let passwordMatches = false
        if (admin?.passwordHash) {
          try {
            passwordMatches = await argon2.verify(admin.passwordHash, password, { type: argon2.argon2id })
          } catch {
            passwordMatches = false
          }
        }

        if (!admin || !admin.isActive || !passwordMatches) {
          throw new HttpError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS)
        }

        await AdminModel.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date(now()) } })
        await regenerateSession(req)
        const currentTime = now()
        req.session.authenticatedAdmin = {
          adminId: String(admin._id),
          createdAt: currentTime,
          lastSeenAt: currentTime,
        }
        req.session.csrfToken = createCsrfToken()
        req.session.cookie.maxAge = config.idleTimeoutMs
        await saveSession(req)

        const data = { admin: publicAdmin(admin), csrfToken: req.session.csrfToken }
        res.json({ success: true, data, ...data })
      } catch (error) {
        if (error instanceof HttpError) {
          res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } })
          return
        }
        next(error)
      }
    },

    me: (req, res) => {
      const admin = publicAdmin(req.admin)
      res.json({ success: true, data: { admin }, admin })
    },

    logout: async (req, res, next) => {
      try {
        await new Promise((resolve, reject) => {
          req.session.destroy((error) => (error ? reject(error) : resolve()))
        })
        res.clearCookie(config.cookieName, config.cookieOptions)
        res.status(200).json({ success: true, data: { message: 'Signed out.' }, message: 'Signed out.' })
      } catch (error) {
        next(error)
      }
    },
  }
}
