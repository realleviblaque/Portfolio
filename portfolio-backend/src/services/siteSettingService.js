import { HttpError } from '../utils/httpErrors.js'
import { toSocialLinks } from './socialLinkService.js'

function adminSettings(setting) {
  if (!setting) return null
  const value = setting.toObject ? setting.toObject() : { ...setting }
  const { __v, ...safe } = value
  safe.seoDescription = safe.siteDescription || ''
  delete safe.siteDescription
  safe.socialLinks = (safe.socialLinks || []).map((link) => `${link.label || link.platform}: ${link.url}`).join('\n')
  return safe
}

export function createSiteSettingService({ SiteSettingModel }) {
  async function getPrimary() {
    return adminSettings(await SiteSettingModel.findOne({ isPrimary: true }))
  }

  async function save(input) {
    const data = { ...input }
    if (Object.hasOwn(data, 'seoDescription')) {
      if (Object.hasOwn(data, 'siteDescription') && data.siteDescription !== data.seoDescription) {
        throw new HttpError(400, 'AMBIGUOUS_SEO_DESCRIPTION', 'Send either seoDescription or siteDescription, or send the same value for both.')
      }
      data.siteDescription = data.seoDescription
      delete data.seoDescription
    }
    if (Object.hasOwn(data, 'socialLinks')) data.socialLinks = toSocialLinks(data.socialLinks)
    const existing = await SiteSettingModel.findOne({ isPrimary: true })
    if (existing) {
      const updated = await SiteSettingModel.findByIdAndUpdate(existing._id, { $set: data }, { new: true, runValidators: true })
      return adminSettings(updated)
    }
    if (!data.siteTitle?.trim()) throw new HttpError(400, 'SITE_TITLE_REQUIRED', 'A site title is required to create the primary settings document.')
    try {
      return adminSettings(await SiteSettingModel.create({ ...data, isPrimary: true }))
    } catch (error) {
      if (error?.code !== 11000) throw error
      const primary = await SiteSettingModel.findOne({ isPrimary: true })
      if (!primary) throw error
      const updated = await SiteSettingModel.findByIdAndUpdate(primary._id, { $set: data }, { new: true, runValidators: true })
      return adminSettings(updated)
    }
  }

  async function getPublic() {
    const settings = await SiteSettingModel.findOne({ isPrimary: true })
    if (!settings) return null
    const value = settings.toObject ? settings.toObject() : settings
    return {
      siteTitle: value.siteTitle,
      contactEmail: value.contactEmail || '',
      seoTitle: value.seoTitle,
      seoDescription: value.siteDescription || '',
      footerText: value.footerText,
      socialLinks: value.socialLinks || [],
    }
  }

  return { getPrimary, save, getPublic }
}
