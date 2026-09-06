"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  BrainCircuit,
  ChevronDown,
  Gauge,
  Newspaper,
  Radar,
  Settings as SettingsIcon,
  CalendarClock,
} from "lucide-react";
import { Badge, cn, signed, timeAgo } from "./ui";

const TYPE_META: Record<string, { icon: any; tone: string; label: string }> = {
  trade: { icon: ArrowLeftRight, tone: "violet", label: "Trade" },
  waiver: { icon: Radar, tone: "blue", label: "Waiver" },
  lineup: { icon: Gauge, tone: "green", label: "Lineup" },
  news: { icon: Newspaper, tone: "amber", label: "News" },
  settings: { icon: SettingsIcon, tone: "slate", label: "Config" },
  season: { icon: CalendarClock, tone: "slate", label: "Season" },
};

const STATUS_TONE: Record<string, string> = {
  executed: "green",
  proposed: "blue",
  skipped: "slate",
  blocked: "red",
  monitored: "amber",
};

export function DecisionCard({ decision, defaultOpen }: { decision: any; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const meta = TYPE_META[decision.type] ?? TYPE_META.settings;
  const Icon = meta.icon;
  const rationale: string[] = Array.isArray(decision.rationale) ? decision.rationale : [];

  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]">
        <span
          className={cn(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border",
            meta.tone === "violet" && "border-violet-500/25 bg-violet-500/10 text-violet-300",
            meta.tone === "blue" && "border-sky-500/25 bg-sky-500/10 text-sky-300",
            meta.tone === "green" && "border-turf-500/25 bg-turf-500/10 text-turf-300",
            meta.tone === "amber" && "border-amber-500/25 bg-amber-500/10 text-amber-300",
            meta.tone === "slate" && "border-white/10 bg-white/[0.05] text-slate-300"
          )}
        >
          <Icon size={15} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold text-slate-100">{decision.title}</span>
            <Badge tone={STATUS_TONE[decision.status] ?? "slate"}>{decision.status}</Badge>
          </span>
          <span className="mt-1 block text-[12px] leading-relaxed text-slate-400">{decision.summary}</span>
          <span className="num mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span>{timeAgo(decision.created_at)}</span>
            {decision.ppg_delta ? (
              <span className={decision.ppg_delta > 0 ? "text-turf-400" : "text-red-400"}>
                {signed(decision.ppg_delta)} PPG
              </span>
            ) : null}
            {decision.champ_delta ? (
              <span className={decision.champ_delta > 0 ? "text-turf-400" : "text-red-400"}>
                {signed(decision.champ_delta)}% title odds
              </span>
            ) : null}
            {decision.confidence ? <span>{Math.round(decision.confidence * 100)}% confidence</span> : null}
          </span>
        </span>

        <ChevronDown size={15} className={cn("mt-1 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="animate-fade-in space-y-2 px-4 pb-4 pl-[60px]">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-turf-300">
            <BrainCircuit size={12} /> Why the AI decided this
          </p>
          {rationale.length ? (
            <ul className="space-y-1.5">
              {rationale.map((r, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-slate-300">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-turf-400" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-slate-500">No additional rationale recorded.</p>
          )}
          {decision.inputs && Object.keys(decision.inputs).length ? (
            <div className="mt-2 rounded-lg border border-white/[0.07] bg-black/20 p-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Decision inputs</p>
              <div className="num flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                {Object.entries(decision.inputs).map(([k, v]) => (
                  <span key={k}>
                    <span className="text-slate-500">{k.replace(/_/g, " ")}:</span>{" "}
                    {Array.isArray(v) ? v.join(", ") : String(v)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
