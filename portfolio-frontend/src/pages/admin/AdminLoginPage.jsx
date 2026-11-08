import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AdminField, AdminFeedback } from '../../components/admin/AdminComponents.jsx'
import { useAdminAuth } from '../../context/AdminAuthContext.jsx'

export function AdminLoginPage() {
  const { status, error, signIn } = useAdminAuth()
  const [submitting, setSubmitting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const intendedDestination = location.state?.from
  const redirectTo = intendedDestination?.pathname?.startsWith('/admin')
    && intendedDestination.pathname !== '/admin/login'
    ? intendedDestination
    : '/admin'

  useEffect(() => {
    if (status === 'authenticated') navigate(redirectTo, { replace: true })
  }, [navigate, redirectTo, status])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting || status === 'loading') return
    const form = event.currentTarget
    const formData = new FormData(form)
    setSubmitting(true)
    try {
      await signIn({ email: formData.get('email'), password: formData.get('password') })
      navigate(redirectTo, { replace: true })
    } catch {
      // Authentication errors are shown from the shared auth state.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <Link className="admin-brand" to="/"><span>Levi Blaque.</span><small>Portfolio administration</small></Link>
      <section className="admin-login-panel">
        <p className="eyebrow">Admin / Access</p><h1>Sign in</h1>
        <p>Sign in to manage the portfolio. Your session is handled securely by the backend.</p>
        {status === 'loading' && <p role="status">Checking your session…</p>}
        <AdminFeedback>{error}</AdminFeedback>
        <form className="admin-login-form" id="admin-login-form" onSubmit={handleSubmit} aria-busy={submitting}>
          <AdminField label="Email" name="email" type="email" autoComplete="username" required />
          <AdminField label="Password" name="password" type="password" autoComplete="current-password" required />
          <button className="admin-button admin-button--primary" type="submit" disabled={submitting || status === 'loading'}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <Link className="admin-text-link" to="/">Return to the public portfolio <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  )
}
