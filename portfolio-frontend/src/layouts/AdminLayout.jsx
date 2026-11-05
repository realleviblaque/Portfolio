import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { ThemeSelect } from '../components/ThemeSelect.jsx'
import { BackendNotice } from '../components/admin/AdminComponents.jsx'

const navigation = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/projects', label: 'Projects' },
  { to: '/admin/messages', label: 'Contact requests' },
  { to: '/admin/about', label: 'About profile' },
  { to: '/admin/settings', label: 'Settings' },
]

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

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
          <Link to="/admin/login" className="admin-logout-link">Log out</Link>
        </div>
      </aside>

      <div className="admin-main-column">
        <header className="admin-topbar">
          <button className="admin-menu-toggle" type="button" aria-expanded={menuOpen}
            aria-controls="admin-navigation-panel" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? 'Close menu' : 'Menu'}
          </button>
          <span className="admin-topbar-title">Admin dashboard</span>
          <ThemeSelect />
        </header>
        <BackendNotice>Admin routes are not authenticated. Connect backend authentication before making this dashboard publicly available.</BackendNotice>
        <main className="admin-content" id="admin-content" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  )
}
