import { describe, expect, it } from 'vitest'
import { type LinkPart, linkify } from './linkify'

const links = (text: string) =>
  linkify(text).filter((part): part is LinkPart => typeof part !== 'string')

describe('linkify', () => {
  it('leaves ordinary prose as one string', () => {
    expect(linkify('I build low-latency backend APIs.')).toEqual([
      'I build low-latency backend APIs.',
    ])
  })

  it('finds a bare https URL', () => {
    expect(links('My code is on GitHub: https://github.com/moeezahmadkhangit.')).toEqual([
      {
        href: 'https://github.com/moeezahmadkhangit',
        text: 'https://github.com/moeezahmadkhangit',
      },
    ])
  })

  it('leaves the sentence its full stop', () => {
    // persona.ts already strips this when it reads a URL out of the corpus, for
    // the same reason: trailing punctuation belongs to the sentence, not to the
    // address, and a link carrying the period 404s.
    const parts = linkify('Find me at https://moeezahmadkhan.com.')
    expect(links('Find me at https://moeezahmadkhan.com.')).toEqual([
      { href: 'https://moeezahmadkhan.com', text: 'https://moeezahmadkhan.com' },
    ])
    expect(parts[parts.length - 1]).toBe('.')
  })

  it('handles a URL wrapped in parentheses', () => {
    expect(links('(https://querysphere.moeezahmadkhan.com/)')).toEqual([
      {
        href: 'https://querysphere.moeezahmadkhan.com/',
        text: 'https://querysphere.moeezahmadkhan.com/',
      },
    ])
  })

  it('makes an email address mailable', () => {
    expect(links('Email me at kmoeez2018@gmail.com and I answer.')).toEqual([
      { href: 'mailto:kmoeez2018@gmail.com', text: 'kmoeez2018@gmail.com' },
    ])
  })

  it('finds every link in a message, in order', () => {
    const parts = links(
      'LinkedIn: https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/ or kmoeez2018@gmail.com.',
    )
    expect(parts.map((p) => p.href)).toEqual([
      'https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/',
      'mailto:kmoeez2018@gmail.com',
    ])
  })

  it('never produces a javascript: link', () => {
    // The model's output is untrusted text. Only three schemes may become an
    // href; anything else stays exactly what it is — characters on the page.
    expect(links('javascript:alert(1)')).toEqual([])
    expect(linkify('javascript:alert(1)')).toEqual(['javascript:alert(1)'])
  })

  it('never produces a data: link', () => {
    expect(links('data:text/html,<script>alert(1)</script>')).toEqual([])
  })

  it('leaves a URL that runs off the end of a truncated reply as plain text', () => {
    // MAX_OUTPUT_TOKENS is 256, so a reply can stop mid-address. A link to half
    // a URL is worse than no link: it looks live and goes nowhere.
    expect(links('The repo is at https://github.com/moeezahmadkhangit/quer')).toEqual([])
  })

  it('still links a URL that ends a properly finished sentence', () => {
    expect(
      links('The repo is at https://github.com/moeezahmadkhangit/querysphere.'),
    ).toHaveLength(1)
  })

  it('keeps the surrounding prose intact', () => {
    expect(linkify('Mail me at kmoeez2018@gmail.com and I answer.')).toEqual([
      'Mail me at ',
      { href: 'mailto:kmoeez2018@gmail.com', text: 'kmoeez2018@gmail.com' },
      ' and I answer.',
    ])
  })
})
