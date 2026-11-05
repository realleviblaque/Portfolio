import { Link, useParams } from 'react-router-dom'
import { PageIntro } from '../components/PageIntro.jsx'
import { ImageGallery } from '../components/ImageGallery.jsx'
import { projects } from '../data/projects.js'

function getImageSource(image) {
  if (typeof image === 'string') return image
  return image?.url || image?.src || image?.image || ''
}

export function ProjectDetailsPage() {
  const { slug } = useParams()
  const project = projects.find((item) => item.slug === slug)

  if (!project) {
    return (
      <main className="page not-found-page">
        <PageIntro eyebrow="Project" title="Project not found" description="This project may not exist or may not be available." />
        <Link className="text-link" to="/projects">Back to all projects <span aria-hidden="true">↗</span></Link>
      </main>
    )
  }

  return (
    <main className="page project-detail-page">
      <Link className="detail-back-link" to="/projects">← All projects</Link>
      <header className="detail-heading">
        <p className="eyebrow">{project.category || 'Project'}{project.status && <> <span className="eyebrow-divider">/</span> {project.status}</>}</p>
        <h1>{project.title || project.name}</h1>
        <p className="page-description">{project.shortDescription || project.description}</p>
      </header>
      <div className="detail-layout">
        <aside className="detail-meta" aria-label="Project information">
          <div><span>Category</span><p>{project.category || '—'}</p></div>
          <div><span>Status</span><p>{project.status || '—'}</p></div>
          {(project.startDate || project.endDate) && <div><span>Timeline</span><p>{project.startDate}{project.endDate ? ` — ${project.endDate}` : ''}</p></div>}
          {project.technologies?.length > 0 && <div><span>Technologies</span><p>{project.technologies.join(', ')}</p></div>}
          {(project.liveUrl || project.liveWebsiteUrl || project.repositoryUrl || project.repoUrl) && <div className="detail-links">
            {(project.liveUrl || project.liveWebsiteUrl) && <a href={project.liveUrl || project.liveWebsiteUrl} target="_blank" rel="noreferrer">Visit live site ↗</a>}
            {(project.repositoryUrl || project.repoUrl) && <a href={project.repositoryUrl || project.repoUrl} target="_blank" rel="noreferrer">View repository ↗</a>}
          </div>}
        </aside>
        <article className="detail-description">
          <p className="eyebrow">About</p>
          <h2 className="detail-about-title">About this project</h2>
          <div>{project.fullDescription || project.description || project.shortDescription}</div>
        </article>
      </div>
      {(project.coverImage || project.gallery?.length > 0) && <section className="detail-gallery-section" aria-labelledby="gallery-title">
        <div className="detail-gallery-heading"><p className="eyebrow">In detail</p><h2 id="gallery-title">Image gallery</h2></div>
        <ImageGallery
          coverImage={project.coverImage ? {
            src: getImageSource(project.coverImage),
            alt: project.coverAlt || project.title,
            caption: project.coverCaption,
          } : null}
          images={project.gallery || []}
          projectTitle={project.title}
        />
      </section>}
      <section className="detail-contact"><p className="eyebrow">Continue the conversation</p><h2>Interested in this project?</h2><Link className="text-link" to="/contact">Get in touch ↗</Link></section>
    </main>
  )
}
