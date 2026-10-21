import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { addLostSale, db, recordSale, type Item } from '../db'

export default function RecordSaleScreen() {
  const [items, setItems] = useState<Item[]>([]), [query, setQuery] = useState(''), [selected, setSelected] = useState<Item | null>(null), [qty, setQty] = useState('1'), [lostMode, setLostMode] = useState(false), [error, setError] = useState(''), [done, setDone] = useState('')
  async function refresh() { try { setItems(await db.items.toArray()); setError('') } catch (e) { setError(String(e)) } }
  useEffect(() => { void refresh() }, [])
  const results = useMemo(() => query.trim() ? new Fuse(items, { keys: ['name_hi','name_en','aliases'], threshold: 0.4 }).search(query).map(x => x.item) : items, [items, query])
  async function confirmSale() { if (!selected?.id) return; try { await recordSale(selected.id, Number(qty)); setDone(`बिक गया / Sold: ${selected.name_hi}`); setSelected(null); setQuery(''); setQty('1'); await refresh() } catch (e) { setError(String(e)) } }
  async function confirmLost(item: Item | null) { const raw = item?.name_hi || query.trim(); if (!raw) { setError('Enter an item name'); return } try { await addLostSale(item?.id ?? null, raw); setDone(`माँग दर्ज / Request recorded: ${raw}`); setSelected(null); setQuery(''); setLostMode(false) } catch (e) { setError(String(e)) } }
  return <section><input className="search-input mb-4" placeholder="सामान खोजें / Search items" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); setDone('') }}/>
    {error && <div className="error-banner">{error}</div>}{done && <div className="success-banner">{done}</div>}
    {selected && !lostMode && <div className="card mb-4"><div className="font-bold text-xl">{selected.name_hi} <span className="text-sm text-slate-500">{selected.name_en}</span></div><label className="block mt-3 mb-2">Quantity / मात्रा</label><input className="search-input" type="number" step="0.001" min="0" value={qty} onChange={e => setQty(e.target.value)}/><button className="btn-primary w-full mt-3 text-lg" onClick={() => void confirmSale()}>बेचा / Sold</button></div>}
    {lostMode && <div className="card mb-4"><p className="font-semibold mb-3">Choose item or enter a new name / सामान चुनें या नाम लिखें</p><button className="btn-danger w-full" onClick={() => void confirmLost(null)}>Record “{query || 'new item'}” / दर्ज करें</button></div>}
    <div className="grid gap-2">{results.map(item => <button key={item.id} className="card min-h-[64px] text-left flex justify-between items-center" onClick={() => lostMode ? void confirmLost(item) : (setSelected(item), setDone(''))}><span><b className="text-lg">{item.name_hi}</b><small className="block text-slate-500">{item.name_en}</small></span><span>{item.qty} {item.unit}</span></button>)}</div>
    <div className="mt-6 border-t pt-4"><button className="btn-danger w-full" onClick={() => { setLostMode(true); setSelected(null); setDone('') }}>Customer माँगा, नहीं था / Asked, not available</button></div>
    {/* VOICE BUTTON GOES HERE */}
    {/* GEMMA PARSE RESULT GOES HERE */}
  </section>
}
