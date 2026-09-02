import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleChatRequest } from './_core/chat.js'
import { clientIp, parseAllowedOrigins } from './_core/request.js'

/**
 * Origins beyond the production site that may call this endpoint — set
 * `CHAT_ALLOWED_ORIGINS` in the Vercel project to a comma-separated list when a
 * preview deployment needs the chat. Deliberately not a `*.vercel.app` wildcard:
 * anyone can deploy to that domain, so the wildcard would be no check at all.
 */
const extraOrigins = parseAllowedOrigins(process.env.CHAT_ALLOWED_ORIGINS)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ reply: 'Method not allowed' })
    return
  }

  const origin = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin

  const result = await handleChatRequest({
    messages: req.body?.messages,
    // Not `x-forwarded-for[0]` — see `clientIp`. That entry is the visitor's to write.
    ip: clientIp(req.headers),
    origin,
    allowedOrigins: extraOrigins,
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  // A reply is built for one visitor from one question; nothing between here and
  // them may keep a copy of it.
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.status(result.status).json(result.body)
}
