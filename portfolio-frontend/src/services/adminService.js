export class AdminServiceUnavailableError extends Error {
  constructor() {
    super('The admin service is not connected. No changes have been saved.')
    this.name = 'AdminServiceUnavailableError'
  }
}

function unavailable() {
  throw new AdminServiceUnavailableError()
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
  signIn: unavailable,
}
