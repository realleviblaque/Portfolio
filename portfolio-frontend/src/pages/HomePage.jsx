import { Link } from 'react-router-dom'
import { EmptyProjects } from '../components/EmptyProjects.jsx'
import { ProjectCard } from '../components/ProjectCard.jsx'
import { aboutProfile } from '../data/aboutProfile.js'
import { projects } from '../data/projects.js'
import { useProfileImage } from '../context/useProfileImage.js'

export function HomePage() {
  const { profileImage } = useProfileImage()
  const featuredProjects = projects.slice(0, 6)

  return (
    <main className="page home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy-block">
          <p className="eyebrow">Levi Blaque <span className="eyebrow-divider">/</span> Personal Portfolio</p>
          <h1 id="home-title">A personal space for work, ideas, and practice.</h1>
          <p className="hero-copy">A considered home for Levi Blaque’s projects and personal story.</p>
          <Link className="text-link hero-link" to="/projects">Explore projects <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="hero-art">
          {profileImage?.src && <img className="hero-portrait" src={profileImage.src} alt={profileImage.alt} style={{ objectPosition: `${profileImage.positionX}% ${profileImage.positionY}%`, transform: `scale(${profileImage.zoom})` }} />}
        </div>
      </section>

      <section className="home-section featured-section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div><p className="eyebrow">Selected work</p><h2 id="featured-title">Featured projects</h2></div>
          <Link className="text-link section-link" to="/projects">View All Projects <span aria-hidden="true">↗</span></Link>
        </div>
        {featuredProjects.length ? (
          <div className="project-grid">
            {featuredProjects.map((project) => <ProjectCard project={project} key={project.slug} />)}
          </div>
        ) : <EmptyProjects variant="featured" />}
      </section>

      <section className="home-section about-preview" aria-labelledby="about-preview-title">
        <div className="about-preview-heading"><p className="eyebrow">A little about</p><h2 id="about-preview-title">Levi Blaque</h2><span className="about-mark" aria-hidden="true">LB</span></div>
        <div className="about-preview-copy">
          <p>{aboutProfile.introduction || 'Personal introduction and background will be added when provided.'}</p>
          <Link className="text-link" to="/about">More About Me <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="home-section contact-preview" aria-labelledby="contact-preview-title">
        <p className="eyebrow">A conversation starts here</p>
        <div className="contact-preview-row">
          <h2 id="contact-preview-title">Have something<br />in mind?</h2>
          <Link className="contact-preview-link" to="/contact"><span>Get in touch</span><span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  )
}
