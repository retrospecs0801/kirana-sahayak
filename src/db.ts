import Dexie, { type Table } from 'dexie'

export interface Item {
  id?: number; name_hi: string; name_en: string; unit: string; qty: number
  reorderLevel: number; costPrice: number; aliases: string[]; lastSoldAt: number | null
}
export interface Sale { id?: number; itemId: number; qty: number; timestamp: number; voiceRaw: string | null }
export interface LostSale { id?: number; itemId: number | null; rawName: string; timestamp: number }

class DukaanDB extends Dexie {
  items!: Table<Item, number>
  sales!: Table<Sale, number>
  lostSales!: Table<LostSale, number>
  constructor() {
    super('DukaanSaathiDB')
    this.version(1).stores({ items: '++id, name_hi, name_en, lastSoldAt', sales: '++id, itemId, timestamp', lostSales: '++id, itemId, timestamp' })
  }
}
export const db = new DukaanDB()

export async function recordSale(itemId: number, qty: number) {
  await db.transaction('rw', db.items, db.sales, async () => {
    const item = await db.items.get(itemId)
    if (!item) throw new Error('Item not found')
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantity must be greater than zero')
    const timestamp = Date.now()
    await db.items.update(itemId, { qty: item.qty - qty, lastSoldAt: timestamp })
    await db.sales.add({ itemId, qty, timestamp, voiceRaw: null })
  })
}
export async function addLostSale(itemId: number | null, rawName: string) {
  await db.lostSales.add({ itemId, rawName, timestamp: Date.now() })
}
export async function getLowStock(_daysThreshold: number) {
  return (await db.items.toArray()).filter(item => item.qty <= item.reorderLevel)
}
export async function getDeadStock(daysSinceLastSale: number) {
  const cutoff = Date.now() - daysSinceLastSale * 86400000
  return (await db.items.toArray()).filter(item => item.qty > 0 && (item.lastSoldAt === null || item.lastSoldAt < cutoff))
}
export async function getStuckCash() {
  const dead = await getDeadStock(30)
  return dead.reduce((sum, item) => sum + item.qty * item.costPrice, 0)
}
