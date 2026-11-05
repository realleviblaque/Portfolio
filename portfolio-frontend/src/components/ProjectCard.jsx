import { Link } from 'react-router-dom'

function getImageSource(image) {
  if (typeof image === 'string') return image
  return image?.url || image?.src || image?.image || ''
}

function formatProjectDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short' }).format(date)
}

export function ProjectCard({ project }) {
  const title = project.title || project.name
  const description = project.shortDescription || project.description
  const coverSource = getImageSource(project.coverImage)
  const projectDate = formatProjectDate(project.createdAt || project.startDate)
  const liveUrl = project.liveUrl || project.liveWebsiteUrl

  return (
    <article className="project-card">
      <Link className="project-card-image" to={`/projects/${project.slug}`} aria-label={`View ${title}`}>
        {coverSource ? <img src={coverSource} alt={project.coverAlt || title} /> : <span className="project-card-monogram" aria-hidden="true">LB</span>}
        <span className="project-card-category">{project.category}</span>
      </Link>
      <div className="project-card-content">
        <div className="project-card-meta">
          {project.status && <span className={`status-label status-${project.status.toLowerCase()}`}>{project.status}</span>}
          {projectDate && <time dateTime={project.createdAt || project.startDate}>{projectDate}</time>}
        </div>
        <h2><Link to={`/projects/${project.slug}`}>{title}</Link></h2>
        <p>{description}</p>
        <div className="project-card-actions">
          <Link className="text-link" to={`/projects/${project.slug}`}>View Project <span aria-hidden="true">↗</span></Link>
          {liveUrl && <a className="project-live-link" href={liveUrl} target="_blank" rel="noreferrer">Visit Site <span aria-hidden="true">↗</span></a>}
        </div>
      </div>
    </article>
  )
}
