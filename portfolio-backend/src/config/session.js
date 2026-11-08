import session from 'express-session'
import MongoStore from 'connect-mongo'

export const SESSION_COOKIE = '__Host-levi.sid'
export const DEVELOPMENT_SESSION_COOKIE = 'levi.sid'

export function getSessionStoreOptions(config) {
  return {
    mongoUrl: config.mongodbUri,
    collectionName: 'sessions',
    ttl: Math.ceil(config.idleTimeoutMs / 1000),
    autoRemove: 'native',
  }
}

export function createSessionStore(config) {
  return MongoStore.create(getSessionStoreOptions(config))
}

export function createSessionOptions(config, store = createSessionStore(config)) {
  return {
    name: config.isProduction ? SESSION_COOKIE : DEVELOPMENT_SESSION_COOKIE,
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: config.idleTimeoutMs,
    },
  }
}

export function createSessionMiddleware(config, store) {
  return session(createSessionOptions(config, store))
}

export function getSessionCookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  }
}
