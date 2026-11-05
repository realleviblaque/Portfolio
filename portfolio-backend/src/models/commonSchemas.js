import mongoose from 'mongoose'

const { Schema } = mongoose

export const imageMetadataSchema = new Schema({
  url: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2048,
    validate: {
      validator(value) {
        try {
          const parsed = new URL(value)
          return parsed.protocol === 'https:' || parsed.protocol === 'http:'
        } catch {
          return false
        }
      },
      message: 'Image URL must be a valid HTTP or HTTPS URL.',
    },
  },
  altText: { type: String, trim: true, maxlength: 200, default: '' },
  caption: { type: String, trim: true, maxlength: 500, default: '' },
  storageProvider: { type: String, trim: true, maxlength: 80, default: '' },
  publicId: { type: String, trim: true, maxlength: 255, default: '' },
  width: { type: Number, min: 1, default: null },
  height: { type: Number, min: 1, default: null },
  format: { type: String, trim: true, lowercase: true, maxlength: 20, default: '' },
  sizeBytes: { type: Number, min: 0, default: null },
}, { _id: false })

export const profileImageSchema = imageMetadataSchema.clone().add({
  positionX: { type: Number, min: 0, max: 100, default: 50 },
  positionY: { type: Number, min: 0, max: 100, default: 50 },
  zoom: { type: Number, min: 1, max: 2, default: 1 },
})

export const socialLinkSchema = new Schema({
  platform: { type: String, required: true, trim: true, lowercase: true, maxlength: 50 },
  label: { type: String, trim: true, maxlength: 80, default: '' },
  url: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2048,
    validate: {
      validator(value) {
        try {
          const parsed = new URL(value)
          return parsed.protocol === 'https:' || parsed.protocol === 'http:'
        } catch {
          return false
        }
      },
      message: 'Social link URL must be a valid HTTP or HTTPS URL.',
    },
  },
}, { _id: false })

export const projectMilestoneSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  date: { type: Date, required: true },
  order: { type: Number, min: 0, default: 0 },
}, { _id: false })
