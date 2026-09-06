import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import TeamOverview from './pages/TeamOverview'
import AIGM from './pages/AIGM'
import TradeFinder from './pages/TradeFinder'
import WaiverWire from './pages/WaiverWire'
import LineupOptimizer from './pages/LineupOptimizer'
import LeagueAnalyzer from './pages/LeagueAnalyzer'
import PlayerMarket from './pages/PlayerMarket'
import News from './pages/News'
import ActivityLog from './pages/ActivityLog'
import Auth from './pages/Auth'
import { useStore } from './lib/store'

export default function App(){
  const { isAuthed } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  if(!isAuthed) return <Auth />;

  return (
    <div className="min-h-[100dvh] flex bg-[#f8fafb]">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header onMenu={()=> setMobileOpen(v=> !v)} />
        <main className="flex-1 px-4 lg:px-6 py-6 max-w-[1400px] w-full mx-auto">
          <Routes>
            <Route path="/" element={<TeamOverview />} />
            <Route path="/ai-gm" element={<AIGM />} />
            <Route path="/trades" element={<TradeFinder />} />
            <Route path="/waivers" element={<WaiverWire />} />
            <Route path="/lineup" element={<LineupOptimizer />} />
            <Route path="/analyzer" element={<LeagueAnalyzer />} />
            <Route path="/market" element={<PlayerMarket />} />
            <Route path="/news" element={<News />} />
            <Route path="/activity" element={<ActivityLog />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="mt-8 py-6 border-t border-ink-200 text-center text-xs font-semibold text-ink-400">
            GM • Autonomous Fantasy Football • FanDuel-anchored projections • Sleeper synced • Built for 24/7 championship optimization • <span className="text-ink-600">Arena Championship League • Week 7</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
