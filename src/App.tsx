import { useEffect, useState } from 'react'
import InventoryScreen from './components/InventoryScreen'
import RecordSaleScreen from './components/RecordSaleScreen'
import ReorderScreen from './components/ReorderScreen'
import LostSalesScreen from './components/LostSalesScreen'

type Tab = 'inventory' | 'sale' | 'reorder' | 'lost'
const tabs: { id: Tab; hi: string; en: string; icon: string }[] = [
  { id: 'inventory', hi: 'स्टॉक', en: 'Inventory', icon: '▤' }, { id: 'sale', hi: 'बिक्री', en: 'Record Sale', icon: '＋' },
  { id: 'reorder', hi: 'रीऑर्डर', en: 'Reorder', icon: '↻' }, { id: 'lost', hi: 'मांग', en: 'Lost Sales', icon: '♡' },
]
export default function App() {
  const [active, setActive] = useState<Tab>('inventory')
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const updateOnlineStatus = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])
  return <div className="app-shell">{!online && <div role="status" className="offline-banner">No internet — tap entry still works / इंटरनेट नहीं — टैप से काम करें</div>}<header className="topbar"><div className="brand-mark">द</div><div><h1>Dukaan Saathi</h1><p>आपकी दुकान का साथी</p></div><span className="offline-pill">● Offline ready</span></header>
    <main className="main-content"><div className="screen-heading"><h2>{tabs.find(x => x.id === active)?.hi}</h2><span>{tabs.find(x => x.id === active)?.en}</span></div>{active === 'inventory' && <InventoryScreen onNavigate={tab => setActive(tab)}/>}{active === 'sale' && <RecordSaleScreen/>}{active === 'reorder' && <ReorderScreen/>}{active === 'lost' && <LostSalesScreen/>}</main>
    <nav className="tabbar" aria-label="Main navigation">{tabs.map(tab => <button key={tab.id} className={`tab ${active === tab.id ? 'active' : ''}`} onClick={() => setActive(tab.id)}><span className="tab-icon">{tab.icon}</span><span>{tab.hi}</span><small>{tab.en}</small></button>)}</nav>
  </div>
}
