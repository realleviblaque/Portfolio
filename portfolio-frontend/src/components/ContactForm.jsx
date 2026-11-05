import { useState } from 'react'
import { submitContactRequest } from '../services/contactService.js'

const fields = [
  { name: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'subject', label: 'Subject', type: 'text' },
]

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Enter your name.'
  if (!values.email.trim()) errors.email = 'Enter your email address.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (!values.subject.trim()) errors.subject = 'Enter a subject.'
  if (!values.message.trim()) errors.message = 'Enter a message.'
  return errors
}

export function ContactForm() {
  const [values, setValues] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle')
  const [submissionError, setSubmissionError] = useState('')

  const updateField = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmissionError('')
    if (state === 'success' || state === 'error') setState('idle')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    setSubmissionError('')
    if (Object.keys(nextErrors).length) {
      setState('idle')
      document.getElementById(Object.keys(nextErrors)[0])?.focus()
      return
    }

    setState('submitting')
    try {
      await submitContactRequest({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
      })
      setState('success')
      setValues({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      setState('error')
      setSubmissionError(error.message || 'Your message could not be sent. Please try again later.')
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate aria-busy={state === 'submitting'}>
      <div className="contact-form-heading"><p className="eyebrow">Correspondence</p><h2>Send a message</h2></div>
      {fields.map(({ name, label, type, autoComplete }) => (
        <div className="form-field" key={name}>
          <label htmlFor={name}>{label}</label>
          <input id={name} name={name} type={type} autoComplete={autoComplete} value={values[name]}
            onChange={updateField} required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} />
          {errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>}
        </div>
      ))}
      <div className="form-field form-field-message">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" rows="6" value={values.message} onChange={updateField} required
          aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'message-error' : undefined} />
        {errors.message && <span className="field-error" id="message-error">{errors.message}</span>}
      </div>
      <div className="form-submit-row">
        <button className="form-submit" type="submit" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Sending…' : 'Send message'} <span aria-hidden="true">↗</span>
        </button>
        {state === 'submitting' && <p role="status">Sending your message…</p>}
        {state === 'success' && <p className="form-success" role="status">Your message was sent successfully.</p>}
        {submissionError && <p className="form-error" role="alert">{submissionError}</p>}
      </div>
    </form>
  )
}
