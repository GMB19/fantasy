"use client";

import { useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  Gauge,
  Newspaper,
  RefreshCw,
  Radar,
  Settings as SettingsIcon,
  Zap,
} from "lucide-react";
import { useApp, usePolling } from "@/components/data-provider";
import { Badge, EmptyState, Panel, SectionHeader, Skeleton, Stat, Tabs, cn, timeAgo } from "@/components/ui";

const FILTERS = [
  { id: "all", label: "Everything" },
  { id: "trade", label: "Trades" },
  { id: "waiver", label: "Waivers" },
  { id: "lineup", label: "Lineups" },
  { id: "news", label: "News" },
  { id: "cycle", label: "AI cycles" },
  { id: "roster", label: "Roster" },
];

const KIND_META: Record<string, { icon: any; tone: string }> = {
  trade: { icon: ArrowLeftRight, tone: "violet" },
  waiver: { icon: Radar, tone: "blue" },
  lineup: { icon: Gauge, tone: "green" },
  news: { icon: Newspaper, tone: "amber" },
  cycle: { icon: Zap, tone: "green" },
  sync: { icon: RefreshCw, tone: "slate" },
  settings: { icon: SettingsIcon, tone: "slate" },
};

function metaFor(kind: string) {
  const key = Object.keys(KIND_META).find((k) => kind.includes(k));
  return KIND_META[key ?? "settings"] ?? KIND_META.settings;
}

export default function ActivityLogPage() {
  const { data } = useApp();
  const league = data?.snapshot?.league;
  const [filter, setFilter] = useState("all");

  const { data: activityData, loading } = usePolling<{ activity: any[] }>(
    league ? `/api/activity?leagueId=${league.id}&kind=${filter}&limit=120` : null,
    7000,
    [filter, league?.id]
  );

  if (!league) return <Skeleton className="h-96" />;
  const entries = activityData?.activity ?? [];

  const counts = {
    ai: entries.filter((e) => e.actor === "ai").length,
    user: entries.filter((e) => e.actor === "user").length,
    league: entries.filter((e) => e.actor === "league").length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <Activity size={22} className="text-turf-300" /> Activity Log
        </h1>
        <p className="mt-1 text-[13px] text-slate-400">
          A full audit trail of everything the GM, you, and the rest of the league have done.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total events" value={entries.length} sub="most recent 120" icon={Activity} />
        <Stat label="AI actions" value={counts.ai} sub="autonomous" icon={Zap} />
        <Stat label="Your actions" value={counts.user} sub="manual overrides" icon={SettingsIcon} />
        <Stat label="League activity" value={counts.league} sub="rival transactions" icon={ArrowLeftRight} />
      </div>

      <Panel>
        <SectionHeader
          icon={Activity}
          title="Transaction & decision history"
          right={<Tabs tabs={FILTERS} active={filter} onChange={setFilter} />}
        />
        {loading && !entries.length ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : entries.length ? (
          <div className="relative px-4 py-2">
            <span className="absolute bottom-4 left-[30px] top-4 w-px bg-white/[0.07]" />
            {entries.map((e) => {
              const meta = metaFor(e.kind);
              const Icon = meta.icon;
              return (
                <div key={e.id} className="relative flex gap-3 py-2.5">
                  <span
                    className={cn(
                      "z-10 mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border",
                      meta.tone === "violet" && "border-violet-500/30 bg-violet-500/15 text-violet-300",
                      meta.tone === "blue" && "border-sky-500/30 bg-sky-500/15 text-sky-300",
                      meta.tone === "green" && "border-turf-500/30 bg-turf-500/15 text-turf-300",
                      meta.tone === "amber" && "border-amber-500/30 bg-amber-500/15 text-amber-300",
                      meta.tone === "slate" && "border-white/10 bg-ink-900 text-slate-400"
                    )}
                  >
                    <Icon size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12.5px] font-medium text-slate-100">{e.message}</p>
                      <Badge tone={e.actor === "ai" ? "green" : e.actor === "user" ? "blue" : "slate"}>{e.actor}</Badge>
                    </div>
                    {e.detail ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">{e.detail}</p> : null}
                    <p className="num mt-0.5 text-[10.5px] text-slate-500">
                      {timeAgo(e.created_at)} · {e.kind.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Activity} title="Nothing logged yet" body="Run an AI cycle and the audit trail will start filling up." />
        )}
      </Panel>
    </div>
  );
}
