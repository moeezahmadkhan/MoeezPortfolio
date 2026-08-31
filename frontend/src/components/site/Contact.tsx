import { useRef, useState, type FormEvent } from 'react'
import { profile } from '../../content'
import { buildSubmission, validate, type ContactFields, type FieldErrors } from '../../lib/contactForm'
import { Section } from '../layout/Section'
import './Contact.css'

const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined
const EMPTY: ContactFields = { name: '', email: '', message: '' }
const FIELD_ORDER: (keyof ContactFields)[] = ['name', 'email', 'message']

export function Contact() {
  const [fields, setFields] = useState<ContactFields>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate(fields)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Nothing else signals a failed submit to screen-reader users — the button
      // stays focused and the errors sit outside the status live region — so move
      // focus to the first invalid field.
      const firstInvalid = FIELD_ORDER.find((name) => found[name])
      if (firstInvalid) fieldRefs[firstInvalid].current?.focus()
      return
    }

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
    <Section id="contact" title="Contact" density="tight">
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
          <div className="field">
            <label htmlFor="contact-name">
              <span>Name</span>
              <input
                id="contact-name"
                name="name"
                ref={fieldRefs.name}
                value={fields.name}
                onChange={(e) => setFields({ ...fields, name: e.target.value })}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            </label>
            {errors.name && (
              <em className="field__error" id="name-error">
                {errors.name}
              </em>
            )}
          </div>

          <div className="field">
            <label htmlFor="contact-email">
              <span>Email</span>
              <input
                id="contact-email"
                name="email"
                type="email"
                ref={fieldRefs.email}
                value={fields.email}
                onChange={(e) => setFields({ ...fields, email: e.target.value })}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </label>
            {errors.email && (
              <em className="field__error" id="email-error">
                {errors.email}
              </em>
            )}
          </div>

          <div className="field">
            <label htmlFor="contact-message">
              <span>Message</span>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                ref={fieldRefs.message}
                value={fields.message}
                onChange={(e) => setFields({ ...fields, message: e.target.value })}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
            </label>
            {errors.message && (
              <em className="field__error" id="message-error">
                {errors.message}
              </em>
            )}
          </div>

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
