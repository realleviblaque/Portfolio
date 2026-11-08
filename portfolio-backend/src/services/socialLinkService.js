import { HttpError } from '../utils/httpErrors.js'

export function toSocialLinks(value) {
  if (value === undefined || Array.isArray(value)) return value
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length > 50) throw new HttpError(400, 'TOO_MANY_SOCIAL_LINKS', 'A maximum of 50 social links is supported.')
  return lines.map((line) => {
    const separator = line.indexOf(': ')
    const explicitLabel = separator > 0 && !/^https?:/i.test(line) ? line.slice(0, separator).trim() : ''
    const rawUrl = explicitLabel ? line.slice(separator + 2).trim() : line
    let parsed
    try { parsed = new URL(rawUrl) } catch { throw new HttpError(400, 'INVALID_SOCIAL_LINK', 'Each social link must be a valid HTTP or HTTPS URL.') }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(400, 'INVALID_SOCIAL_LINK', 'Each social link must use HTTP or HTTPS.')
    const host = parsed.hostname.replace(/^www\./, '')
    return { platform: explicitLabel || host.split('.')[0], label: explicitLabel || host, url: parsed.toString() }
  })
}
