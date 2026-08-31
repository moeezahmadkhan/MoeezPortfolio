import { useState, type FormEvent } from 'react'
import { profile } from '../../content'
import { buildSubmission, validate, type ContactFields, type FieldErrors } from '../../lib/contactForm'
import { Section } from '../layout/Section'
import './Contact.css'

const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined
const EMPTY: ContactFields = { name: '', email: '', message: '' }

export function Contact() {
  const [fields, setFields] = useState<ContactFields>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate(fields)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (!ACCESS_KEY) {
      // No key configured (local dev, or a fork). Say so rather than pretending to send.
      setState('failed')
      return
    }

    setState('sending')
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(buildSubmission(fields, ACCESS_KEY)),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState('sent')
      setFields(EMPTY)
    } catch {
      setState('failed')
    }
  }

  return (
    <Section id="contact" title="Contact" eyebrow="05">
      <div className="contact">
        <div className="contact__direct">
          <p className="contact__lead">
            Hiring, or have a system that needs building? Mail me directly — I answer.
          </p>
          <a className="contact__email" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <p className="contact__meta">{profile.location}</p>
          <ul className="contact__socials">
            {profile.socials.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noreferrer noopener">
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <form className="contact__form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Name</span>
            <input
              name="name"
              value={fields.name}
              onChange={(e) => setFields({ ...fields, name: e.target.value })}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <em className="field__error">{errors.name}</em>}
          </label>

          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={fields.email}
              onChange={(e) => setFields({ ...fields, email: e.target.value })}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <em className="field__error">{errors.email}</em>}
          </label>

          <label className="field">
            <span>Message</span>
            <textarea
              name="message"
              rows={5}
              value={fields.message}
              onChange={(e) => setFields({ ...fields, message: e.target.value })}
              aria-invalid={Boolean(errors.message)}
            />
            {errors.message && <em className="field__error">{errors.message}</em>}
          </label>

          <button className="btn btn--solid" type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send message'}
          </button>

          <p role="status" aria-live="polite" className="contact__status">
            {state === 'sent' && 'Thanks — I have your message and will reply soon.'}
            {state === 'failed' && `That did not send. Mail me at ${profile.email} instead.`}
          </p>
        </form>
      </div>
    </Section>
  )
}
