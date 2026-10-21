import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { seedDemoData } from './seed'
import './index.css'
import './styles.css'

declare global { interface Window { seedDemoData: typeof seedDemoData } }
window.seedDemoData = seedDemoData
registerSW({ immediate: true })
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
