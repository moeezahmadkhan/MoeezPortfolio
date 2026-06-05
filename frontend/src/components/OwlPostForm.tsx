import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { validate, buildSubmission, type OwlFields, type FieldErrors } from './owlPost'
import './OwlPostForm.css'

const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined
const ENDPOINT = 'https://api.web3forms.com/submit'

const EMPTY: OwlFields = { name: '', email: '', message: '' }

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function OwlPostForm() {
  const [fields, setFields] = useState<OwlFields>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>('idle')

  function update(key: keyof OwlFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }))
    // Clear a field's error as soon as the visitor edits it.
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return

    const found = validate(fields)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    if (!ACCESS_KEY) {
      console.warn('[OwlPostForm] VITE_WEB3FORMS_KEY is not set — cannot send.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(buildSubmission(fields, ACCESS_KEY)),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setFields(EMPTY)
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="owlform">
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="sent"
            className="owlform__sent"
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="owlform__sent-rune">🦉</span>
            <p className="owlform__sent-title">Your owl is away</p>
            <p className="owlform__sent-sub">
              I&rsquo;ll reply soon. In the meantime, the candles keep burning.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="owlform__form"
            onSubmit={handleSubmit}
            noValidate
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.4 }}
          >
            <Field
              id="owl-name"
              label="Your name"
              placeholder="What shall I call you?"
              value={fields.name}
              error={errors.name}
              onChange={(v) => update('name', v)}
              autoComplete="name"
            />
            <Field
              id="owl-email"
              label="Return address"
              type="email"
              placeholder="Where should the owl return?"
              value={fields.email}
              error={errors.email}
              onChange={(v) => update('email', v)}
              autoComplete="email"
            />
            <Field
              id="owl-message"
              label="Your message"
              placeholder="Agents, vision pipelines, model deployment…"
              value={fields.message}
              error={errors.message}
              onChange={(v) => update('message', v)}
              multiline
            />

            {/* Honeypot — hidden from humans, tempting to bots. */}
            <input
              type="checkbox"
              name="botcheck"
              className="owlform__botcheck"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <button type="submit" className="btn btn--primary owlform__submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending the owl…' : 'Send the owl'}
            </button>

            {status === 'error' && (
              <p className="owlform__error" role="alert">
                The owl couldn&rsquo;t take flight. Try again, or write me directly at{' '}
                <a href="mailto:kmoeez2018@gmail.com">kmoeez2018@gmail.com</a>.
              </p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  multiline = false,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  type?: string
  multiline?: boolean
  autoComplete?: string
}) {
  const invalid = Boolean(error)
  const shared = {
    id,
    value,
    placeholder,
    'aria-invalid': invalid,
    'aria-describedby': invalid ? `${id}-error` : undefined,
    className: 'owlform__input' + (invalid ? ' owlform__input--invalid' : ''),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  }
  return (
    <label className="owlform__field" htmlFor={id}>
      <span className="owlform__label">{label}</span>
      {multiline ? (
        <textarea {...shared} rows={4} />
      ) : (
        <input {...shared} type={type} autoComplete={autoComplete} />
      )}
      {invalid && (
        <span id={`${id}-error`} className="owlform__field-error">
          {error}
        </span>
      )}
    </label>
  )
}
