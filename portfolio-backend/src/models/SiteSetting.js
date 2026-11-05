import mongoose from 'mongoose'
import { socialLinkSchema } from './commonSchemas.js'

const siteSettingSchema = new mongoose.Schema({
  siteTitle: { type: String, required: true, trim: true, maxlength: 160 },
  siteDescription: { type: String, trim: true, maxlength: 500, default: '', alias: 'seoDescription' },
  seoTitle: { type: String, trim: true, maxlength: 160, default: '' },
  contactEmail: {
    type: String,
    lowercase: true,
    trim: true,
    maxlength: 254,
    default: '',
    validate: {
      validator(value) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) },
      message: 'Enter a valid contact email address.',
    },
  },
  socialLinks: { type: [socialLinkSchema], default: [] },
  footerText: { type: String, trim: true, maxlength: 2000, default: '' },
  maintenanceMode: { type: Boolean, default: false },
  isPrimary: { type: Boolean, default: true },
}, { timestamps: true })

siteSettingSchema.index({ isPrimary: 1 }, {
  unique: true,
  partialFilterExpression: { isPrimary: true },
  name: 'one_primary_site_setting',
})

const SiteSetting = mongoose.models.SiteSetting || mongoose.model('SiteSetting', siteSettingSchema)
export default SiteSetting
