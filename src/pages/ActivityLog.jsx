import { useStore } from '../lib/store'
import { Clock, Filter } from 'lucide-react'
import { useState } from 'react'

export default function ActivityLog(){
  const { activity, notify } = useStore();
  const [filter, setFilter] = useState('all');

  const filtered = filter==='all' ? activity : activity.filter(a=> a.type===filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-black tracking-tight">Activity Log</h1>
          <p className="text-sm font-medium text-ink-500">Every autonomous decision — what the GM did, why, and the impact. Fully auditable.</p>
        </div>
        <button onClick={()=> notify('Exporting activity CSV — includes all reasoning & sim deltas','info')} className="px-4 py-2.5 rounded-full bg-white border border-ink-200 font-bold text-sm">Export CSV</button>
      </div>

      <div className="bg-white rounded-[20px] border border-ink-200 p-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-black tracking-widest text-ink-400 flex items-center gap-1.5"><Filter size={14}/> FILTER:</span>
        {['all','trade','waiver','lineup','news','simulation'].map(k=> (
          <button key={k} onClick={()=> setFilter(k)} className={`px-3.5 py-2 rounded-full text-xs font-black capitalize ${filter===k?'bg-ink-900 text-white':'bg-white border border-ink-200'}`}>{k}</button>
        ))}
        <span className="ml-auto text-xs font-semibold text-ink-500">{filtered.length} events • last 24h</span>
      </div>

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-ink-200 hidden md:block" />
        <div className="space-y-3">
          {filtered.map(a=> (
            <div key={a.id} className="relative flex gap-4 bg-white rounded-[20px] border border-ink-200 p-4 md:pl-14">
              <div className="hidden md:grid absolute left-2.5 top-4 w-5 h-5 rounded-full bg-ink-900 border-4 border-white shadow place-items-center"><span className="w-1.5 h-1.5 bg-white rounded-full" /></div>
              <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 font-black text-sm ${a.type==='trade'?'bg-violet-600 text-white': a.type==='waiver'?'bg-emerald-600 text-white': a.type==='lineup'?'bg-blue-600 text-white': a.type==='news'?'bg-amber-500 text-white':'bg-ink-900 text-white'}`}>{a.type[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-sm">{a.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${a.status==='done'?'bg-emerald-50 border-emerald-200 text-emerald-700': a.status==='blocked'?'bg-red-50 border-red-200 text-red-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>{a.status.toUpperCase()}</span>
                  <span className="text-xs font-bold text-ink-500 ml-auto flex items-center gap-1"><Clock size={12}/>{new Date(a.ts).toLocaleString()}</span>
                </div>
                <div className="text-sm font-medium text-ink-700 mt-1">{a.desc}</div>
                <div className="mt-2 rounded-2xl bg-ink-900 text-white p-3">
                  <div className="text-[11px] font-black tracking-widest text-white/60">REASONING</div>
                  <div className="text-sm font-medium leading-snug mt-1">{a.reasoning}</div>
                </div>
                <div className="mt-2 flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-ink-900 text-white text-xs font-black">{a.delta}</span>
                  <span className="px-3 py-1 rounded-full bg-white border border-ink-200 text-xs font-bold">{a.type} • {new Date(a.ts).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
