import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="footer-wordmark" to="/">Levi Blaque<span className="wordmark-period">.</span></Link>
        <p>Personal portfolio</p>
        <nav aria-label="Footer navigation">
          <Link to="/about">About</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  )
}
