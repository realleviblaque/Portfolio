import { Outlet } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader.jsx'
import { SiteFooter } from '../components/SiteFooter.jsx'

export function PublicLayout() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader />
      <div id="main-content" className="route-content" tabIndex={-1}>
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  )
}
