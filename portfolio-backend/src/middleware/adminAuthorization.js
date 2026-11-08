import { getSessionCookieOptions } from '../config/session.js'
import { sendError } from '../utils/httpErrors.js'

function destroySession(req) {
  return new Promise((resolve) => {
    if (!req.session) return resolve()
    req.session.destroy(() => resolve())
  })
}

function safeAdmin(admin) {
  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    role: admin.role,
  }
}

export function createAdminAuthorization({ AdminModel, config, now = Date.now }) {
  async function loadAuthenticatedAdmin(req, res) {
    const identity = req.session?.authenticatedAdmin
    const createdAt = Number(identity?.createdAt)
    const lastSeenAt = Number(identity?.lastSeenAt)
    const currentTime = now()
    const invalid = !identity?.adminId || !Number.isFinite(createdAt) || !Number.isFinite(lastSeenAt)
    const expired = currentTime - createdAt >= config.absoluteTimeoutMs
      || currentTime - lastSeenAt >= config.idleTimeoutMs

    if (invalid || expired) {
      await destroySession(req)
      res.clearCookie(config.cookieName, getSessionCookieOptions(config))
      return null
    }

    const admin = await AdminModel.findById(identity.adminId).select('_id name email role isActive')
    if (!admin?.isActive || !['admin', 'superadmin'].includes(admin.role)) {
      await destroySession(req)
      res.clearCookie(config.cookieName, getSessionCookieOptions(config))
      return null
    }

    req.session.authenticatedAdmin.lastSeenAt = currentTime
    req.admin = admin
    return admin
  }

  async function requireAdmin(req, res, next) {
    try {
      const admin = await loadAuthenticatedAdmin(req, res)
      if (!admin) return sendError(res, 401, 'UNAUTHENTICATED', 'Sign in to continue.')
      next()
    } catch (error) {
      next(error)
    }
  }

  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.admin || !roles.includes(req.admin.role)) {
        return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action.')
      }
      next()
    }
  }

  return { loadAuthenticatedAdmin, requireAdmin, requireRole, safeAdmin }
}
