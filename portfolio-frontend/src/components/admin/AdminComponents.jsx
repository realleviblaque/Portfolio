export function AdminPageHeading({ eyebrow, title, description, action }) {
  return (
    <header className="admin-page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="admin-page-description">{description}</p>}
      </div>
      {action && <div className="admin-heading-action">{action}</div>}
    </header>
  )
}

export function BackendNotice({ children = 'Backend connection is not configured. Changes will not be saved yet.' }) {
  return <aside className="admin-backend-notice" role="status"><strong>Frontend preview</strong><span>{children}</span></aside>
}

export function AdminEmptyState({ title, children, action }) {
  return (
    <div className="admin-empty-state">
      <span className="admin-empty-index" aria-hidden="true">—</span>
      <div><h2>{title}</h2><p>{children}</p>{action}</div>
    </div>
  )
}

export function AdminFeedback({ children, variant = 'error' }) {
  if (!children) return null
  return <p className={`admin-feedback admin-feedback--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>{children}</p>
}

export function AdminField({ label, name, as = 'input', hint, ...props }) {
  const Control = as
  return (
    <label className="admin-field" htmlFor={name}>
      <span>{label}</span>
      {hint && <small>{hint}</small>}
      <Control id={name} name={name} {...props} />
    </label>
  )
}
