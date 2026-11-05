import mongoose from 'mongoose'
import { imageMetadataSchema, projectMilestoneSchema } from './commonSchemas.js'

const httpUrlValidator = {
  validator(value) {
    if (!value) return true
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch {
      return false
    }
  },
  message: 'URL must use HTTP or HTTPS.',
}

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 200,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain lowercase letters, numbers, and hyphens.'],
  },
  shortDescription: { type: String, required: true, trim: true, maxlength: 300 },
  description: {
    type: String,
    trim: true,
    maxlength: 30000,
    default: '',
    required() { return this.publicationStatus === 'published' },
  },
  category: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 80,
    default: '',
    required() { return this.publicationStatus === 'published' },
  },
  status: { type: String, lowercase: true, enum: ['ongoing', 'completed', 'paused'], default: 'ongoing', required: true },
  publicationStatus: { type: String, enum: ['draft', 'published'], default: 'draft', required: true },
  coverImage: {
    type: imageMetadataSchema,
    default: null,
    required() { return this.publicationStatus === 'published' },
  },
  gallery: { type: [imageMetadataSchema], default: [] },
  technologies: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Technology' }],
    default: [],
  },
  liveUrl: { type: String, trim: true, maxlength: 2048, default: '', validate: httpUrlValidator },
  repositoryUrl: { type: String, trim: true, maxlength: 2048, default: '', validate: httpUrlValidator },
  startedAt: { type: Date, default: null },
  completedAt: {
    type: Date,
    default: null,
    validate: {
      validator(value) { return !value || !this.startedAt || value >= this.startedAt },
      message: 'Completion date must be on or after the start date.',
    },
  },
  timeline: { type: [projectMilestoneSchema], default: [] },
}, { timestamps: true })

projectSchema.index({ slug: 1 }, { unique: true, name: 'project_slug_unique' })
projectSchema.index({ publicationStatus: 1, status: 1, createdAt: -1 }, { name: 'project_publication_status_created' })
projectSchema.index({ technologies: 1 }, { name: 'project_technologies' })

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema)
export default Project
