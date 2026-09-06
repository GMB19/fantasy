import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Bot, Repeat2, ClipboardList, LineChart, Trophy, TrendingUp, Newspaper, Activity, Settings, LogOut, Zap } from 'lucide-react'
import { useStore } from '../lib/store'

const nav = [
  { to: '/', label: 'Team Overview', icon: LayoutDashboard },
  { to: '/ai-gm', label: 'AI GM', icon: Bot, badge: 'LIVE' },
  { to: '/trades', label: 'Trade Finder', icon: Repeat2, count: 4 },
  { to: '/waivers', label: 'Waiver Wire', icon: ClipboardList, count: 3 },
  { to: '/lineup', label: 'Lineup Optimizer', icon: LineChart },
  { to: '/analyzer', label: 'League Analyzer', icon: Trophy },
  { to: '/market', label: 'Player Market', icon: TrendingUp },
  { to: '/news', label: 'News', icon: Newspaper, dot: true },
  { to: '/activity', label: 'Activity Log', icon: Activity },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { aiSettings, sim, setIsAuthed, notify } = useStore();
  return (
    <>
      {/* mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={()=> setMobileOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-[100dvh] w-[286px] bg-white border-r border-ink-200 flex flex-col overflow-hidden transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-ink-900 flex items-center justify-center text-white font-black text-[17px]">G</div>
            <div>
              <div className="font-black text-[17px] tracking-tight leading-none">GM</div>
              <div className="text-[11px] font-semibold tracking-widest text-ink-400 -mt-0.5">AUTONOMOUS • 24/7</div>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold tracking-widest bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
              <span className={`w-2 h-2 rounded-full ${aiSettings.autonomousMode ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />{aiSettings.autonomousMode ? 'AUTONOMOUS' : 'PAUSED'}
            </span>
          </div>
          <div className="mt-4 rounded-2xl bg-ink-900 text-white p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-widest font-bold text-white/60">CHAMPIONSHIP PROB</div>
              <div className="text-[22px] font-black leading-none mt-1">{sim.champ}%</div>
              <div className="text-[11px] font-medium text-emerald-300 mt-1">+2.1% this week • 71.4% playoffs</div>
            </div>
            <div className="w-14 h-14 rounded-full border-[6px] border-white/15 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-[6px] border-emerald-500" style={{clipPath:`inset(0 ${100-sim.champ*3}% 0 0)`}} />
              <Zap size={18} className="text-white" />
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-none">
          {nav.map(item=>{
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} onClick={()=> setMobileOpen(false)} className={({isActive})=> `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition ${isActive?'bg-ink-900 text-white shadow':'text-ink-600 hover:bg-ink-100 hover:text-ink-900'}`}>
                <Icon size={18} className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="text-[10px] font-black tracking-widest bg-emerald-500 text-white px-1.5 py-0.5 rounded">{item.badge}</span>}
                {item.count && <span className="text-xs font-bold bg-ink-900 text-white w-6 h-6 grid place-items-center rounded-full">{item.count}</span>}
                {item.dot && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-ink-200 space-y-2">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div className="text-[11px] font-black tracking-widest text-amber-700">AUTONOMOUS MODE</div>
            <div className="text-xs font-medium text-ink-700 leading-snug mt-1">GM scans every 12s. Next trade scan in <b>8s</b>.</div>
          </div>
          <div className="flex items-center gap-3 px-2 py-2">
            <img src="https://i.pravatar.cc/100?img=12" className="w-8 h-8 rounded-full object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-none">Gotham GMs</div>
              <div className="text-xs text-ink-500">@gotham_gm • Sleeper synced</div>
            </div>
            <button onClick={()=> { setIsAuthed(false); notify('Signed out — Sleeper token kept locally','info'); }} className="p-1.5 hover:bg-ink-100 rounded-lg" title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
    </>
  )
}
