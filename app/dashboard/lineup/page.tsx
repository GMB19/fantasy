"use client";

import { useState } from "react";
import { ArrowUpDown, Gauge, Loader2, Sparkles, TrendingUp, Wand2, X } from "lucide-react";
import { api, useApp, usePolling } from "@/components/data-provider";
import { PlayerDetailModal } from "@/components/player";
import { ProjectionCompareChart } from "@/components/charts";
import {
  EmptyState,
  Panel,
  SectionHeader,
  Skeleton,
  Stat,
  cn,
  fmt,
  useToast,
  PositionBadge,
  InjuryBadge,
} from "@/components/ui";

export default function LineupOptimizerPage() {
  const { data, refresh } = useApp();
  const { push } = useToast();
  const league = data?.snapshot?.league;
  const [week, setWeek] = useState<number | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [swapSlot, setSwapSlot] = useState<any>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const activeWeek = week ?? league?.current_week ?? 1;
  const { data: lineupData, loading, reload } = usePolling<{ week: number; lineup: any }>(
    league ? `/api/lineup?leagueId=${league.id}&week=${activeWeek}` : null,
    9000,
    [league?.id, activeWeek]
  );

  const lineup = lineupData?.lineup;

  const optimize = async () => {
    if (!league) return;
    setOptimizing(true);
    try {
      const res = await api<{ gain: number }>("/api/lineup/optimize", { method: "POST", body: { leagueId: league.id } });
      push({
        tone: "success",
        title: res.gain > 0 ? `Lineup improved by ${fmt(res.gain, 2)} pts` : "Lineup already optimal",
        body: res.gain > 0 ? "Starters were swapped based on the latest market data." : "No changes were needed.",
      });
      await Promise.all([reload(true), refresh(true)]);
    } catch (err: any) {
      push({ tone: "error", title: "Optimization failed", body: err.message });
    } finally {
      setOptimizing(false);
    }
  };

  const setSlot = async (slot: any, playerId: string | null) => {
    if (!league) return;
    try {
      await api("/api/lineup", {
        method: "POST",
        body: { leagueId: league.id, week: activeWeek, slot: slot.slot, slotIndex: slot.slotIndex, playerId },
      });
      setSwapSlot(null);
      await Promise.all([reload(true), refresh(true)]);
      push({ tone: "success", title: "Lineup updated" });
    } catch (err: any) {
      push({ tone: "error", title: "Could not update lineup", body: err.message });
    }
  };

  if (!league) return <Skeleton className="h-96" />;

  const chartData = (lineup?.slots ?? [])
    .filter((s: any) => s.player)
    .map((s: any) => ({
      name: s.player.name.split(" ").slice(-1)[0],
      book: s.player.book_pts,
      sleeper: s.player.sleeper_pts,
      model: s.player.model_pts,
    }));

  const weeks = [league.current_week, league.current_week + 1, league.current_week + 2].filter((w) => w <= 18);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Gauge size={22} className="text-turf-300" /> Lineup Optimizer
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Optimal starters solved from sportsbook-implied projections with injuries, byes and matchup ratings applied.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {weeks.map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  activeWeek === w ? "bg-turf-500/15 text-turf-200" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Wk {w}
              </button>
            ))}
          </div>
          <button onClick={optimize} disabled={optimizing} className="btn-primary text-[13px]">
            {optimizing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Apply optimal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Current projection" value={fmt(lineup?.currentTotal)} sub={`week ${activeWeek} starters`} icon={TrendingUp} />
        <Stat label="Optimal projection" value={fmt(lineup?.optimalTotal)} sub="model-solved" icon={Sparkles} />
        <Stat
          label="Points left on bench"
          value={fmt(lineup?.gain)}
          sub={lineup?.gain > 0.3 ? "action recommended" : "lineup is optimal"}
          icon={ArrowUpDown}
        />
        <Stat
          label="Injury flags"
          value={(lineup?.slots ?? []).filter((s: any) => s.player?.injury_status).length}
          sub="in your starting lineup"
          icon={Gauge}
        />
      </div>

      {lineup?.gain > 0.3 ? (
        <Panel className="border-turf-500/25 bg-turf-500/[0.05] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Sparkles size={16} className="mt-0.5 text-turf-300" />
              <div>
                <p className="text-[13px] font-semibold text-turf-200">
                  The AI can add {fmt(lineup.gain, 2)} projected points to this lineup
                </p>
                <p className="mt-0.5 text-[12px] text-slate-300">
                  {(lineup.optimal ?? [])
                    .filter((o: any, i: number) => o.playerId !== lineup.slots[i]?.player?.id)
                    .slice(0, 3)
                    .map((o: any, i: number) => `${o.slotLabel}: start ${o.player?.name ?? "—"}`)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <button onClick={optimize} disabled={optimizing} className="btn-primary !py-1.5 text-xs">
              {optimizing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Apply now
            </button>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionHeader
            icon={Gauge}
            title={`Week ${activeWeek} starters`}
            subtitle="Click a slot to swap in a bench player"
          />
          {loading && !lineup ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="divide-row">
              {(lineup?.slots ?? []).map((slot: any) => {
                const optimalForSlot = (lineup?.optimal ?? []).find(
                  (o: any) => o.slot === slot.slot && o.slotIndex === slot.slotIndex
                );
                const suboptimal = optimalForSlot && optimalForSlot.playerId !== slot.player?.id;
                return (
                  <div
                    key={`${slot.slot}-${slot.slotIndex}`}
                    className={cn("flex items-center gap-3 px-4 py-3", suboptimal && "bg-amber-500/[0.05]")}
                  >
                    <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {slot.slotLabel}
                    </span>
                    {slot.player ? (
                      <>
                        <PositionBadge position={slot.player.position} />
                        <div className="min-w-0 flex-1">
                          <button onClick={() => setDetailId(slot.player.id)} className="flex items-center gap-1.5 text-left">
                            <span className="truncate text-[13px] font-semibold text-slate-100 hover:text-white">
                              {slot.player.name}
                            </span>
                            <InjuryBadge status={slot.player.injury_status} />
                          </button>
                          <p className="num mt-0.5 text-[11px] text-slate-500">
                            {slot.player.nfl_team} {slot.player.opponent ? `vs ${slot.player.opponent}` : "· BYE"} · matchup{" "}
                            {fmt(slot.player.matchup_rating, 0)}/100
                          </p>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="num text-[13px] font-bold text-white">{fmt(slot.player.model_pts)}</p>
                          <p className="text-[10px] uppercase text-slate-500">proj</p>
                        </div>
                        <div className="hidden text-right md:block">
                          <p className="num text-[12px] font-semibold text-turf-300">{fmt(slot.player.book_pts)}</p>
                          <p className="text-[10px] uppercase text-slate-500">book</p>
                        </div>
                        <div className="hidden text-right lg:block">
                          <p className="num text-[12px] font-semibold text-sky-300">{fmt(slot.player.sleeper_pts)}</p>
                          <p className="text-[10px] uppercase text-slate-500">sleeper</p>
                        </div>
                      </>
                    ) : (
                      <span className="flex-1 text-[12.5px] text-slate-500">Empty slot</span>
                    )}
                    <button onClick={() => setSwapSlot(slot)} className="btn-ghost !px-2 !py-1 text-[11px]">
                      Swap
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionHeader icon={TrendingUp} title="Bench" subtitle="Reserve players and their projections" />
            <div className="scroll-thin max-h-[320px] overflow-y-auto divide-row">
              {(lineup?.bench ?? []).length ? (
                lineup.bench.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <PositionBadge position={p.position} />
                    <button onClick={() => setDetailId(p.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[12.5px] font-medium text-slate-200">{p.name}</span>
                      <span className="num block text-[11px] text-slate-500">
                        {p.nfl_team} {p.opponent ? `vs ${p.opponent}` : "· BYE"}
                      </span>
                    </button>
                    <span className="num text-[12.5px] font-semibold text-slate-300">{fmt(p.model_pts)}</span>
                  </div>
                ))
              ) : (
                <EmptyState title="No bench players" />
              )}
            </div>
          </Panel>

          <Panel>
            <SectionHeader icon={ArrowUpDown} title="Book vs platform" subtitle="Per-starter projection sources" />
            <div className="p-3">
              {chartData.length ? <ProjectionCompareChart data={chartData} height={280} /> : <EmptyState title="No data" />}
            </div>
          </Panel>
        </div>
      </div>

      {/* Swap modal */}
      {swapSlot ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8">
          <div className="panel my-auto w-full max-w-lg bg-ink-900/95">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Set {swapSlot.slotLabel} slot</h3>
                <p className="text-xs text-slate-400">Eligible players from your roster</p>
              </div>
              <button onClick={() => setSwapSlot(null)} className="rounded-lg p-1 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="scroll-thin max-h-[60vh] overflow-y-auto">
              <button onClick={() => setSlot(swapSlot, null)} className="w-full px-5 py-3 text-left text-[12.5px] text-slate-400 hover:bg-white/[0.04]">
                Clear slot
              </button>
              {[...(lineup?.bench ?? []), ...(lineup?.slots ?? []).map((s: any) => s.player).filter(Boolean)]
                .filter((p: any, i: number, arr: any[]) => arr.findIndex((x) => x.id === p.id) === i)
                .filter((p: any) => eligible(swapSlot.slot, p.position))
                .sort((a: any, b: any) => b.model_pts - a.model_pts)
                .map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setSlot(swapSlot, p.id)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-white/[0.04]"
                  >
                    <PositionBadge position={p.position} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-100">{p.name}</span>
                      <span className="num block text-[11px] text-slate-500">
                        {p.nfl_team} {p.opponent ? `vs ${p.opponent}` : "· BYE"}
                      </span>
                    </span>
                    <span className="num text-[13px] font-semibold text-white">{fmt(p.model_pts)}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      <PlayerDetailModal playerId={detailId} leagueId={league.id} onClose={() => setDetailId(null)} onChanged={() => refresh(true)} />
    </div>
  );
}

function eligible(slot: string, position: string): boolean {
  const map: Record<string, string[]> = {
    QB: ["QB"],
    RB: ["RB"],
    WR: ["WR"],
    TE: ["TE"],
    K: ["K"],
    DEF: ["DEF"],
    FLEX: ["RB", "WR", "TE"],
    WRRB_FLEX: ["RB", "WR"],
    REC_FLEX: ["WR", "TE"],
    SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  };
  return (map[slot] ?? []).includes(position);
}
