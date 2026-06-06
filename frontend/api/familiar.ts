import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleFamiliarRequest } from './_core/familiar'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ reply: 'Method not allowed' })
    return
  }
  const fwd = req.headers['x-forwarded-for']
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0]?.trim()) || 'unknown'

  const result = await handleFamiliarRequest({
    messages: req.body?.messages,
    ip,
    apiKey: process.env.OPENROUTER_API_KEY,
  })
  res.status(result.status).json(result.body)
}
