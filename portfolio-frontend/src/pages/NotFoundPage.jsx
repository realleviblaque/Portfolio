import { Link } from 'react-router-dom'
import { PageIntro } from '../components/PageIntro.jsx'

export function NotFoundPage() {
  return (
    <main className="page not-found-page">
      <PageIntro eyebrow="404" title="Page not found" description="The page you’re looking for isn’t here." />
      <Link className="text-link" to="/">Return home <span aria-hidden="true">↗</span></Link>
    </main>
  )
}
