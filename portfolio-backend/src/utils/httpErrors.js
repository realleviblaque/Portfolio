export class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function sendError(res, status, code, message) {
  return res.status(status).json({ success: false, error: { code, message } })
}

export function sendValidationError(res, error) {
  const details = error.issues?.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  })) || []
  return res.status(400).json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'The request contains invalid information.', details },
  })
}

export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data })
}

export function sendPaginated(res, data, { page, limit, total }) {
  const totalPages = Math.ceil(total / limit)
  return res.json({
    success: true,
    data,
    pagination: {
      page, limit, total, totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && total > 0,
    },
  })
}

export function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store, max-age=0')
  res.set('Pragma', 'no-cache')
  next()
}

export function notFound(_req, res) {
  sendError(res, 404, 'NOT_FOUND', 'The requested API resource was not found.')
}

export function errorHandler(error, _req, res, _next) {
  if (error?.code === 'MONGODB_TRANSACTIONS_REQUIRED' && error.status === 503) {
    sendError(res, 503, error.code, error.message)
    return
  }
  if (error?.name === 'ValidationError') {
    const details = Object.values(error.errors || {}).map((item) => ({ path: item.path, message: item.message }))
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'The request contains invalid information.', details } })
    return
  }
  if (error?.name === 'CastError') {
    sendError(res, 400, 'INVALID_ID', 'A supplied identifier is invalid.')
    return
  }
  if (error?.code === 11000) {
    sendError(res, 409, 'DUPLICATE_RESOURCE', 'A record with the same unique value already exists.')
    return
  }
  const status = Number.isInteger(error.status) ? error.status : 500
  if (status >= 500) {
    sendError(res, 500, 'INTERNAL_ERROR', 'The request could not be completed.')
    return
  }
  sendError(res, status, error.code || 'REQUEST_ERROR', status >= 500 ? 'The request could not be completed.' : error.message || 'The request could not be completed.')
}
