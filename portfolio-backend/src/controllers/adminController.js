import { createContactService } from '../services/contactService.js'
import { createProjectService } from '../services/projectService.js'
import { createSiteSettingService } from '../services/siteSettingService.js'
import { createTechnologyService } from '../services/technologyService.js'
import { createProfileService } from '../services/profileService.js'
import { sendPaginated, sendSuccess } from '../utils/httpErrors.js'

function endpoint(action) {
  return async (req, res, next) => {
    try { await action(req, res) } catch (error) { next(error) }
  }
}

export function createAdminController(models, { runTransaction } = {}) {
  const projects = createProjectService({ ProjectModel: models.ProjectModel, TechnologyModel: models.TechnologyModel, runTransaction })
  const technologies = createTechnologyService({ TechnologyModel: models.TechnologyModel, ProjectModel: models.ProjectModel, runTransaction })
  const messages = createContactService({ ContactMessageModel: models.ContactMessageModel })
  const profile = createProfileService({ ProfileModel: models.ProfileModel })
  const settings = createSiteSettingService({ SiteSettingModel: models.SiteSettingModel })

  return {
    overview: endpoint(async (_req, res) => {
      const [projectSummary, unreadMessages, latestMessages] = await Promise.all([
        projects.overview(),
        models.ContactMessageModel.countDocuments({ status: 'new' }),
        messages.list({ page: 1, limit: 5, status: 'all', sort: 'newest' }),
      ])
      sendSuccess(res, { ...projectSummary, unreadMessages, recentMessages: latestMessages.items })
    }),
    listProjects: endpoint(async (req, res) => {
      const result = await projects.listProjects(req.validated.query)
      sendPaginated(res, result.items, result)
    }),
    getProject: endpoint(async (req, res) => sendSuccess(res, await projects.getProject(req.validated.params.id))),
    createProject: endpoint(async (req, res) => sendSuccess(res, await projects.createProject(req.validated.body), 201)),
    updateProject: endpoint(async (req, res) => sendSuccess(res, await projects.updateProject(req.validated.params.id, req.validated.body))),
    deleteProject: endpoint(async (req, res) => sendSuccess(res, await projects.deleteProject(req.validated.params.id))),

    listTechnologies: endpoint(async (req, res) => {
      const result = await technologies.listTechnologies(req.validated.query)
      sendPaginated(res, result.items, result)
    }),
    getTechnology: endpoint(async (req, res) => sendSuccess(res, await technologies.getTechnology(req.validated.params.id))),
    createTechnology: endpoint(async (req, res) => sendSuccess(res, await technologies.createTechnology(req.validated.body), 201)),
    updateTechnology: endpoint(async (req, res) => sendSuccess(res, await technologies.updateTechnology(req.validated.params.id, req.validated.body))),
    deleteTechnology: endpoint(async (req, res) => sendSuccess(res, await technologies.deleteTechnology(req.validated.params.id))),

    listMessages: endpoint(async (req, res) => {
      const result = await messages.list(req.validated.query)
      sendPaginated(res, result.items, result)
    }),
    getMessage: endpoint(async (req, res) => sendSuccess(res, await messages.get(req.validated.params.id))),
    updateMessageStatus: endpoint(async (req, res) => sendSuccess(res,
      await messages.setStatus(req.validated.params.id, req.validated.body.status))),
    deleteMessage: endpoint(async (req, res) => sendSuccess(res, await messages.remove(req.validated.params.id))),

    getProfile: endpoint(async (_req, res) => sendSuccess(res, await profile.getAdmin())),
    saveProfile: endpoint(async (req, res) => sendSuccess(res, await profile.save(req.validated.body))),
    getSettings: endpoint(async (_req, res) => sendSuccess(res, await settings.getPrimary())),
    saveSettings: endpoint(async (req, res) => sendSuccess(res, await settings.save(req.validated.body))),
  }
}
