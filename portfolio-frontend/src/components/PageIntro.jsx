export function PageIntro({ eyebrow, title, description }) {
  return (
    <section className="page-intro" aria-labelledby="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="page-title">{title}</h1>
      {description && <p className="page-description">{description}</p>}
    </section>
  )
}
