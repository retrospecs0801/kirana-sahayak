import { useEffect, useMemo, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { addLostSale, db, recordSale, type Item } from '../db'
import { useVoice, type VoiceParsed } from '../hooks/useVoice'

interface VoiceConfirmCardProps {
  parsed: VoiceParsed
  items: Item[]
  transcript: string
  onWrong: () => void
  onSearch: (transcript: string) => void
  onSold: (item: Item, qty: number) => void
}

function VoiceConfirmCard({ parsed, items, transcript, onWrong, onSearch, onSold }: VoiceConfirmCardProps) {
  const matchedItem = useMemo(() => {
    if (!parsed.itemName) return undefined
    return new Fuse(items, { keys: ['name_hi', 'name_en', 'aliases'], threshold: 0.4 }).search(parsed.itemName)[0]?.item
  }, [items, parsed.itemName])

  return <div className="voice-confirm card">
    {parsed.confidence < 0.5 && <div className="voice-warning">पक्का नहीं / Not sure — confirm before saving</div>}
    {!matchedItem ? <>
      <h3 className="text-xl font-extrabold">नहीं मिला / Item not found</h3>
      {parsed.itemName && <p className="text-slate-600 mt-1">{parsed.itemName}</p>}
      <button className="btn-primary w-full mt-3" onClick={() => onSearch(transcript)}>खोजो / Search</button>
    </> : <>
      <div className="font-extrabold text-2xl">{matchedItem.name_hi}</div>
      <div className="text-slate-600 mt-1">{parsed.qty} {parsed.unit}</div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button className="btn-outline" onClick={onWrong}>गलत / Wrong</button>
        <button className="btn-primary" onClick={() => onSold(matchedItem, parsed.qty)}>बेचा ✓ / Sold</button>
      </div>
    </>}
  </div>
}

export default function RecordSaleScreen() {
  const [items, setItems] = useState<Item[]>([]), [query, setQuery] = useState(''), [selected, setSelected] = useState<Item | null>(null), [qty, setQty] = useState('1'), [lostMode, setLostMode] = useState(false), [error, setError] = useState(''), [done, setDone] = useState('')
  const [online, setOnline] = useState(() => navigator.onLine)
  const searchRef = useRef<HTMLInputElement>(null)
  const itemNames = useMemo(() => items.flatMap(item => [item.name_en, item.name_hi, ...item.aliases]), [items])
  const voice = useVoice(itemNames)

  async function refresh() { try { setItems(await db.items.toArray()); setError('') } catch (e) { setError(String(e)) } }
  useEffect(() => { void refresh() }, [])
  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline) }
  }, [])

  const results = useMemo(() => query.trim() ? new Fuse(items, { keys: ['name_hi','name_en','aliases'], threshold: 0.4 }).search(query).map(x => x.item) : items, [items, query])
  async function confirmSale() { if (!selected?.id) return; try { await recordSale(selected.id, Number(qty)); setDone(`बिक गया / Sold: ${selected.name_hi}`); setSelected(null); setQuery(''); setQty('1'); await refresh() } catch (e) { setError(String(e)) } }
  async function confirmLost(item: Item | null) { const raw = item?.name_hi || query.trim(); if (!raw) { setError('Enter an item name'); return } try { await addLostSale(item?.id ?? null, raw); setDone(`माँग दर्ज / Request recorded: ${raw}`); setSelected(null); setQuery(''); setLostMode(false) } catch (e) { setError(String(e)) } }
  async function confirmVoiceSale(item: Item, amount: number) {
    if (item.id == null) { setError('Item not found'); return }
    try {
      await recordSale(item.id, amount)
      voice.reset()
      setDone(`बिक गया / Sold: ${item.name_hi}`)
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }
  function focusSearch() { window.setTimeout(() => searchRef.current?.focus(), 0) }
  function dismissVoice() { voice.reset(); focusSearch() }
  function searchTranscript(text: string) { setQuery(text); setSelected(null); voice.reset(); focusSearch() }

  const voiceLabel = voice.state === 'recording' ? 'सुन रहा हूँ… / Listening…' : voice.state === 'transcribing' || voice.state === 'parsing' ? 'समझ रहा हूँ… / Processing…' : voice.state === 'error' ? 'फिर कोशिश करें / Try again' : !online ? 'ऑफलाइन / Offline' : 'बोलो / Speak'
  const voiceBusy = voice.state === 'transcribing' || voice.state === 'parsing'
  return <section>
    <input ref={searchRef} className="search-input mb-4" placeholder="सामान खोजें / Search items" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); setDone('') }}/>
    <div className="voice-entry">
      <button type="button" className={`voice-mic ${voice.state === 'recording' ? 'recording' : ''}`} aria-label={voiceLabel} disabled={!online || voiceBusy} onClick={() => void voice.startRecording()}><span aria-hidden="true">🎙</span></button>
      <span className="voice-label">{voiceLabel}</span>
    </div>
    {error && <div className="error-banner">{error}</div>}{voice.error && <div className="error-banner">{voice.error}</div>}{done && <div className="success-banner">{done}</div>}
    {selected && !lostMode && <div className="card mb-4"><div className="font-bold text-xl">{selected.name_hi} <span className="text-sm text-slate-500">{selected.name_en}</span></div><label className="block mt-3 mb-2">Quantity / मात्रा</label><input className="search-input" type="number" step="0.001" min="0" value={qty} onChange={e => setQty(e.target.value)}/><button className="btn-primary w-full mt-3 text-lg" onClick={() => void confirmSale()}>बेचा / Sold</button></div>}
    {lostMode && <div className="card mb-4"><p className="font-semibold mb-3">Choose item or enter a new name / सामान चुनें या नाम लिखें</p><button className="btn-danger w-full" onClick={() => void confirmLost(null)}>Record “{query || 'new item'}” / दर्ज करें</button></div>}
    <div className="grid gap-2">{results.map(item => <button key={item.id} className="card min-h-[64px] text-left flex justify-between items-center" onClick={() => lostMode ? void confirmLost(item) : (setSelected(item), setDone(''))}><span><b className="text-lg">{item.name_hi}</b><small className="block text-slate-500">{item.name_en}</small></span><span>{item.qty} {item.unit}</span></button>)}</div>
    <div className="mt-6 border-t pt-4"><button className="btn-danger w-full" onClick={() => { setLostMode(true); setSelected(null); setDone('') }}>Customer माँगा, नहीं था / Asked, not available</button></div>
    {voice.state === 'done' && voice.parsed && <VoiceConfirmCard parsed={voice.parsed} items={items} transcript={voice.transcript} onWrong={dismissVoice} onSearch={searchTranscript} onSold={(item, amount) => void confirmVoiceSale(item, amount)} />}
  </section>
}
