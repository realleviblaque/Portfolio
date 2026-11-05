import { useEffect, useMemo, useState } from 'react'
import { AdminEmptyState, AdminFeedback, AdminPageHeading } from '../../components/admin/AdminComponents.jsx'
import { adminService } from '../../services/adminService.js'

const filters = ['all', 'unread', 'read', 'replied', 'archived']

export function AdminMessagesPage() {
  const [messages, setMessages] = useState([])
  const [filter, setFilter] = useState('all')
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => adminService.listMessages()).then((records) => {
      if (active && Array.isArray(records)) setMessages(records)
    }).catch((serviceError) => { if (active) setError(serviceError.message) })
    return () => { active = false }
  }, [])

  const visibleMessages = useMemo(() => filter === 'all' ? messages : messages.filter((message) => message.status === filter), [messages, filter])

  async function updateStatus(message, status) {
    try {
      await adminService.updateMessageStatus(message.id, status)
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, status } : item))
      setSelectedMessage((current) => current?.id === message.id ? { ...current, status } : current)
      setError('')
    } catch (serviceError) { setError(serviceError.message) }
  }

  async function deleteMessage(message) {
    if (!window.confirm(`Delete the contact request from ${message.name}?`)) return
    try {
      await adminService.deleteMessage(message.id)
      setMessages((current) => current.filter((item) => item.id !== message.id))
      setSelectedMessage(null)
      setError('')
    } catch (serviceError) { setError(serviceError.message) }
  }

  return (
    <>
      <AdminPageHeading eyebrow="Inbox / 03" title="Contact requests" description="Review incoming messages and track their handling status." />
      <AdminFeedback>{error}</AdminFeedback>
      <div className="admin-filter-tabs" role="group" aria-label="Filter contact requests">
        {filters.map((value) => <button key={value} type="button" className={filter === value ? 'is-selected' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
      </div>
      {visibleMessages.length ? (
        <div className="admin-message-layout">
          <ul className="admin-message-list" aria-label="Contact requests">{visibleMessages.map((message) => <li key={message.id} className={selectedMessage?.id === message.id ? 'is-selected' : ''}>
            <button className="admin-message-select" type="button" onClick={() => setSelectedMessage(message)}><span className="admin-message-row"><strong>{message.name}</strong><small>{message.createdAt || 'Date unavailable'}</small></span><span>{message.subject}</span><small className="admin-message-status">{message.status}</small></button>
          </li>)}</ul>
          {selectedMessage && <article className="admin-message-detail"><div><p className="eyebrow">Message detail</p><h2>{selectedMessage.subject}</h2></div><p>From {selectedMessage.name} · <a href={`mailto:${selectedMessage.email}`}>{selectedMessage.email}</a></p><p className="admin-message-body">{selectedMessage.message}</p><label className="admin-field" htmlFor="message-status"><span>Request status</span><select id="message-status" value={selectedMessage.status} onChange={(event) => updateStatus(selectedMessage, event.target.value)}><option value="unread">Unread</option><option value="read">Read</option><option value="replied">Replied</option><option value="archived">Archived</option></select></label><button className="admin-text-button" type="button" onClick={() => deleteMessage(selectedMessage)}>Delete request</button></article>}
        </div>
      ) : <AdminEmptyState title={messages.length ? 'No requests in this filter' : 'No contact requests available'}>{messages.length ? 'Choose another status filter to view requests.' : 'No contact requests are fabricated. Connect the contact service to load real enquiries.'}</AdminEmptyState>}
    </>
  )
}
