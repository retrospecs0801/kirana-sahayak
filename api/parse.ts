import type { VercelRequest, VercelResponse } from '@vercel/node'

interface GemmaResult { item: unknown; qty?: unknown; unit?: unknown }

function firstWordOfTranscript(transcript: string) {
  return transcript.trim().split(/\s+/)[0] || ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { transcript, items } = req.body ?? {}
  if (typeof transcript !== 'string' || !Array.isArray(items) || !items.every((item: unknown) => typeof item === 'string')) {
    return res.status(400).json({ error: 'Expected { transcript: string, items: string[] }' })
  }

  try {
    const apiKey = process.env.GEMMA_API_KEY
    if (!apiKey || apiKey === 'your_key_here') throw new Error('Gemma API key is not configured')

    const prompt = `You are a kirana shop assistant. Extract item and quantity from this voice transcript.
Available items: ${items.join(', ')}
Transcript: "${transcript}"
Reply ONLY with JSON, no explanation: {"item": "<closest match from list>", "qty": <number>, "unit": "<kg|g|pcs|dozen|litre>"}
If you cannot match any item, set item to null.`

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 128 },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`Gemma API returned ${response.status}`)

    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const answer = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim()
    if (!answer) throw new Error('Gemma returned an empty response')

    const jsonText = answer.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(jsonText) as GemmaResult
    if (parsed.item === null || typeof parsed.item !== 'string') {
      return res.status(200).json({ item: null, qty: 1, unit: 'pcs', confidence: 0 })
    }

    const normalizedItem = parsed.item.trim().toLocaleLowerCase()
    const exact = items.find((item: string) => item.trim().toLocaleLowerCase() === normalizedItem)
    const partial = exact || items.find((item: string) => {
      const candidate = item.trim().toLocaleLowerCase()
      return candidate.includes(normalizedItem) || normalizedItem.includes(candidate)
    })
    if (!partial) return res.status(200).json({ item: null, qty: 1, unit: 'pcs', confidence: 0 })

    const qty = typeof parsed.qty === 'number' && Number.isFinite(parsed.qty) && parsed.qty > 0 ? parsed.qty : 1
    const validUnits = ['kg', 'g', 'pcs', 'dozen', 'litre']
    const unit = typeof parsed.unit === 'string' && validUnits.includes(parsed.unit.toLowerCase()) ? parsed.unit.toLowerCase() : 'pcs'
    return res.status(200).json({ item: partial, qty, unit, confidence: exact ? 1 : 0.6 })
  } catch {
    // Gemma failed or key missing — rule-based fallback
    return res.status(200).json({ item: firstWordOfTranscript(transcript), qty: 1, unit: 'pcs', confidence: 0 })
  }
}
