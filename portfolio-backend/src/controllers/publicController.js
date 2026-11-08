import { createContactService } from '../services/contactService.js'
import { createProjectService } from '../services/projectService.js'
import { createSiteSettingService } from '../services/siteSettingService.js'
import { createTechnologyService } from '../services/technologyService.js'
import { createProfileService } from '../services/profileService.js'
import { sendPaginated, sendSuccess } from '../utils/httpErrors.js'

export function createPublicController(models) {
  const projects = createProjectService({ ProjectModel: models.ProjectModel, TechnologyModel: models.TechnologyModel })
  const contact = createContactService({ ContactMessageModel: models.ContactMessageModel })
  const profile = createProfileService({ ProfileModel: models.ProfileModel })
  const settings = createSiteSettingService({ SiteSettingModel: models.SiteSettingModel })
  const technologies = createTechnologyService({ TechnologyModel: models.TechnologyModel, ProjectModel: models.ProjectModel })

  return {
    listProjects: async (req, res, next) => {
      try {
        const result = await projects.listProjects(req.validated.query, { publicOnly: true })
        sendPaginated(res, result.items, result)
      } catch (error) { next(error) }
    },
    getProject: async (req, res, next) => {
      try {
        const item = await projects.getBySlug(req.validated.params.slug)
        sendSuccess(res, item)
      } catch (error) { next(error) }
    },
    getProfile: async (_req, res, next) => {
      try { sendSuccess(res, await profile.getActive()) } catch (error) { next(error) }
    },
    getSettings: async (_req, res, next) => {
      try { sendSuccess(res, await settings.getPublic()) } catch (error) { next(error) }
    },
    getTechnologies: async (_req, res, next) => {
      try { sendSuccess(res, await technologies.publicTechnologies()) } catch (error) { next(error) }
    },
    submitContact: async (req, res, next) => {
      try { sendSuccess(res, await contact.submit(req.validated.body), 201) } catch (error) { next(error) }
    },
  }
}
