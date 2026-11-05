import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ThemeSelect } from './ThemeSelect.jsx'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { to: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" to="/" onClick={closeMenu} aria-label="Levi Blaque home">
          Levi Blaque<span className="wordmark-period">.</span>
        </Link>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen}
          aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
        </button>
        <nav id="primary-navigation" className={`primary-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={closeMenu}
              className={({ isActive }) => isActive ? 'nav-link is-active' : 'nav-link'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <ThemeSelect />
      </div>
    </header>
  )
}
