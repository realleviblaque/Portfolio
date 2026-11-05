import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminEmptyState, AdminFeedback, AdminPageHeading } from '../../components/admin/AdminComponents.jsx'
import { adminService } from '../../services/adminService.js'

const metrics = ['Total projects', 'Published', 'Drafts', 'Ongoing', 'Completed', 'Paused', 'Unread requests']

export function AdminOverviewPage() {
  const [serviceError, setServiceError] = useState('')

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => adminService.getOverview()).catch((error) => {
      if (active) setServiceError(error.message)
    })
    return () => { active = false }
  }, [])

  return (
    <>
      <AdminPageHeading eyebrow="Administration / 01" title="Overview" description="A clear view of the portfolio, once its backend is connected." />
      <AdminFeedback>{serviceError}</AdminFeedback>
      <section className="admin-metrics" aria-label="Portfolio statistics">
        {metrics.map((metric, index) => (
          <article className="admin-metric" key={metric}>
            <span className="admin-metric-index">0{index + 1}</span><h2>{metric}</h2>
            <p className="admin-metric-value" aria-label={`${metric}: unavailable`}>—</p>
            <p className="admin-metric-note">Unavailable until connected</p>
          </article>
        ))}
      </section>
      <div className="admin-overview-lower">
        <section className="admin-overview-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Portfolio</p><h2>Recent projects</h2></div><Link className="admin-text-link" to="/admin/projects">Manage projects <span aria-hidden="true">↗</span></Link></div>
          <AdminEmptyState title="Project records unavailable">No project records are shown until the project service is connected.</AdminEmptyState>
        </section>
        <section className="admin-overview-section">
          <div className="admin-section-heading"><div><p className="eyebrow">Inbox</p><h2>Contact requests</h2></div><Link className="admin-text-link" to="/admin/messages">Open requests <span aria-hidden="true">↗</span></Link></div>
          <AdminEmptyState title="Contact requests unavailable">Requests will appear here after the contact service is connected.</AdminEmptyState>
        </section>
      </div>
      <section className="admin-quick-actions" aria-labelledby="quick-actions-title">
        <p className="eyebrow">Shortcuts</p><h2 id="quick-actions-title">Continue managing</h2>
        <div><Link to="/admin/projects/new">Add a project <span aria-hidden="true">↗</span></Link><Link to="/admin/about">Edit profile <span aria-hidden="true">↗</span></Link><Link to="/admin/settings">Website settings <span aria-hidden="true">↗</span></Link></div>
      </section>
    </>
  )
}
