import { useState } from 'react'
import { EmptyProjects } from '../components/EmptyProjects.jsx'
import { ProjectCard } from '../components/ProjectCard.jsx'
import { projects } from '../data/projects.js'
import { filterAndSortProjects } from '../utils/projectDiscovery.js'

export function ProjectsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('newest')
  const categories = [...new Set(projects.map((project) => project.category).filter(Boolean))].sort()
  const visibleProjects = filterAndSortProjects(projects, { query, category, status, sort })
  const hasFilters = query || category !== 'all' || status !== 'all'
  const clearFilters = () => {
    setQuery('')
    setCategory('all')
    setStatus('all')
    setSort('newest')
  }

  return (
    <main className="page">
      <header className="projects-masthead">
        <div><p className="eyebrow">The work index <span className="eyebrow-divider">/</span> 01</p><h1>Projects<span className="title-period">.</span></h1></div>
        <p className="page-description">A collection of projects by Levi Blaque.</p>
        <span className="projects-masthead-index" aria-hidden="true">INDEX<br />01—06</span>
      </header>
      <section className="project-discovery" aria-label="Discover projects">
        <div className="discovery-toolbar">
          <div className="project-search-field">
            <label htmlFor="project-search">Search projects</label>
            <input id="project-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or description" />
          </div>
          <div className="project-filter-fields">
            <div className="project-filter-field">
              <label htmlFor="category-filter">Category</label>
              <select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="project-filter-field">
              <label htmlFor="status-filter">Status</label>
              <select id="status-filter" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="project-filter-field">
              <label htmlFor="sort-projects">Sort by</label>
              <select id="sort-projects" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="updated">Recently Updated</option>
              </select>
            </div>
          </div>
        </div>
        {projects.length === 0 ? <EmptyProjects variant="archive" /> : visibleProjects.length ? (
          <div className="project-grid projects-list">
            {visibleProjects.map((project) => <ProjectCard project={project} key={project.slug} />)}
          </div>
        ) : (
          <div className="no-filter-results">
            <p>No projects match these filters.</p>
            {hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}
          </div>
        )}
      </section>
    </main>
  )
}
