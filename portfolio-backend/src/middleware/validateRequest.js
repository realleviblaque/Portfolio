import { sendValidationError } from '../utils/httpErrors.js'

export function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source])
    if (!parsed.success) return sendValidationError(res, parsed.error)
    req.validated ||= {}
    req.validated[source] = parsed.data
    next()
  }
}
