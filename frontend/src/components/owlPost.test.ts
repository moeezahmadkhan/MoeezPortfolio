import { describe, it, expect } from 'vitest'
import { validate, buildSubmission } from './owlPost'

describe('validate', () => {
  it('accepts a well-formed submission with no errors', () => {
    const errors = validate({ name: 'Hermione', email: 'h@hogwarts.edu', message: 'Hello there' })
    expect(errors).toEqual({})
  })

  it('flags an empty name', () => {
    const errors = validate({ name: '   ', email: 'h@hogwarts.edu', message: 'Hi' })
    expect(errors.name).toBeTruthy()
    expect(errors.email).toBeUndefined()
    expect(errors.message).toBeUndefined()
  })

  it('flags a missing message', () => {
    const errors = validate({ name: 'Ron', email: 'r@burrow.uk', message: '' })
    expect(errors.message).toBeTruthy()
  })

  it('flags a malformed email', () => {
    expect(validate({ name: 'Ron', email: 'not-an-email', message: 'Hi' }).email).toBeTruthy()
    expect(validate({ name: 'Ron', email: 'a@b', message: 'Hi' }).email).toBeTruthy()
    expect(validate({ name: 'Ron', email: '', message: 'Hi' }).email).toBeTruthy()
  })

  it('accepts a normal email and trims surrounding whitespace when checking', () => {
    expect(validate({ name: 'Ron', email: '  r@burrow.uk  ', message: 'Hi' }).email).toBeUndefined()
  })
})

describe('buildSubmission', () => {
  const fields = { name: 'Hermione', email: 'h@hogwarts.edu', message: 'Need an agent built.' }

  it('includes the access key and trimmed field values', () => {
    const payload = buildSubmission(fields, 'KEY-123')
    expect(payload.access_key).toBe('KEY-123')
    expect(payload.name).toBe('Hermione')
    expect(payload.email).toBe('h@hogwarts.edu')
    expect(payload.message).toBe('Need an agent built.')
  })

  it('trims whitespace from submitted values', () => {
    const payload = buildSubmission({ name: '  Ron  ', email: '  r@burrow.uk ', message: '  Hi  ' }, 'KEY')
    expect(payload.name).toBe('Ron')
    expect(payload.email).toBe('r@burrow.uk')
    expect(payload.message).toBe('Hi')
  })

  it('derives a subject line naming the sender', () => {
    expect(buildSubmission(fields, 'KEY').subject).toContain('Hermione')
  })

  it('carries an empty botcheck honeypot field', () => {
    expect(buildSubmission(fields, 'KEY').botcheck).toBe('')
  })
})
