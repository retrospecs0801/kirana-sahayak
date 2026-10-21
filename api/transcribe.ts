import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { api: { bodyParser: false } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const apiKey = process.env.AUDEXM_API_KEY
  if (!apiKey || apiKey === 'your_key_here') return res.status(503).json({ error: 'API key not configured' })

  const contentType = req.headers['content-type']
  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) {
    return res.status(400).json({ error: 'Expected multipart/form-data with an audio field' })
  }

  try {
    const chunks: Uint8Array[] = []
    for await (const chunk of req) chunks.push(new Uint8Array(chunk))
    const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
    const body = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }
    if (!/name="audio"/.test(new TextDecoder('latin1').decode(body))) {
      return res.status(400).json({ error: 'Missing audio field' })
    }

    const upstream = await fetch('https://audexum.com/api/transcribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': contentType },
      body: body.buffer as ArrayBuffer,
    })
    const payload = await upstream.json().catch(() => null) as { text?: string; detail?: unknown; error?: string } | null
    if (!upstream.ok) {
      const message = payload?.error || (typeof payload?.detail === 'string' ? payload.detail : `Transcription service returned ${upstream.status}`)
      return res.status(upstream.status).json({ error: message })
    }
    if (!payload?.text || typeof payload.text !== 'string') return res.status(502).json({ error: 'Transcription response did not include text' })
    return res.status(200).json({ transcript: payload.text })
  } catch (error) {
    console.error('Transcription request failed', error)
    return res.status(502).json({ error: 'Transcription service unavailable' })
  }
}
