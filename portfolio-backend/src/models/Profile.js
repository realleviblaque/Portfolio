import mongoose from 'mongoose'
import { profileImageSchema, socialLinkSchema } from './commonSchemas.js'

const profileSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  headline: { type: String, trim: true, maxlength: 240, default: '' },
  introduction: { type: String, trim: true, maxlength: 3000, default: '' },
  biography: { type: String, trim: true, maxlength: 20000, default: '' },
  background: { type: String, trim: true, maxlength: 10000, default: '' },
  journey: { type: String, trim: true, maxlength: 10000, default: '' },
  skills: { type: [{ type: String, trim: true, maxlength: 100 }], default: [] },
  technologies: { type: [{ type: String, trim: true, maxlength: 100 }], default: [] },
  interests: { type: [{ type: String, trim: true, maxlength: 100 }], default: [] },
  currentActivities: { type: [{ type: String, trim: true, maxlength: 160 }], default: [] },
  achievements: { type: [{ type: String, trim: true, maxlength: 300 }], default: [] },
  profileImage: { type: profileImageSchema, default: null },
  socialLinks: { type: [socialLinkSchema], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

profileSchema.index({ isActive: 1 }, {
  unique: true,
  partialFilterExpression: { isActive: true },
  name: 'one_active_profile',
})

const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema)
export default Profile
