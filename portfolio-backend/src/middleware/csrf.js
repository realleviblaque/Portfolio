import { randomBytes, timingSafeEqual } from 'node:crypto'
import { sendError } from '../utils/httpErrors.js'

export function createCsrfToken() {
  return randomBytes(32).toString('hex')
}

function hasAllowedOrigin(req, frontendOrigin) {
  const origin = req.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).origin === frontendOrigin
  } catch {
    return false
  }
}

export function requireCsrf(frontendOrigin) {
  return (req, res, next) => {
    if (!hasAllowedOrigin(req, frontendOrigin)) {
      return sendError(res, 403, 'INVALID_ORIGIN', 'This request origin is not allowed.')
    }

    const expected = req.session?.csrfToken
    const supplied = req.get('x-csrf-token')
    if (typeof expected !== 'string' || typeof supplied !== 'string') {
      return sendError(res, 403, 'CSRF_REQUIRED', 'A valid CSRF token is required.')
    }

    const expectedBytes = Buffer.from(expected, 'utf8')
    const suppliedBytes = Buffer.from(supplied, 'utf8')
    if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
      return sendError(res, 403, 'CSRF_INVALID', 'A valid CSRF token is required.')
    }

    next()
  }
}
