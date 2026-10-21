import { db, type Item } from './db'

const demoItems: Item[] = [
  { name_hi: 'पारले-जी', name_en: 'Parle-G', unit: 'pcs', qty: 18, reorderLevel: 6, costPrice: 5, aliases: ['parle', 'paddle', 'parley'], lastSoldAt: null },
  { name_hi: 'चीनी', name_en: 'Sugar', unit: 'kg', qty: 4.5, reorderLevel: 2, costPrice: 44, aliases: ['cheeni', 'chini', 'sugar'], lastSoldAt: null },
  { name_hi: 'चाय पत्ती', name_en: 'Tea leaves', unit: 'g', qty: 350, reorderLevel: 100, costPrice: 0.42, aliases: ['chai', 'tea', 'chai patti'], lastSoldAt: null },
  { name_hi: 'आटा', name_en: 'Wheat flour', unit: 'kg', qty: 7.25, reorderLevel: 3, costPrice: 32, aliases: ['atta', 'aata', 'flour'], lastSoldAt: null },
  { name_hi: 'दूध', name_en: 'Milk', unit: 'litre', qty: 2, reorderLevel: 3, costPrice: 54, aliases: ['doodh', 'milk'], lastSoldAt: null },
  { name_hi: 'नमक', name_en: 'Salt', unit: 'kg', qty: 1.5, reorderLevel: 1, costPrice: 18, aliases: ['namak', 'noon', 'salt'], lastSoldAt: null },
  { name_hi: 'एरियल', name_en: 'Ariel detergent', unit: 'pcs', qty: 3, reorderLevel: 2, costPrice: 10, aliases: ['ariel', 'washing powder'], lastSoldAt: null },
  { name_hi: 'कोलगेट', name_en: 'Colgate', unit: 'pcs', qty: 5, reorderLevel: 2, costPrice: 48, aliases: ['colgate', 'toothpaste'], lastSoldAt: null },
  { name_hi: 'पेंसिल', name_en: 'Pencil', unit: 'pcs', qty: 24, reorderLevel: 8, costPrice: 3, aliases: ['pencil', 'pensil'], lastSoldAt: null },
  { name_hi: 'बिस्कुट', name_en: 'Biscuits', unit: 'pcs', qty: 2, reorderLevel: 5, costPrice: 10, aliases: ['biscuit', 'biskut'], lastSoldAt: null },
  { name_hi: 'मैगी', name_en: 'Maggi noodles', unit: 'pcs', qty: 12, reorderLevel: 5, costPrice: 14, aliases: ['maggi', 'maggie'], lastSoldAt: null },
  { name_hi: 'डेटॉल', name_en: 'Dettol', unit: 'pcs', qty: 4, reorderLevel: 2, costPrice: 38, aliases: ['dettol', 'detol'], lastSoldAt: null },
]

export async function seedDemoData() {
  await db.transaction('rw', db.items, db.sales, db.lostSales, async () => {
    await Promise.all([db.items.clear(), db.sales.clear(), db.lostSales.clear()])
    await db.items.bulkAdd(demoItems)
    const [parleG, maggi] = await Promise.all([
      db.items.where('name_en').equals('Parle-G').first(),
      db.items.where('name_en').equals('Maggi noodles').first(),
    ])
    const now = Date.now()
    await db.lostSales.bulkAdd([
      { itemId: parleG?.id ?? null, rawName: 'Parle-G', timestamp: now - 2 * 86400000 },
      { itemId: maggi?.id ?? null, rawName: 'Maggi', timestamp: now - 4 * 86400000 },
    ])
  })
}
