import { Router } from 'express'
import { requireCsrf } from '../middleware/csrf.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { createAdminController } from '../controllers/adminController.js'
import {
  adminProjectListQuerySchema,
  createProjectSchema,
  idParamsSchema,
  messageListQuerySchema,
  messageStatusSchema,
  profileUpdateSchema,
  settingsUpdateSchema,
  technologyBodySchema,
  technologyListQuerySchema,
  technologyPatchSchema,
  updateProjectSchema,
} from '../validators/apiValidators.js'

export function createAdminRouter({ models, frontendOrigin, runTransaction } = {}) {
  const router = Router()
  const controller = createAdminController(models, { runTransaction })
  const csrf = requireCsrf(frontendOrigin)

  router.get('/overview', controller.overview)
  router.get('/projects', validateRequest(adminProjectListQuerySchema, 'query'), controller.listProjects)
  router.get('/projects/:id', validateRequest(idParamsSchema, 'params'), controller.getProject)
  router.post('/projects', csrf, validateRequest(createProjectSchema), controller.createProject)
  router.patch('/projects/:id', csrf, validateRequest(idParamsSchema, 'params'), validateRequest(updateProjectSchema), controller.updateProject)
  router.delete('/projects/:id', csrf, validateRequest(idParamsSchema, 'params'), controller.deleteProject)

  router.get('/technologies', validateRequest(technologyListQuerySchema, 'query'), controller.listTechnologies)
  router.get('/technologies/:id', validateRequest(idParamsSchema, 'params'), controller.getTechnology)
  router.post('/technologies', csrf, validateRequest(technologyBodySchema), controller.createTechnology)
  router.patch('/technologies/:id', csrf, validateRequest(idParamsSchema, 'params'), validateRequest(technologyPatchSchema), controller.updateTechnology)
  router.delete('/technologies/:id', csrf, validateRequest(idParamsSchema, 'params'), controller.deleteTechnology)

  router.get('/messages', validateRequest(messageListQuerySchema, 'query'), controller.listMessages)
  router.get('/messages/:id', validateRequest(idParamsSchema, 'params'), controller.getMessage)
  router.patch('/messages/:id/status', csrf, validateRequest(idParamsSchema, 'params'), validateRequest(messageStatusSchema), controller.updateMessageStatus)
  router.delete('/messages/:id', csrf, validateRequest(idParamsSchema, 'params'), controller.deleteMessage)

  router.get('/profile', controller.getProfile)
  router.put('/profile', csrf, validateRequest(profileUpdateSchema), controller.saveProfile)
  router.get('/settings', controller.getSettings)
  router.put('/settings', csrf, validateRequest(settingsUpdateSchema), controller.saveSettings)

  return router
}
