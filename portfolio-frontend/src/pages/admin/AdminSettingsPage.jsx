import { useState } from 'react'
import { AdminFeedback, AdminField, AdminPageHeading } from '../../components/admin/AdminComponents.jsx'
import { adminService } from '../../services/adminService.js'

const blankSettings = { siteTitle: '', contactEmail: '', socialLinks: '', seoTitle: '', seoDescription: '', footerText: '' }

export function AdminSettingsPage() {
  const [values, setValues] = useState(blankSettings)
  const [feedback, setFeedback] = useState('')

  function update(key, value) { setValues((current) => ({ ...current, [key]: value })) }

  async function saveSettings(event) {
    event.preventDefault()
    try {
      await adminService.saveSettings(values)
      setFeedback('Settings saved.')
    } catch (error) { setFeedback(error.message) }
  }

  return (
    <>
      <AdminPageHeading eyebrow="Configuration / 05" title="Website settings" description="Portfolio identity, contact destination, social links, search metadata, and footer content." />
      <AdminFeedback>{feedback}</AdminFeedback>
      <form className="admin-form" onSubmit={saveSettings}>
        <section className="admin-form-section"><div className="admin-form-section-heading"><span>01</span><div><h2>Portfolio identity</h2><p>Keep the public identity consistent across the site.</p></div></div><div className="admin-form-grid admin-form-grid--two">
          <AdminField label="Site title" name="setting-site-title" value={values.siteTitle} onChange={(event) => update('siteTitle', event.target.value)} />
          <AdminField label="Contact email" name="setting-contact-email" type="email" value={values.contactEmail} onChange={(event) => update('contactEmail', event.target.value)} />
          <AdminField as="textarea" label="Social links" name="setting-social-links" hint="Add one link per line." rows="4" value={values.socialLinks} onChange={(event) => update('socialLinks', event.target.value)} />
        </div></section>
        <section className="admin-form-section"><div className="admin-form-section-heading"><span>02</span><div><h2>Search metadata</h2><p>Optional information for search and link previews.</p></div></div><div className="admin-form-grid admin-form-grid--two">
          <AdminField label="SEO title" name="setting-seo-title" value={values.seoTitle} onChange={(event) => update('seoTitle', event.target.value)} />
          <AdminField as="textarea" label="SEO description" name="setting-seo-description" rows="3" value={values.seoDescription} onChange={(event) => update('seoDescription', event.target.value)} />
        </div></section>
        <section className="admin-form-section"><div className="admin-form-section-heading"><span>03</span><div><h2>Footer</h2><p>Optional footer text displayed on the public portfolio.</p></div></div><AdminField as="textarea" label="Footer text" name="setting-footer-text" rows="3" value={values.footerText} onChange={(event) => update('footerText', event.target.value)} /></section>
        <div className="admin-form-actions"><button className="admin-button admin-button--primary" type="submit">Save settings</button><p>Settings remain local to this screen until the backend is connected.</p></div>
      </form>
    </>
  )
}
