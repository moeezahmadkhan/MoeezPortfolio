/**
 * The two things `/api/chat` has to decide about a request before it spends a
 * token on it: who is asking, and whether they are asking from his site.
 *
 * Both answers come from headers, and headers are the visitor's to write. The
 * whole point of this file is knowing which ones are not.
 */

export type IncomingHeaders = Record<string, string | string[] | undefined>

/** Origins the deployed site is actually served from. */
export const PRODUCTION_ORIGINS = [
  'https://moeezahmadkhan.com',
  'https://www.moeezahmadkhan.com',
]

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * The caller's address, as well as it can be known.
 *
 * `x-forwarded-for` is a LIST, and a visitor can put anything they like at the
 * front of it — the proxy appends, it does not overwrite. Reading entry [0]
 * therefore reads a value the rate limiter's target chose, which makes the
 * limiter a formality: a fresh spoofed address is a fresh bucket, and 15/min
 * becomes unlimited.
 *
 * So: prefer the headers the platform sets and refuses to forward from a client
 * (`x-vercel-forwarded-for`, then `x-real-ip`), and fall back to the LAST entry
 * of `x-forwarded-for` — the hop nearest us, which is the only one no earlier
 * hop could have written.
 */
export function clientIp(headers: IncomingHeaders): string {
  const trusted = first(headers['x-vercel-forwarded-for']) ?? first(headers['x-real-ip'])
  if (trusted?.trim()) return trusted.trim()

  const forwarded = first(headers['x-forwarded-for']) ?? ''
  const hops = forwarded
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean)

  // One shared bucket rather than one bucket each: an unknown caller must not be
  // cheaper to be than a known one.
  return hops[hops.length - 1] ?? 'unknown'
}

/**
 * Reads a comma-separated origin allowlist out of configuration, normalising a
 * trailing slash — an `Origin` header never has one, so a configured
 * "https://x.example/" would otherwise never match anything and fail silently.
 */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

/**
 * Whether this request came from a page we serve.
 *
 * Compared whole, never by prefix or suffix: "moeezahmadkhan.com.evil.example"
 * ends with nothing useful and starts with the real host, and both of the
 * obvious shortcuts let it through.
 *
 * A missing `Origin` is NOT allowed. Browsers set it on every POST; a script
 * pointed at the endpoint sets nothing. Treating absence as trusted would leave
 * the check as decoration.
 */
export function isAllowedOrigin(origin: string | undefined, extra: string[] = []): boolean {
  if (!origin) return false
  const normalised = origin.trim().replace(/\/+$/, '')
  return PRODUCTION_ORIGINS.includes(normalised) || extra.includes(normalised)
}

/**
 * Whether an origin is the local dev server.
 *
 * Parsed as a URL and compared on the HOSTNAME, never by substring: both
 * "localhost.evil.example" and "https://evil.example/?x=localhost" contain the
 * word and neither is this machine.
 */
export function isLoopbackOrigin(origin: string | undefined): boolean {
  if (!origin) return false
  let host: string
  try {
    host = new URL(origin).hostname
  } catch {
    return false
  }
  // URL keeps IPv6 literals in brackets.
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
}
