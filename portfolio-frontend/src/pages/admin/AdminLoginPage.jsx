import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminField, AdminFeedback } from '../../components/admin/AdminComponents.jsx'
import { adminService } from '../../services/adminService.js'

export function AdminLoginPage() {
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    try {
      await adminService.signIn({ email: formData.get('email'), password: formData.get('password') })
    } catch (error) {
      form.reset()
      setFeedback(error.message)
    }
  }

  return (
    <main className="admin-login-page">
      <Link className="admin-brand" to="/"><span>Levi Blaque.</span><small>Portfolio administration</small></Link>
      <section className="admin-login-panel">
        <p className="eyebrow">Admin / Access</p><h1>Sign in</h1>
        <p>Authentication is not connected. This form cannot sign you in, and admin routes are not protected.</p>
        <AdminFeedback>{feedback}</AdminFeedback>
        <form className="admin-login-form" id="admin-login-form" onSubmit={handleSubmit}>
          <AdminField label="Email" name="email" type="email" autoComplete="username" required />
          <AdminField label="Password" name="password" type="password" autoComplete="current-password" required />
          <button className="admin-button admin-button--primary" type="submit">Authentication unavailable</button>
        </form>
        <Link className="admin-text-link" to="/">Return to the public portfolio <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  )
}
