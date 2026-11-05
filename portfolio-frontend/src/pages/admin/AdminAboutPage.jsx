import { useState } from 'react'
import { aboutProfile } from '../../data/aboutProfile.js'
import { AdminFeedback, AdminField, AdminPageHeading } from '../../components/admin/AdminComponents.jsx'
import { adminService } from '../../services/adminService.js'
import { ProfileImageManager } from '../../components/admin/ProfileImageManager.jsx'

const profileFields = [
  { key: 'introduction', label: 'Introduction', hint: 'A short profile introduction.' },
  { key: 'biography', label: 'Biography', hint: 'The full biography.' },
  { key: 'background', label: 'Background and journey', hint: 'Professional background and journey.' },
  { key: 'skills', label: 'Technical skills', list: true },
  { key: 'technologies', label: 'Technologies', list: true },
  { key: 'interests', label: 'Interests', list: true },
  { key: 'currentActivities', label: 'Current activities', list: true },
  { key: 'achievements', label: 'Achievements', list: true },
]

function toFormValues(profile) {
  return Object.fromEntries(profileFields.map(({ key, list }) => [key, list ? (profile[key] ?? []).join('\n') : profile[key] ?? '']))
}

export function AdminAboutPage() {
  const [values, setValues] = useState(() => toFormValues(aboutProfile))
  const [feedback, setFeedback] = useState('')

  async function saveProfile(event) {
    event.preventDefault()
    const profile = Object.fromEntries(profileFields.map(({ key, list }) => [key, list ? values[key].split('\n').map((item) => item.trim()).filter(Boolean) : values[key].trim()]))
    try {
      await adminService.saveAboutProfile(profile)
      setFeedback('Profile saved.')
    } catch (error) { setFeedback(error.message) }
  }

  return (
    <>
      <AdminPageHeading eyebrow="Identity / 04" title="About profile" description="Edit the structured profile content shown on the public About page. Fields begin empty until details are supplied." />
      <ProfileImageManager />
      <AdminFeedback>{feedback}</AdminFeedback>
      <form className="admin-form" onSubmit={saveProfile}>
        {profileFields.map(({ key, label, hint }) => <section className="admin-form-section admin-about-field" key={key}>
          <AdminField as="textarea" label={label} name={`profile-${key}`} hint={hint || 'Enter one item per line.'} rows={key === 'biography' ? 7 : 4} value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} />
        </section>)}
        <div className="admin-form-actions"><button className="admin-button admin-button--primary" type="submit">Save profile</button><p>Changes will not appear on the public site until profile storage is connected.</p></div>
      </form>
      <aside className="admin-preview-note"><p className="eyebrow">Preview</p><h2>Profile preview</h2><p>{values.introduction.trim() || 'Your introduction will preview here when you add it.'}</p><p className="admin-preview-muted">This preview is local to this page and has not been saved.</p></aside>
    </>
  )
}
