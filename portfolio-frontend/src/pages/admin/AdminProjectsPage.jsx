import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminEmptyState, AdminFeedback, AdminPageHeading } from '../../components/admin/AdminComponents.jsx'
import { adminService } from '../../services/adminService.js'

export function AdminProjectsPage() {
  const [projects, setProjects] = useState([])
  const [query, setQuery] = useState('')
  const [publication, setPublication] = useState('all')
  const [progress, setProgress] = useState('all')
  const [category, setCategory] = useState('all')
  const [serviceError, setServiceError] = useState('')

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => adminService.listProjects()).then((records) => {
      if (active && Array.isArray(records)) setProjects(records)
    }).catch((error) => {
      if (active) setServiceError(error.message)
    })
    return () => { active = false }
  }, [])

  const visibleProjects = useMemo(() => projects.filter((project) => {
    const searchable = `${project.title ?? ''} ${project.shortDescription ?? ''}`.toLowerCase()
    return searchable.includes(query.toLowerCase())
      && (publication === 'all' || project.publicationStatus === publication)
      && (progress === 'all' || project.status === progress)
      && (category === 'all' || project.category === category)
  }), [projects, query, publication, progress, category])
  const categories = [...new Set(projects.map((project) => project.category).filter(Boolean))]

  async function deleteProject(project) {
    if (!window.confirm(`Delete “${project.title}”? This action requires a connected backend.`)) return
    try {
      await adminService.deleteProject(project.id)
      setProjects((current) => current.filter((item) => item.id !== project.id))
      setServiceError('')
    } catch (error) {
      setServiceError(error.message)
    }
  }

  return (
    <>
      <AdminPageHeading eyebrow="Portfolio / 02" title="Projects" description="Search and manage project records. Progress and publication status stay separate."
        action={<Link className="admin-button admin-button--primary" to="/admin/projects/new">Add project <span aria-hidden="true">＋</span></Link>} />
      <AdminFeedback>{serviceError}</AdminFeedback>
      <section className="admin-list-tools" aria-label="Project filters">
        <label className="admin-field" htmlFor="project-search"><span>Search projects</span><input id="project-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title or description" /></label>
        <label className="admin-field" htmlFor="publication-filter"><span>Publication</span><select id="publication-filter" value={publication} onChange={(event) => setPublication(event.target.value)}><option value="all">All</option><option value="draft">Draft</option><option value="published">Published</option></select></label>
        <label className="admin-field" htmlFor="progress-filter"><span>Progress</span><select id="progress-filter" value={progress} onChange={(event) => setProgress(event.target.value)}><option value="all">All</option><option value="Ongoing">Ongoing</option><option value="Completed">Completed</option><option value="Paused">Paused</option></select></label>
        <label className="admin-field" htmlFor="category-filter"><span>Category</span><select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      </section>
      {visibleProjects.length ? (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Project</th><th scope="col">Category</th><th scope="col">Progress</th><th scope="col">Publication</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visibleProjects.map((project) => <tr key={project.id}>
            <th scope="row"><span className="admin-project-name">{project.title}</span><small>{project.shortDescription}</small></th>
            <td>{project.category || '—'}</td><td>{project.status}</td><td><span className={`admin-publication-status is-${project.publicationStatus}`}>{project.publicationStatus}</span></td>
            <td className="admin-table-actions"><Link to={`/admin/projects/${project.id}/edit`}>Edit</Link><button type="button" onClick={() => deleteProject(project)}>Delete</button></td>
          </tr>)}</tbody></table></div>
      ) : (
        <AdminEmptyState title={projects.length ? 'No matching projects' : 'No project records yet'}>
          {projects.length ? 'Try changing the search or filters.' : 'No sample projects are displayed. Connect the project service to load and manage real records.'}
        </AdminEmptyState>
      )}
    </>
  )
}
