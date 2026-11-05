export function EmptyProjects({ variant = 'archive' }) {
  return (
    <div className={`empty-projects empty-projects--${variant}`}>
      <span className="empty-projects-index" aria-hidden="true">00</span>
      <p>No Project Added by Levi Blaque</p>
      <span className="empty-projects-mark" aria-hidden="true">LB</span>
    </div>
  )
}
