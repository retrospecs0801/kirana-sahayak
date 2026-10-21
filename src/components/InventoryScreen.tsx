import { useEffect, useState } from 'react'
import { db, getStuckCash, type Item } from '../db'
import { seedDemoData } from '../seed'

interface InventoryScreenProps { onNavigate: (tab: 'reorder' | 'lost') => void }

export default function InventoryScreen({ onNavigate }: InventoryScreenProps) {
  const [items, setItems] = useState<Item[]>([]), [error, setError] = useState(''), [showForm, setShowForm] = useState(false)
  const [stuckCash, setStuckCash] = useState(0), [lostSalesThisWeek, setLostSalesThisWeek] = useState(0)
  const [form, setForm] = useState({ name_hi: '', name_en: '', unit: 'pcs', qty: '', reorderLevel: '', costPrice: '' })
  async function refresh() { try { setItems(await db.items.toArray()); setError('') } catch (e) { setError(String(e)) } }
  async function refreshSummary() {
    try {
      const [cash, lostCount] = await Promise.all([
        getStuckCash(),
        db.lostSales.where('timestamp').above(Date.now() - 7 * 86400000).count(),
      ])
      setStuckCash(cash)
      setLostSalesThisWeek(lostCount)
      setError('')
    } catch (e) { setError(String(e)) }
  }
  useEffect(() => {
    void refresh()
    void refreshSummary()
    const onFocus = () => { void refreshSummary() }
    const onVisibility = () => { if (document.visibilityState === 'visible') void refreshSummary() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])
  async function addStock(item: Item) {
    const amount = Number(window.prompt(`Add stock to ${item.name_en} (${item.unit})`, '1'))
    if (!Number.isFinite(amount) || amount <= 0 || item.id == null) return
    try { await db.items.update(item.id, { qty: item.qty + amount }); await refresh() } catch (e) { setError(String(e)) }
  }
  async function saveItem(event: React.FormEvent) {
    event.preventDefault()
    try { await db.items.add({ ...form, qty: Number(form.qty), reorderLevel: Number(form.reorderLevel), costPrice: Number(form.costPrice), aliases: [], lastSoldAt: null }); setForm({ name_hi: '', name_en: '', unit: 'pcs', qty: '', reorderLevel: '', costPrice: '' }); setShowForm(false); await refresh() } catch (e) { setError(String(e)) }
  }
  async function seed() { try { await seedDemoData(); await refresh(); await refreshSummary() } catch (e) { setError(String(e)) } }
  return <section>
    <div className="inventory-summary" aria-label="Shop summary">
      <button className="summary-cell summary-cash" onClick={() => onNavigate('reorder')}><strong>₹{stuckCash.toFixed(0)}</strong><span>अटका / Stuck</span></button>
      <button className="summary-cell summary-lost" onClick={() => onNavigate('lost')}><strong>{lostSalesThisWeek}</strong><span>बार माँगा गया / Asked this week</span></button>
    </div>
    <div className="flex flex-wrap gap-3 mb-5"><button className="btn-primary" onClick={() => setShowForm(v => !v)}>＋ Add new item / नया सामान</button><button className="btn-outline" onClick={() => void seed()}>Demo data / नमूना सामान</button></div>
    {error && <div className="error-banner">{error}</div>}
    {showForm && <form onSubmit={saveItem} className="card grid gap-3 mb-5 sm:grid-cols-2"><h2 className="font-bold text-lg sm:col-span-2">Add item / नया सामान</h2>
      <input required placeholder="Hindi name / हिंदी नाम" value={form.name_hi} onChange={e => setForm({ ...form, name_hi: e.target.value })}/><input required placeholder="English name" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })}/>
      <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{['kg','g','pcs','dozen','litre'].map(x => <option key={x}>{x}</option>)}</select>
      {(['qty','reorderLevel','costPrice'] as const).map((key, i) => <input key={key} required type="number" step="0.001" min="0" placeholder={['Starting qty','Reorder level','Cost price'][i]} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}/>)}
      <button className="btn-primary sm:col-span-2">Save item / जोड़ें</button></form>}
    <div className="grid gap-3">{items.map(item => <article key={item.id} className="card min-h-[76px] flex items-center justify-between gap-3"><div><div className="font-bold text-xl">{item.name_hi}</div><div className="text-sm text-slate-500">{item.name_en}</div></div><div className="flex items-center gap-3"><strong className="text-right">{item.qty} <span className="text-sm font-normal">{item.unit}</span></strong><button aria-label={`Add stock to ${item.name_en}`} className="add-btn" onClick={() => void addStock(item)}>+</button></div></article>)}</div>
  </section>
}
