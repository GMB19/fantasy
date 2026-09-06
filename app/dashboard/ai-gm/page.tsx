"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  CircleSlash,
  Gauge,
  Loader2,
  Pause,
  Play,
  PlayCircle,
  ShieldAlert,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { api, usePolling, useApp } from "@/components/data-provider";
import { DecisionCard } from "@/components/decision";
import { ChampProbChart } from "@/components/charts";
import {
  Badge,
  EmptyState,
  Panel,
  Progress,
  SectionHeader,
  Skeleton,
  Stat,
  Tabs,
  cn,
  fmt,
  pct,
  timeAgo,
  useToast,
} from "@/components/ui";

const TABS = [
  { id: "all", label: "All" },
  { id: "trade", label: "Trades" },
  { id: "waiver", label: "Waivers" },
  { id: "lineup", label: "Lineup" },
  { id: "news", label: "News" },
  { id: "settings", label: "Config" },
];

export default function AiGmPage() {
  const { data, refresh } = useApp();
  const { push } = useToast();
  const [tab, setTab] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const s = data?.snapshot;
  const league = s?.league;
  const settings = s?.settings;

  const { data: decisionData, loading, reload } = usePolling<{ decisions: any[] }>(
    league ? `/api/decisions?leagueId=${league.id}&type=${tab}&limit=60` : null,
    9000,
    [tab, league?.id]
  );

  const decisions = decisionData?.decisions ?? [];

  const stats = useMemo(() => {
    const all = decisions;
    return {
      executed: all.filter((d) => d.status === "executed").length,
      proposed: all.filter((d) => d.status === "proposed").length,
      blocked: all.filter((d) => d.status === "blocked" || d.status === "skipped").length,
      champGain: all.reduce((sum, d) => sum + (d.champ_delta ?? 0), 0),
    };
  }, [decisions]);

  const simSeries = (s?.simHistory ?? []).map((r: any) => ({
    label: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    champ: r.champ_prob,
    playoff: r.playoff_prob,
  }));

  const paused = !!(settings?.paused_until && settings.paused_until > Date.now());

  const act = async (kind: string) => {
    if (!league) return;
    setBusy(kind);
    try {
      if (kind === "cycle") {
        const res = await api<{ report: any }>("/api/ai/run", { method: "POST", body: { leagueId: league.id } });
        push({
          tone: "success",
          title: "Cycle complete",
          body: res.report
            ? `${res.report.tradesScanned} trades scanned · ${res.report.claimsSubmitted} claims · ${res.report.lineupChanges} lineup changes`
            : "Cycle finished",
        });
      } else if (kind === "pause") {
        await api("/api/ai/pause", { method: "POST", body: { leagueId: league.id, minutes: 60 } });
        push({ tone: "warn", title: "AI GM paused", body: "Autonomous actions are suspended for 60 minutes." });
      } else if (kind === "resume") {
        await api("/api/ai/pause", { method: "POST", body: { leagueId: league.id, resume: true } });
        push({ tone: "success", title: "AI GM resumed" });
      } else if (kind === "news") {
        const res = await api<{ news: any }>("/api/news/simulate", { method: "POST", body: { leagueId: league.id } });
        push({ tone: "info", title: "Breaking news injected", body: res.news?.headline ?? "News wire updated" });
      }
      await Promise.all([refresh(true), reload(true)]);
    } catch (err: any) {
      push({ tone: "error", title: "Action failed", body: err.message });
    } finally {
      setBusy(null);
    }
  };

  if (!s) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <BrainCircuit size={22} className="text-turf-300" /> AI General Manager
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Continuous scanning of the sportsbook feed, your roster, the waiver wire and all {s.teams.length} rosters —
            every action explained.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => act("news")} disabled={!!busy} className="btn-ghost text-[13px]">
            {busy === "news" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Inject news
          </button>
          {paused ? (
            <button onClick={() => act("resume")} disabled={!!busy} className="btn-ghost text-[13px]">
              {busy === "resume" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Resume
            </button>
          ) : (
            <button onClick={() => act("pause")} disabled={!!busy} className="btn-ghost text-[13px]">
              {busy === "pause" ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />} Pause 1h
            </button>
          )}
          <button onClick={() => act("cycle")} disabled={!!busy} className="btn-primary text-[13px]">
            {busy === "cycle" ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />} Run cycle
          </button>
        </div>
      </div>

      {/* Status band */}
      <Panel className="overflow-hidden">
        <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-ink-950/40 p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Engine state</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "live-dot h-2.5 w-2.5 rounded-full",
                  paused ? "bg-amber-400" : settings?.autonomous_mode ? "bg-turf-400" : "bg-slate-500"
                )}
              />
              <span className="text-[15px] font-bold text-white">
                {paused ? "Paused" : settings?.autonomous_mode ? "Autonomous" : "Manual approval"}
              </span>
            </div>
            <p className="num mt-1 text-[11px] text-slate-400">
              Scans every {settings?.scan_interval_sec}s · last {settings?.last_run_at ? timeAgo(settings.last_run_at) : "—"}
            </p>
          </div>
          <div className="bg-ink-950/40 p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Guardrails</p>
            <p className="mt-2 text-[15px] font-bold text-white">
              {settings?.max_daily_transactions} txn/day · {pct(settings?.min_champ_improvement, 2)} min gain
            </p>
            <p className="num mt-1 text-[11px] text-slate-400">
              Risk tolerance {Math.round((settings?.risk_tolerance ?? 0) * 100)}% · FAAB cap {settings?.max_faab_pct}%
            </p>
          </div>
          <div className="bg-ink-950/40 p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Projection blend</p>
            <div className="mt-2 space-y-1.5">
              {[
                ["Sportsbook", settings?.book_weight ?? 0, "bg-turf-500"],
                ["Consensus", settings?.consensus_weight ?? 0, "bg-violet-500"],
                ["Sleeper", settings?.sleeper_weight ?? 0, "bg-sky-500"],
              ].map(([label, w, color]: any) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-[74px] text-[11px] text-slate-400">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className={cn("h-full rounded-full", color)} style={{ width: `${w * 100}%` }} />
                  </div>
                  <span className="num w-9 text-right text-[11px] font-semibold text-slate-300">
                    {Math.round(w * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-ink-950/40 p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Objective</p>
            <p className="mt-2 text-[15px] font-bold text-turf-300">{pct(s.myTeam?.champ_prob)}</p>
            <p className="num mt-1 text-[11px] text-slate-400">
              Championship probability · playoff {pct(s.myTeam?.playoff_prob)}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Actions executed" value={stats.executed} sub="last 60 decisions" icon={Zap} />
        <Stat label="Awaiting you" value={s.pendingTrades + stats.proposed} sub="proposals & approvals" icon={ShieldAlert} />
        <Stat label="Blocked by limits" value={stats.blocked} sub="risk / threshold guards" icon={CircleSlash} />
        <Stat label="Modelled title gain" value={`${stats.champGain >= 0 ? "+" : ""}${fmt(stats.champGain, 2)}%`} sub="sum of decision deltas" icon={Trophy} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionHeader
            icon={Activity}
            title="Decision log"
            subtitle="Expand any entry for the full reasoning chain and inputs"
            right={<Tabs tabs={TABS} active={tab} onChange={setTab} />}
          />
          <div>
            {loading && !decisions.length ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : decisions.length ? (
              decisions.map((d) => <DecisionCard key={d.id} decision={d} />)
            ) : (
              <EmptyState
                icon={BrainCircuit}
                title="No decisions in this category yet"
                body="The GM logs everything it does — and everything it deliberately skipped — right here."
              />
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionHeader icon={Trophy} title="Objective function" subtitle="Championship probability over time" />
            <div className="p-3">
              {simSeries.length > 1 ? <ChampProbChart data={simSeries} height={180} /> : <EmptyState title="Building history" />}
            </div>
          </Panel>

          <Panel>
            <SectionHeader icon={Gauge} title="What the GM is watching" />
            <div className="space-y-3 p-4">
              {[
                { label: "Sportsbook prop feed", detail: "Lines + de-vigged probabilities for every rostered player", tone: "green", value: 100 },
                { label: "Injury & practice reports", detail: "Designations flow straight into lineup locks", tone: "amber", value: settings?.news_monitoring ? 100 : 0 },
                { label: "Waiver wire", detail: "Free agents re-ranked by lineup impact each cycle", tone: "blue", value: settings?.waiver_automation ? 100 : 35 },
                { label: "Rival rosters", detail: `${s.teams.length - 1} teams scanned for trade fits`, tone: "violet", value: settings?.autonomous_mode ? 100 : 40 },
                { label: "Season simulation", detail: "1,200 seasons + playoff brackets per cycle", tone: "green", value: 100 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[12.5px] font-medium text-slate-200">{row.label}</span>
                    <Badge tone={row.value >= 100 ? "green" : row.value > 0 ? "amber" : "slate"}>
                      {row.value >= 100 ? "active" : row.value > 0 ? "partial" : "off"}
                    </Badge>
                  </div>
                  <p className="mb-1.5 text-[11px] text-slate-500">{row.detail}</p>
                  <Progress value={row.value} tone={row.tone} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
