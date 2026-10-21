import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { transcript, items } = req.body ?? {}
  if (typeof transcript !== 'string' || !Array.isArray(items) || !items.every((item: unknown) => typeof item === 'string')) {
    return res.status(400).json({ error: 'Expected { transcript: string, items: string[] }' })
  }

  /* GEMMA 4 INTEGRATION GOES HERE — replace stub with Gemma API call, pass transcript + items array in prompt, expect JSON {item, qty, unit} back */
  return res.status(200).json({ item: transcript.split(' ')[0] ?? '', qty: 1, unit: 'pcs', confidence: 0 })
}
