import mongoose from 'mongoose'
import { z } from 'zod'

const httpUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}, 'Enter a valid HTTP or HTTPS URL.')
const requiredHttpUrl = httpUrl.refine((value) => value.length > 0, 'Enter a URL.')

const id = z.string().refine((value) => mongoose.isValidObjectId(value), 'Enter a valid identifier.')
const stringList = (maxItemLength = 300, maxItems = 100) => z.array(z.string().trim().min(1).max(maxItemLength)).max(maxItems)
const emptyToNullDate = z.preprocess((value) => value === '' ? null : value,
  z.union([z.null(), z.coerce.date()]))
const optionalString = (max) => z.string().trim().max(max).optional()
const status = z.preprocess((value) => typeof value === 'string' ? value.toLowerCase() : value,
  z.enum(['ongoing', 'completed', 'paused']))
const publicationStatus = z.enum(['draft', 'published'])

const imageMetadata = z.object({
  url: requiredHttpUrl,
  altText: z.string().trim().max(200).optional(),
  caption: z.string().trim().max(500).optional(),
  storageProvider: z.string().trim().max(80).optional(),
  publicId: z.string().trim().max(255).optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  format: z.string().trim().max(20).optional(),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
}).strict()

const profileImage = imageMetadata.extend({
  positionX: z.number().min(0).max(100).optional(),
  positionY: z.number().min(0).max(100).optional(),
  zoom: z.number().min(1).max(2).optional(),
})

const projectGalleryItem = imageMetadata.extend({
  id: z.string().max(120).optional(),
  preview: requiredHttpUrl.optional(),
  file: z.null().optional(),
})

const socialLink = z.object({
  platform: z.string().trim().min(1).max(50),
  label: z.string().trim().max(80).optional(),
  url: requiredHttpUrl,
}).strict()

const milestone = z.object({
  title: z.string().trim().min(1).max(160),
  description: optionalString(2000),
  date: z.coerce.date(),
  order: z.number().int().nonnegative().optional(),
}).strict()

const technologyInput = z.union([
  z.string().trim().max(1000),
  z.array(z.string().trim().min(1).max(120)).max(50),
])

const projectFields = {
  title: optionalString(180),
  slug: z.string().trim().toLowerCase().max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  shortDescription: optionalString(300),
  description: optionalString(30000),
  category: optionalString(80),
  status: status.optional(),
  publicationStatus: publicationStatus.optional(),
  coverImage: imageMetadata.nullable().optional(),
  gallery: z.array(projectGalleryItem).max(40).optional(),
  coverPreview: httpUrl.optional(),
  coverFile: z.null().optional(),
  technologies: technologyInput.optional(),
  liveUrl: httpUrl.optional(),
  repositoryUrl: httpUrl.optional(),
  startedAt: emptyToNullDate.optional(),
  completedAt: emptyToNullDate.optional(),
  startDate: emptyToNullDate.optional(),
  endDate: emptyToNullDate.optional(),
  timeline: z.array(milestone).max(100).optional(),
}

export const createProjectSchema = z.object({
  ...projectFields,
  title: z.string().trim().min(1).max(180),
  shortDescription: z.string().trim().min(1).max(300),
}).strict()

export const updateProjectSchema = z.object(projectFields).strict().refine((value) => Object.keys(value).length > 0,
  'Provide at least one project field to update.')

export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().toLowerCase().max(80).optional(),
  status: z.preprocess((value) => value === 'all' || value === undefined ? undefined : String(value).toLowerCase(),
    z.enum(['ongoing', 'completed', 'paused']).optional()),
  technology: z.string().trim().min(1).max(120).optional(),
  sort: z.preprocess((value) => value === 'updated' ? 'recentlyUpdated' : value,
    z.enum(['newest', 'oldest', 'recentlyUpdated']).default('newest')),
}).strict()

export const adminProjectListQuerySchema = projectListQuerySchema.extend({
  publicationStatus: z.enum(['all', 'draft', 'published']).default('all'),
})

export const technologyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().toLowerCase().max(80).optional(),
  sort: z.enum(['newest', 'oldest', 'recentlyUpdated']).default('newest'),
}).strict()

export const messageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(['all', 'new', 'unread', 'read', 'replied', 'archived', 'spam']).default('all'),
  sort: z.enum(['newest', 'oldest']).default('newest'),
}).strict()

export const messageStatusSchema = z.object({
  status: z.enum(['new', 'unread', 'read', 'replied', 'archived', 'spam']),
}).strict()

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(10000),
}).strict()

export const technologyBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().toLowerCase().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  category: optionalString(80),
  icon: optionalString(2048),
}).strict()

export const technologyPatchSchema = technologyBodySchema.partial().strict().refine((value) => Object.keys(value).length > 0,
  'Provide at least one technology field to update.')

const socialLinksInput = z.union([z.array(socialLink).max(50), z.string().trim().max(10000)])
const profileFields = {
  displayName: optionalString(120),
  headline: optionalString(240),
  introduction: optionalString(3000),
  biography: optionalString(20000),
  background: optionalString(10000),
  journey: optionalString(10000),
  skills: stringList(100).optional(),
  technologies: stringList(100).optional(),
  interests: stringList(100).optional(),
  currentActivities: stringList(160).optional(),
  achievements: stringList(300).optional(),
  profileImage: profileImage.nullable().optional(),
  socialLinks: socialLinksInput.optional(),
}
export const profileUpdateSchema = z.object(profileFields).strict().refine((value) => Object.keys(value).length > 0,
  'Provide at least one profile field to update.')

export const settingsUpdateSchema = z.object({
  siteTitle: optionalString(160),
  siteDescription: optionalString(500),
  seoDescription: optionalString(500),
  seoTitle: optionalString(160),
  contactEmail: z.string().trim().toLowerCase().email().max(254).or(z.literal('')).optional(),
  socialLinks: socialLinksInput.optional(),
  footerText: optionalString(2000),
  maintenanceMode: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one setting to update.')

export const idParamsSchema = z.object({ id }).strict()
export const slugParamsSchema = z.object({ slug: z.string().trim().min(1).max(200) }).strict()
