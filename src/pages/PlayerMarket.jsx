import { useStore } from '../lib/store'
import { Search, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { useState, useMemo } from 'react'

export default function PlayerMarket(){
  const { players, myRoster, setMyRoster, notify } = useStore();
  const [q, setQ] = useState('');
  const [pos, setPos] = useState('ALL');
  const [sort, setSort] = useState('edge'); // edge | value | book

  const list = useMemo(()=>{
    let l = [...players];
    if(q) l = l.filter(p=> p.name.toLowerCase().includes(q.toLowerCase()) || p.team.toLowerCase().includes(q.toLowerCase()));
    if(pos!=='ALL') l = l.filter(p=> p.pos===pos);
    if(sort==='edge') l.sort((a,b)=> (b.sportsbookPPG - b.sleeperPPG) - (a.sportsbookPPG - a.sleeperPPG));
    if(sort==='value') l.sort((a,b)=> b.value - a.value);
    if(sort==='book') l.sort((a,b)=> b.sportsbookPPG - a.sportsbookPPG);
    return l;
  }, [players, q, pos, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-black tracking-tight">Player Market</h1>
          <p className="text-sm font-medium text-ink-500">Values • trends • sportsbook edges — the GM’s price sheet. Green = market underprices.</p>
        </div>
        <span className="px-3 py-2 rounded-full bg-white border border-ink-200 text-xs font-black">FanDuel props • Sleeper • PFF • ADP</span>
      </div>

      <div className="bg-white rounded-[20px] border border-ink-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={e=> setQ(e.target.value)} placeholder="Search players — e.g., Bijan, Jefferson, Barkley" className="w-full pl-9 pr-3 py-2.5 rounded-full bg-ink-50 border border-ink-200 text-sm" />
          </div>
          <div className="flex gap-1.5">
            {['ALL','QB','RB','WR','TE'].map(p=> (
              <button key={p} onClick={()=> setPos(p)} className={`px-3.5 py-2 rounded-full text-xs font-black ${pos===p?'bg-ink-900 text-white':'bg-white border border-ink-200'}`}>{p}</button>
            ))}
          </div>
          <select value={sort} onChange={e=> setSort(e.target.value)} className="px-3 py-2 rounded-full bg-white border border-ink-200 text-sm font-bold">
            <option value="edge">Sort: Sportsbook Edge</option>
            <option value="book">Sort: Book PPG</option>
            <option value="value">Sort: Value</option>
          </select>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-3 text-[11px] font-black tracking-widest text-ink-400 border-b border-ink-100 mt-3">
          <div className="col-span-4">PLAYER</div><div className="col-span-2 text-center">SLEEPER</div><div className="col-span-2 text-center">SPORTSBOOK</div><div className="col-span-2 text-center">EDGE</div><div className="col-span-2 text-center">ACTION</div>
        </div>

        <div className="mt-2 space-y-2 max-h-[560px] overflow-auto pr-1">
          {list.map(p=>{
            const edge = (p.sportsbookPPG - p.sleeperPPG);
            const owned = myRoster.includes(p.id);
            return (
              <div key={p.id} className={`grid md:grid-cols-12 gap-3 items-center p-3 rounded-2xl border ${Math.abs(edge)>1.5 ? edge>0?'bg-emerald-50/60 border-emerald-200':'bg-red-50/60 border-red-200':'bg-white border-ink-200'}`}>
                <div className="md:col-span-4 flex gap-3 items-center">
                  <img src={p.avatar || 'https://via.placeholder.com/80'} alt="" className="w-10 h-10 rounded-full bg-white object-cover border border-ink-200" />
                  <div className="min-w-0">
                    <div className="font-black text-sm leading-none flex items-center gap-1.5">{p.name} <span className={`text-[10px] px-1.5 py-0.5 rounded border font-black ${p.pos==='QB'?'bg-violet-50 border-violet-200 text-violet-700': p.pos==='RB'?'bg-emerald-50 border-emerald-200 text-emerald-700': p.pos==='WR'?'bg-blue-50 border-blue-200 text-blue-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>{p.pos}</span> <span className="text-xs font-semibold text-ink-400">{p.team}</span> {p.trend==='up'?<TrendingUp size={12} className="text-emerald-600"/>: p.trend==='down'?<TrendingDown size={12} className="text-red-600"/>:null}</div>
                    <div className="text-xs font-medium text-ink-500 truncate">{p.snapShare? `${p.snapShare}% snaps`: ''} {p.targetShare? `• ${p.targetShare}% tgt`: ''} {p.touches? `• ${p.touches} touches`: ''} • Value {p.value}</div>
                  </div>
                </div>
                <div className="md:col-span-2 text-center"><span className="inline-flex px-3 py-1.5 rounded-full bg-white border border-ink-200 font-black text-sm">{p.sleeperPPG.toFixed(1)}</span></div>
                <div className="md:col-span-2 text-center"><span className="inline-flex px-3 py-1.5 rounded-full bg-ink-900 text-white font-black text-sm">{p.sportsbookPPG.toFixed(1)}</span></div>
                <div className="md:col-span-2 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${edge>0?'bg-emerald-100 border-emerald-200 text-emerald-700': edge<0?'bg-red-100 border-red-200 text-red-700':'bg-ink-100 border-ink-200 text-ink-600'}`}>
                    {edge>0?'+':''}{edge.toFixed(1)} {edge>1?'• BUY': edge<-1?'• SELL':''}
                  </span>
                </div>
                <div className="md:col-span-2 flex gap-2 justify-center">
                  {owned ? <span className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-black">ROSTERED</span> : <button onClick={()=>{
                    if(myRoster.length>=15) { notify('Roster full — drop someone first','error'); return;}
                    setMyRoster(r=> [...r, p.id]); notify(`Added ${p.name} to roster — bench`, 'success');
                  }} className="px-3 py-1.5 rounded-full bg-ink-900 text-white text-xs font-black">Add</button>}
                  <button onClick={()=> notify(`${p.name}: Book ${p.sportsbookPPG} vs Sleeper ${p.sleeperPPG} — depth ${p.depth}, routes ${p.routes||'-'}`,'info')} className="px-3 py-1.5 rounded-full bg-white border border-ink-200 text-xs font-bold">Detail</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
