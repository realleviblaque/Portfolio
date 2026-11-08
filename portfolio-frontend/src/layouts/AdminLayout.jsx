import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ThemeSelect } from '../components/ThemeSelect.jsx'
import { AdminFeedback } from '../components/admin/AdminComponents.jsx'
import { useAdminAuth } from '../context/AdminAuthContext.jsx'

const navigation = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/projects', label: 'Projects' },
  { to: '/admin/messages', label: 'Contact requests' },
  { to: '/admin/about', label: 'About profile' },
  { to: '/admin/settings', label: 'Settings' },
]

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { status, admin, error, signOut } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
      navigate('/admin/login', { replace: true })
    } catch {
      // Keep the admin session UI in place so the owner can retry.
    } finally {
      setSigningOut(false)
    }
  }

  if (status === 'loading' || status === 'authenticating') {
    return <main className="admin-auth-loading" role="status" aria-live="polite">Verifying administrator session…</main>
  }
  if (status !== 'authenticated') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-content">Skip to dashboard content</a>
      <aside className={`admin-sidebar${menuOpen ? ' is-open' : ''}`}>
        <Link className="admin-brand" to="/admin" onClick={() => setMenuOpen(false)}>
          <span>Levi Blaque.</span><small>Portfolio administration</small>
        </Link>
        <nav id="admin-navigation-panel" aria-label="Admin navigation" className="admin-navigation">
          {navigation.map((item, index) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}>
              <span aria-hidden="true">0{index + 1}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/" className="admin-public-link">View public portfolio <span aria-hidden="true">↗</span></Link>
          <button type="button" className="admin-logout-link" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      </aside>

      <div className="admin-main-column">
        <header className="admin-topbar">
          <button className="admin-menu-toggle" type="button" aria-expanded={menuOpen}
            aria-controls="admin-navigation-panel" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? 'Close menu' : 'Menu'}
          </button>
          <span className="admin-topbar-title">{admin?.name ? `Admin dashboard / ${admin.name}` : 'Admin dashboard'}</span>
          <ThemeSelect />
        </header>
        <AdminFeedback>{error}</AdminFeedback>
        <main className="admin-content" id="admin-content" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  )
}
