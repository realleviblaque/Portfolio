const DEFAULTS = {
  port: 5000,
  idleTimeoutMs: 30 * 60 * 1000,
  absoluteTimeoutMs: 12 * 60 * 60 * 1000,
}

function positiveInteger(value, name, fallback) {
  const parsed = Number(value ?? fallback)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`)
  }
  return parsed
}

function parseTrustProxy(value) {
  if (value === undefined || value === '') return 0
  const hops = Number(value)
  if (!Number.isSafeInteger(hops) || hops < 0) {
    throw new Error('TRUST_PROXY must be a non-negative integer hop count.')
  }
  return hops
}

function parseOrigin(value, { required }) {
  if (!value) {
    if (required) throw new Error('FRONTEND_ORIGIN must be configured in production.')
    return 'http://localhost:5173'
  }
  let origin
  try {
    const parsed = new URL(value)
    if (parsed.origin !== value.replace(/\/$/, '') || !['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error()
    }
    origin = parsed.origin
  } catch {
    throw new Error('FRONTEND_ORIGIN must be an HTTP or HTTPS origin without a path.')
  }
  return origin
}

export function loadConfig(env = process.env) {
  if (!env.NODE_ENV) throw new Error('NODE_ENV must be configured explicitly.')
  const nodeEnv = env.NODE_ENV
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production.')
  }

  const isProduction = nodeEnv === 'production'
  const port = positiveInteger(env.PORT, 'PORT', DEFAULTS.port)
  if (port > 65535) throw new Error('PORT must be between 1 and 65535.')

  const sessionSecret = env.SESSION_SECRET || ''
  if (Buffer.byteLength(sessionSecret, 'utf8') < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 bytes.')
  }

  const mongodbUri = env.MONGODB_URI || ''
  if (!mongodbUri) throw new Error('MONGODB_URI must be configured.')

  const trustProxy = parseTrustProxy(env.TRUST_PROXY)
  if (isProduction && trustProxy === 0) {
    throw new Error('TRUST_PROXY must be a positive hop count in production.')
  }

  if (isProduction && !env.SESSION_IDLE_TIMEOUT) {
    throw new Error('SESSION_IDLE_TIMEOUT must be configured in production.')
  }
  if (isProduction && !env.SESSION_ABSOLUTE_TIMEOUT) {
    throw new Error('SESSION_ABSOLUTE_TIMEOUT must be configured in production.')
  }

  const idleTimeoutMs = positiveInteger(env.SESSION_IDLE_TIMEOUT, 'SESSION_IDLE_TIMEOUT', DEFAULTS.idleTimeoutMs)
  const absoluteTimeoutMs = positiveInteger(env.SESSION_ABSOLUTE_TIMEOUT, 'SESSION_ABSOLUTE_TIMEOUT', DEFAULTS.absoluteTimeoutMs)

  return Object.freeze({
    nodeEnv,
    isProduction,
    port,
    mongodbUri,
    sessionSecret,
    idleTimeoutMs,
    absoluteTimeoutMs,
    trustProxy,
    frontendOrigin: parseOrigin(env.FRONTEND_ORIGIN, { required: isProduction }),
    cookieName: isProduction ? '__Host-levi.sid' : 'levi.sid',
    cookieOptions: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    },
  })
}

export { parseTrustProxy }
