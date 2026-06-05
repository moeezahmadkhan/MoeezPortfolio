// Pure, framework-free logic for the Owl Post contact form.
// Kept separate from the React component so it can be unit-tested.

export type OwlFields = {
  name: string
  email: string
  message: string
}

export type FieldErrors = Partial<Record<keyof OwlFields, string>>

// Deliberately simple: requires `local@domain.tld` with a dotted domain. Web3Forms
// validates server-side too; this is just to catch obvious typos before sending.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validate(fields: OwlFields): FieldErrors {
  const errors: FieldErrors = {}
  if (!fields.name.trim()) errors.name = 'Please share your name.'
  if (!EMAIL_RE.test(fields.email.trim())) errors.email = 'A valid return address, please.'
  if (!fields.message.trim()) errors.message = 'The scroll is empty — add a message.'
  return errors
}

export type Web3FormsPayload = {
  access_key: string
  name: string
  email: string
  message: string
  subject: string
  from_name: string
  botcheck: string
}

export function buildSubmission(fields: OwlFields, accessKey: string): Web3FormsPayload {
  const name = fields.name.trim()
  return {
    access_key: accessKey,
    name,
    email: fields.email.trim(),
    message: fields.message.trim(),
    subject: `New owl from ${name} — portfolio contact`,
    from_name: 'Wizard Portfolio',
    botcheck: '',
  }
}
