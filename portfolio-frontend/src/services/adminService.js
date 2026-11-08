export class AdminServiceUnavailableError extends Error {
  constructor() {
    super('The admin service is not connected. No changes have been saved.')
    this.name = 'AdminServiceUnavailableError'
  }
}

function unavailable() {
  throw new AdminServiceUnavailableError()
}

async function getCsrfToken() {
  const payload = await request('/api/auth/csrf')
  return payload.csrfToken
}

// These methods are the frontend boundary for the backend contract Levi will provide.
// They intentionally do not call invented endpoints or store temporary records.
export const adminService = {
  getOverview: unavailable,
  listProjects: unavailable,
  getProject: unavailable,
  createProject: unavailable,
  updateProject: unavailable,
  deleteProject: unavailable,
  listMessages: unavailable,
  updateMessageStatus: unavailable,
  deleteMessage: unavailable,
  saveAboutProfile: unavailable,
  saveProfileImage: unavailable,
  getSettings: unavailable,
  saveSettings: unavailable,
  getCsrfToken,
  async signIn({ email, password }) {
    const csrfToken = await getCsrfToken()
    const payload = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ email, password }),
    })
    return payload.admin
  },
  async getCurrentAdmin() {
    const payload = await request('/api/auth/me')
    return payload.admin
  },
  async signOut() {
    const csrfToken = await getCsrfToken()
    return request('/api/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    })
  },
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...options.headers },
    })
  } catch {
    throw new Error('The authentication service could not be reached. Try again when the backend is available.')
  }

  let payload = {}
  try {
    payload = await response.json()
  } catch {
    // Keep the service error generic when the server response is not JSON.
  }

  if (!response.ok) {
    const error = new Error(payload.error?.message || 'The authentication request could not be completed.')
    error.status = response.status
    error.code = payload.error?.code
    throw error
  }
  return payload
}
