import { useEffect, useState } from 'react'
import { db, type LostSale } from '../db'

export default function LostSalesScreen() {
  const [rows, setRows] = useState<LostSale[]>([]), [names, setNames] = useState<Record<number,string>>({}), [error, setError] = useState('')
  useEffect(() => { void (async () => { try { const list = await db.lostSales.orderBy('timestamp').reverse().toArray(); setRows(list); const ids = [...new Set(list.map(x => x.itemId).filter((x): x is number => x !== null))]; const found = await db.items.bulkGet(ids); const map: Record<number,string> = {}; ids.forEach((id,i) => { map[id] = found[i]?.name_hi || '' }); setNames(map); setError('') } catch (e) { setError(String(e)) } })() }, [])
  const weekAgo = Date.now() - 7 * 86400000, count = rows.filter(x => x.timestamp >= weekAgo).length
  return <section>{error && <div className="error-banner">{error}</div>}<p className="card font-semibold mb-4">इस हफ्ते {count} बार माँगा गया / Asked {count} times this week</p><div className="grid gap-2">{rows.map(row => <article key={row.id} className="card min-h-[64px] flex justify-between items-center"><b>{row.itemId ? names[row.itemId] || row.rawName : row.rawName}</b><time className="text-sm text-slate-500">{new Date(row.timestamp).toLocaleString()}</time></article>)}{!rows.length && <p className="muted">No lost sales recorded / अभी कोई मांग नहीं</p>}</div></section>
}
