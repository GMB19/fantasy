import { useStore } from '../lib/store'
import { Clock, AlertTriangle, Zap, TrendingUp } from 'lucide-react'

export default function News(){
  const { news, notify } = useStore();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-black tracking-tight">News</h1>
          <p className="text-sm font-medium text-ink-500">Beat reports • injuries • usage • Vegas line moves — GM parses every update and prices it.</p>
        </div>
        <span className="px-3 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/> LIVE MONITORING</span>
      </div>

      <div className="grid gap-3">
        {news.map(n=> (
          <div key={n.id} className="bg-white rounded-[20px] border border-ink-200 p-4 md:p-5 flex gap-4">
            <div className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 font-black text-xs ${n.type==='Injury'?'bg-amber-100 text-amber-700 border border-amber-200': n.type==='Vegas'?'bg-emerald-100 text-emerald-700 border border-emerald-200': n.type==='Usage'?'bg-blue-100 text-blue-700 border border-blue-200':'bg-ink-900 text-white'}`}>{n.type[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="px-2 py-1 rounded-full bg-ink-900 text-white text-[11px] font-black tracking-widest">{n.type.toUpperCase()}</span>
                <span className="text-ink-500 flex items-center gap-1"><Clock size={12}/> {n.time}</span>
                <span className="px-2 py-1 rounded-full bg-white border border-ink-200">{n.player} • {n.team}</span>
                <span className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-black border ${n.tag==='BUY LOW'?'bg-emerald-50 border-emerald-200 text-emerald-700': n.tag==='SELL HIGH'?'bg-red-50 border-red-200 text-red-700': n.tag==='WAIVER ALERT'?'bg-violet-50 border-violet-200 text-violet-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>{n.tag}</span>
              </div>
              <div className="font-black mt-2 leading-tight">{n.title}</div>
              <div className="text-sm font-medium text-ink-600 mt-1 leading-relaxed">{n.body}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-ink-900 text-white text-xs font-black">{n.impact}</span>
                <button onClick={()=> notify('GM priced this news into player values & trade finder','info')} className="px-3 py-1.5 rounded-full bg-white border border-ink-200 text-xs font-bold">See GM Pricing →</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-ink-900 text-white rounded-[20px] p-5">
        <h3 className="font-black">How News Becomes Action</h3>
        <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm font-medium">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-3">📡 <b>Ingest:</b> Beat reporters, injury reports, PFF, NextGen, FanDuel moves every 30s.</div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-3">🧮 <b>Price:</b> Convert to PPG delta, update value & trade finder in &lt;60s.</div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-3">🤖 <b>Act:</b> If edge ≥0.8% champ & confidence ≥85%, auto-queue or auto-send.</div>
        </div>
      </div>
    </div>
  )
}
