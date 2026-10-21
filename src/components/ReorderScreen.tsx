import { useEffect, useState } from 'react'
import { getDeadStock, getLowStock, getStuckCash, type Item } from '../db'

export default function ReorderScreen() {
  const [low, setLow] = useState<Item[]>([]), [dead, setDead] = useState<Item[]>([]), [cash, setCash] = useState(0), [error, setError] = useState('')
  useEffect(() => { void (async () => { try { const [a,b,c] = await Promise.all([getLowStock(0), getDeadStock(30), getStuckCash()]); setLow(a); setDead(b); setCash(c); setError('') } catch (e) { setError(String(e)) } })() }, [])
  const daysOld = (item: Item) => item.lastSoldAt ? Math.floor((Date.now() - item.lastSoldAt) / 86400000) : 'कभी नहीं / Never'
  function sendWhatsApp() { const text = ['कम स्टॉक / Running Low:', ...low.map(i => `${i.name_hi} (${i.name_en}) — ${i.qty} ${i.unit}, reorder at ${i.reorderLevel}`)].join('\n'); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer') }
  return <section>{error && <div className="error-banner">{error}</div>}<div className="card text-center mb-5"><div className="text-sm font-semibold text-slate-500">₹ अटका / stuck on shelf</div><div className="text-4xl font-extrabold text-red-600">₹{cash.toFixed(2)}</div></div>
    <h2 className="section-title">कम स्टॉक / Running Low</h2><div className="grid gap-2 mb-6">{low.map(i => <div className="card min-h-[64px] flex justify-between items-center" key={i.id}><b>{i.name_hi} <small className="block text-slate-500 font-normal">{i.name_en}</small></b><span>{i.qty} {i.unit} <small className="block text-slate-500">Reorder: {i.reorderLevel}</small></span></div>)}{!low.length && <p className="muted">No items running low / स्टॉक ठीक है</p>}</div>
    <h2 className="section-title">नहीं बिका / Not Moving</h2><div className="grid gap-2">{dead.map(i => <div className="card min-h-[64px] flex justify-between items-center" key={i.id}><b>{i.name_hi} <small className="block text-slate-500 font-normal">{i.name_en}</small></b><span>{i.qty} {i.unit}<small className="block text-slate-500">Last sold: {daysOld(i)}{typeof daysOld(i) === 'number' ? ' days ago' : ''}</small></span></div>)}{!dead.length && <p className="muted">No dead stock / सब बिक रहा है</p>}</div>
    <button className="btn-primary w-full mt-6" onClick={sendWhatsApp}>WhatsApp पर भेजो / Send on WhatsApp</button>
  </section>
}
