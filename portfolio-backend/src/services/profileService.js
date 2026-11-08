import { HttpError } from '../utils/httpErrors.js'
import { publicImage } from '../utils/query.js'
import { toSocialLinks } from './socialLinkService.js'

function profileObject(profile) {
  if (!profile) return null
  const result = profile.toObject ? profile.toObject() : { ...profile }
  delete result.__v
  return result
}

function publicProfile(profile) {
  const value = profileObject(profile)
  if (!value) return null
  const { displayName, headline, introduction, biography, background, journey, skills, technologies, interests,
    currentActivities, achievements, profileImage, socialLinks, createdAt, updatedAt } = value
  return { displayName, headline, introduction, biography, background, journey, skills, technologies,
    interests, currentActivities, achievements, profileImage: publicImage(profileImage, { crop: true }), socialLinks, createdAt, updatedAt }
}

export function createProfileService({ ProfileModel }) {
  async function getActive() {
    return publicProfile(await ProfileModel.findOne({ isActive: true }))
  }

  async function getAdmin() {
    return profileObject(await ProfileModel.findOne({ isActive: true }))
  }

  async function save(input) {
    const data = { ...input }
    if (Object.hasOwn(data, 'socialLinks')) data.socialLinks = toSocialLinks(data.socialLinks)
    const existing = await ProfileModel.findOne({ isActive: true })
    if (existing) {
      const updated = await ProfileModel.findByIdAndUpdate(existing._id, { $set: data }, { new: true, runValidators: true })
      return publicProfile(updated)
    }
    // The existing profile form omits displayName. The portfolio owner identity is already explicit in the project,
    // so only the missing schema field is mapped to that known identity; no biography/profile content is synthesized.
    if (!Object.hasOwn(data, 'displayName')) data.displayName = 'Levi Blaque'
    if (!data.displayName?.trim()) throw new HttpError(400, 'DISPLAY_NAME_REQUIRED', 'The profile display name cannot be empty.')
    try {
      return publicProfile(await ProfileModel.create({ ...data, isActive: true }))
    } catch (error) {
      if (error?.code !== 11000) throw error
      // The unique active-profile index serializes concurrent first saves. Retry as an update if another request won.
      const active = await ProfileModel.findOne({ isActive: true })
      if (!active) throw error
      const updated = await ProfileModel.findByIdAndUpdate(active._id, { $set: data }, { new: true, runValidators: true })
      return publicProfile(updated)
    }
  }

  return { getActive, getAdmin, save }
}
