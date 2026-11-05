import { ContactForm } from '../components/ContactForm.jsx'

export function ContactPage() {
  return (
    <main className="page contact-page">
      <section className="contact-layout" aria-labelledby="page-title">
        <div className="contact-copy">
          <p className="eyebrow">Open correspondence <span className="eyebrow-divider">/</span> 01</p>
          <h1 id="page-title">Start a<br /><em>conversation.</em></h1>
          <p className="page-description">A place to connect with Levi Blaque. Share a note using the form below.</p>
        </div>
        <div className="contact-art" aria-hidden="true">
          <span className="contact-art-index">NOTE / 01</span>
          <svg viewBox="0 0 240 180" fill="none" role="presentation">
            <path d="M24 34h192v112H24z" />
            <path d="m26 38 94 72 94-72" />
            <path d="M26 142 91 91m123 51-65-51" />
          </svg>
          <span className="contact-art-caption">A note, when<br />you’re ready.</span>
        </div>
      </section>
      <ContactForm />
    </main>
  )
}
