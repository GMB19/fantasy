"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  Handshake,
  Loader2,
  Plus,
  Radar,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { api, useApp, usePolling } from "@/components/data-provider";
import { PlayerDetailModal } from "@/components/player";
import {
  Badge,
  EmptyState,
  Modal,
  Panel,
  SectionHeader,
  Skeleton,
  Stat,
  Tabs,
  cn,
  fmt,
  pct,
  signed,
  timeAgo,
  useToast,
  PositionBadge,
} from "@/components/ui";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending_approval", label: "Needs approval" },
  { id: "proposed", label: "Live offers" },
  { id: "accepted", label: "Completed" },
  { id: "rejected", label: "Declined" },
];

export default function TradeFinderPage() {
  const { data, refresh } = useApp();
  const { push } = useToast();
  const league = data?.snapshot?.league;
  const myTeamId = data?.snapshot?.myTeam?.id;

  const [tab, setTab] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<any[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: tradeData, loading, reload } = usePolling<{ trades: any[]; teams: any[]; myTeamId: string }>(
    league ? `/api/trades?leagueId=${league.id}&status=${tab}` : null,
    8000,
    [tab, league?.id]
  );

  const trades = tradeData?.trades ?? [];
  const teams = tradeData?.teams ?? [];

  const counts = useMemo(() => {
    const all = tradeData?.trades ?? [];
    return {
      pending: all.filter((t) => t.status === "pending_approval").length,
      live: all.filter((t) => t.status === "proposed").length,
      done: all.filter((t) => t.status === "accepted").length,
    };
  }, [tradeData]);

  const scan = async () => {
    if (!league) return;
    setScanning(true);
    try {
      const res = await api<{ candidates: any[] }>("/api/trades/scan", {
        method: "POST",
        body: { leagueId: league.id },
      });
      setCandidates(res.candidates);
      push({
        tone: "success",
        title: `${res.candidates.length} trade constructions found`,
        body: res.candidates[0]
          ? `Best: ${res.candidates[0].headline} (${signed(res.candidates[0].champDelta)}% title odds)`
          : "No package cleared the acceptance floor — try lowering risk tolerance.",
      });
    } catch (err: any) {
      push({ tone: "error", title: "Scan failed", body: err.message });
    } finally {
      setScanning(false);
    }
  };

  const act = async (tradeId: string, action: string) => {
    setBusyId(tradeId + action);
    try {
      if (action === "delete") await api(`/api/trades/${tradeId}`, { method: "DELETE" });
      else await api(`/api/trades/${tradeId}`, { method: "PATCH", body: { action } });
      push({
        tone: action === "reject" || action === "cancel" || action === "delete" ? "info" : "success",
        title:
          action === "approve"
            ? "Offer sent"
            : action === "force_accept"
              ? "Trade executed"
              : action === "delete"
                ? "Offer deleted"
                : "Offer cancelled",
      });
      await Promise.all([reload(true), refresh(true)]);
    } catch (err: any) {
      push({ tone: "error", title: "Action failed", body: err.message });
    } finally {
      setBusyId(null);
    }
  };

  if (!league) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <ArrowLeftRight size={22} className="text-turf-300" /> Trade Finder
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Every rival roster is scanned for packages that raise your title odds while still looking good to the other GM.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setBuilderOpen(true)} className="btn-ghost text-[13px]">
            <Plus size={14} /> Build offer
          </button>
          <button onClick={scan} disabled={scanning} className="btn-primary text-[13px]">
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}
            {scanning ? "Scanning rosters…" : "Scan league"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Awaiting approval" value={counts.pending} sub="AI-built offers" icon={Handshake} />
        <Stat label="Live offers" value={counts.live} sub="with rival GMs" icon={Send} />
        <Stat label="Completed" value={counts.done} sub="this season" icon={CheckCircle2} />
        <Stat label="Championship odds" value={pct(data?.snapshot?.myTeam?.champ_prob)} sub="current" icon={Trophy} />
      </div>

      {/* Scan results */}
      {candidates ? (
        <Panel>
          <SectionHeader
            icon={Sparkles}
            title="Scan results"
            subtitle="Ranked by championship-probability impact, filtered by your risk limits"
            right={
              <button onClick={() => setCandidates(null)} className="btn-ghost !py-1.5 text-xs">
                <X size={12} /> Clear
              </button>
            }
          />
          {candidates.length ? (
            <div className="divide-row">
              {candidates.map((c, i) => (
                <CandidateRow key={i} candidate={c} leagueId={league.id} onSaved={() => Promise.all([reload(true), refresh(true)])} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Radar}
              title="No qualifying trades right now"
              body="No package cleared both the acceptance-probability floor and your risk ceiling. Raise risk tolerance or lower the minimum championship gain in AI Settings."
            />
          )}
        </Panel>
      ) : null}

      <Panel>
        <SectionHeader
          icon={ArrowLeftRight}
          title="Trade book"
          subtitle="Offers built by the AI, sent by you, and their outcomes"
          right={<Tabs tabs={STATUS_TABS} active={tab} onChange={setTab} />}
        />
        {loading && !trades.length ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : trades.length ? (
          <div className="divide-row">
            {trades.map((t) => (
              <TradeCard
                key={t.id}
                trade={t}
                myTeamId={myTeamId}
                busyId={busyId}
                onAct={act}
                onPlayer={setDetailId}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ArrowLeftRight}
            title="No trades in this view"
            body="Run a league scan to have the AI construct offers, or build one manually."
            action={
              <button onClick={scan} className="btn-primary text-[13px]">
                <Radar size={14} /> Scan league
              </button>
            }
          />
        )}
      </Panel>

      <TradeBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        leagueId={league.id}
        teams={teams}
        myTeamId={myTeamId}
        onCreated={() => Promise.all([reload(true), refresh(true)])}
      />

      <PlayerDetailModal playerId={detailId} leagueId={league.id} onClose={() => setDetailId(null)} onChanged={() => refresh(true)} />
    </div>
  );
}

function CandidateRow({
  candidate,
  leagueId,
  onSaved,
}: {
  candidate: any;
  leagueId: string;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const send = async (autoSend: boolean) => {
    setSaving(autoSend ? "send" : "draft");
    try {
      await api("/api/trades", {
        method: "POST",
        body: {
          leagueId,
          partnerTeamId: candidate.partnerTeamId,
          sendPlayerIds: candidate.send.map((p: any) => p.id),
          receivePlayerIds: candidate.receive.map((p: any) => p.id),
          autoSend,
        },
      });
      push({ tone: "success", title: autoSend ? "Offer sent" : "Offer queued for approval" });
      onSaved();
    } catch (err: any) {
      push({ tone: "error", title: "Could not create offer", body: err.message });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-white">{candidate.headline}</p>
          <p className="mt-0.5 text-[11.5px] text-slate-400">
            with {candidate.partnerName} · {Math.round(candidate.acceptanceProb * 100)}% modelled acceptance
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => send(false)} disabled={!!saving} className="btn-ghost !py-1.5 text-xs">
            {saving === "draft" ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Queue
          </button>
          <button onClick={() => send(true)} disabled={!!saving} className="btn-primary !py-1.5 text-xs">
            {saving === "send" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send now
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SideList label="You send" players={candidate.send} tone="red" />
        <SideList label="You receive" players={candidate.receive} tone="green" />
      </div>

      <div className="num mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px]">
        <Metric label="PPG" value={signed(candidate.myPpgDelta)} good={candidate.myPpgDelta > 0} />
        <Metric label="Title odds" value={`${signed(candidate.champDelta)}%`} good={candidate.champDelta > 0} />
        <Metric label="Playoff odds" value={`${signed(candidate.playoffDelta)}%`} good={candidate.playoffDelta > 0} />
        <Metric label="Value" value={signed(candidate.myValueDelta, 1)} good={candidate.myValueDelta > 0} />
        <Metric label="Risk" value={`${candidate.riskScore}/100`} good={candidate.riskScore < 45} />
        <Metric label="Confidence" value={`${Math.round(candidate.confidence * 100)}%`} good={candidate.confidence > 0.6} />
      </div>

      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-[11.5px] font-semibold text-turf-300 hover:text-turf-200">
          Why this trade →
        </summary>
        <ul className="mt-2 space-y-1.5">
          {candidate.rationale.map((r: string, i: number) => (
            <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-slate-300">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-turf-400" />
              {r}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <span>
      <span className="text-slate-500">{label} </span>
      <span className={cn("font-semibold", good ? "text-turf-300" : "text-slate-300")}>{value}</span>
    </span>
  );
}

function SideList({ label, players, tone }: { label: string; players: any[]; tone: "red" | "green" }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        tone === "green" ? "border-turf-500/20 bg-turf-500/[0.05]" : "border-red-500/20 bg-red-500/[0.04]"
      )}
    >
      <p className={cn("mb-2 text-[10px] font-semibold uppercase tracking-wider", tone === "green" ? "text-turf-300" : "text-red-300")}>
        {label}
      </p>
      <div className="space-y-1.5">
        {players.map((p: any) => (
          <div key={p.id} className="flex items-center gap-2">
            <PositionBadge position={p.position} />
            <span className="truncate text-[12.5px] font-medium text-slate-100">{p.name}</span>
            <span className="num ml-auto text-[11px] text-slate-500">{p.nfl_team}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeCard({
  trade,
  myTeamId,
  busyId,
  onAct,
  onPlayer,
}: {
  trade: any;
  myTeamId?: string;
  busyId: string | null;
  onAct: (id: string, action: string) => void;
  onPlayer: (id: string) => void;
}) {
  const statusTone: Record<string, string> = {
    pending_approval: "amber",
    proposed: "blue",
    accepted: "green",
    rejected: "red",
    cancelled: "slate",
    expired: "slate",
    draft: "slate",
  };
  const isMine = trade.from_team_id === myTeamId;

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13.5px] font-semibold text-white">{trade.headline}</p>
            <Badge tone={statusTone[trade.status] ?? "slate"}>{trade.status.replace("_", " ")}</Badge>
            <Badge tone={trade.origin === "ai" ? "violet" : "slate"}>{trade.origin === "ai" ? "AI built" : "manual"}</Badge>
          </div>
          <p className="num mt-0.5 text-[11.5px] text-slate-400">
            {isMine ? "to" : "from"} {isMine ? trade.toTeam?.name : trade.fromTeam?.name} · {timeAgo(trade.created_at)} ·{" "}
            {Math.round((trade.acceptance_prob ?? 0) * 100)}% modelled acceptance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {trade.status === "pending_approval" ? (
            <>
              <button onClick={() => onAct(trade.id, "approve")} disabled={!!busyId} className="btn-primary !py-1.5 text-xs">
                {busyId === trade.id + "approve" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Approve & send
              </button>
              <button onClick={() => onAct(trade.id, "reject")} disabled={!!busyId} className="btn-ghost !py-1.5 text-xs">
                <Ban size={12} /> Reject
              </button>
            </>
          ) : null}
          {trade.status === "proposed" ? (
            <>
              <button onClick={() => onAct(trade.id, "force_accept")} disabled={!!busyId} className="btn-ghost !py-1.5 text-xs">
                {busyId === trade.id + "force_accept" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Force accept
              </button>
              <button onClick={() => onAct(trade.id, "cancel")} disabled={!!busyId} className="btn-ghost !py-1.5 text-xs">
                <X size={12} /> Withdraw
              </button>
            </>
          ) : null}
          {["rejected", "cancelled", "expired", "accepted", "draft"].includes(trade.status) ? (
            <button onClick={() => onAct(trade.id, "delete")} disabled={!!busyId} className="btn-ghost !py-1.5 text-xs">
              <Trash2 size={12} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-300">You send</p>
          <div className="space-y-1.5">
            {trade.send.map((p: any) => (
              <button key={p.id} onClick={() => onPlayer(p.id)} className="flex w-full items-center gap-2 text-left hover:opacity-80">
                <PositionBadge position={p.position} />
                <span className="truncate text-[12.5px] font-medium text-slate-100">{p.name}</span>
                <span className="num ml-auto text-[11px] text-slate-400">{fmt(p.model_pts)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-turf-500/20 bg-turf-500/[0.05] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-turf-300">You receive</p>
          <div className="space-y-1.5">
            {trade.receive.map((p: any) => (
              <button key={p.id} onClick={() => onPlayer(p.id)} className="flex w-full items-center gap-2 text-left hover:opacity-80">
                <PositionBadge position={p.position} />
                <span className="truncate text-[12.5px] font-medium text-slate-100">{p.name}</span>
                <span className="num ml-auto text-[11px] text-slate-400">{fmt(p.model_pts)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="num mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px]">
        <Metric label="PPG" value={signed(trade.ppg_delta)} good={trade.ppg_delta > 0} />
        <Metric label="Title odds" value={`${signed(trade.champ_delta)}%`} good={trade.champ_delta > 0} />
        <Metric label="Value" value={signed(trade.value_delta, 1)} good={trade.value_delta > 0} />
        <Metric label="Risk" value={`${Math.round(trade.risk_score)}/100`} good={trade.risk_score < 45} />
      </div>

      {trade.response_note ? (
        <p className="mt-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[12px] italic text-slate-300">
          {trade.response_note}
        </p>
      ) : null}

      {trade.rationale?.length ? (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-[11.5px] font-semibold text-turf-300 hover:text-turf-200">
            AI reasoning →
          </summary>
          <ul className="mt-2 space-y-1.5">
            {trade.rationale.map((r: string, i: number) => (
              <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-slate-300">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-turf-400" />
                {r}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function TradeBuilder({
  open,
  onClose,
  leagueId,
  teams,
  myTeamId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  leagueId: string;
  teams: any[];
  myTeamId?: string;
  onCreated: () => void;
}) {
  const { push } = useToast();
  const [partnerId, setPartnerId] = useState<string>("");
  const [send, setSend] = useState<string[]>([]);
  const [receive, setReceive] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: myRoster } = usePolling<{ team: any; roster: any[] }>(
    open && myTeamId ? `/api/teams?leagueId=${leagueId}&teamId=${myTeamId}` : null,
    0,
    [open, myTeamId]
  );
  const { data: theirRoster } = usePolling<{ team: any; roster: any[] }>(
    open && partnerId ? `/api/teams?leagueId=${leagueId}&teamId=${partnerId}` : null,
    0,
    [open, partnerId]
  );

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const submit = async (autoSend: boolean) => {
    setSaving(true);
    try {
      await api("/api/trades", {
        method: "POST",
        body: { leagueId, partnerTeamId: partnerId, sendPlayerIds: send, receivePlayerIds: receive, autoSend },
      });
      push({ tone: "success", title: autoSend ? "Offer sent" : "Offer queued" });
      setSend([]);
      setReceive([]);
      onCreated();
      onClose();
    } catch (err: any) {
      push({ tone: "error", title: "Could not create offer", body: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Build a trade offer"
      subtitle="Pick a partner, choose both sides, and the model will score it before it goes out."
      footer={
        <>
          <button onClick={onClose} className="btn-ghost text-xs">
            Cancel
          </button>
          <button
            onClick={() => submit(false)}
            disabled={saving || !partnerId || !send.length || !receive.length}
            className="btn-ghost text-xs"
          >
            Queue for approval
          </button>
          <button
            onClick={() => submit(true)}
            disabled={saving || !partnerId || !send.length || !receive.length}
            className="btn-primary text-xs"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send offer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Trade partner</label>
          <select className="input" value={partnerId} onChange={(e) => { setPartnerId(e.target.value); setReceive([]); }}>
            <option value="">Select a team…</option>
            {teams
              .filter((t) => t.id !== myTeamId)
              .map((t) => (
                <option key={t.id} value={t.id} className="bg-ink-900">
                  {t.name} ({t.wins}-{t.losses}) · {t.owner_name}
                </option>
              ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <RosterPicker
            title="You send"
            tone="red"
            players={myRoster?.roster ?? []}
            selected={send}
            onToggle={(id) => toggle(send, setSend, id)}
          />
          <RosterPicker
            title="You receive"
            tone="green"
            players={theirRoster?.roster ?? []}
            selected={receive}
            onToggle={(id) => toggle(receive, setReceive, id)}
            emptyHint={partnerId ? "Loading roster…" : "Select a partner first"}
          />
        </div>
      </div>
    </Modal>
  );
}

function RosterPicker({
  title,
  tone,
  players,
  selected,
  onToggle,
  emptyHint,
}: {
  title: string;
  tone: "red" | "green";
  players: any[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyHint?: string;
}) {
  return (
    <div className={cn("rounded-xl border", tone === "green" ? "border-turf-500/20" : "border-red-500/20")}>
      <p
        className={cn(
          "border-b px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider",
          tone === "green" ? "border-turf-500/20 text-turf-300" : "border-red-500/20 text-red-300"
        )}
      >
        {title} ({selected.length})
      </p>
      <div className="scroll-thin max-h-72 overflow-y-auto">
        {players.length ? (
          players.map((p) => (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left transition",
                selected.includes(p.id) ? "bg-white/[0.07]" : "hover:bg-white/[0.03]"
              )}
            >
              <input type="checkbox" readOnly checked={selected.includes(p.id)} className="accent-turf-500" />
              <PositionBadge position={p.position} />
              <span className="truncate text-[12.5px] text-slate-100">{p.name}</span>
              <span className="num ml-auto shrink-0 text-[11px] text-slate-400">{fmt(p.model_pts)}</span>
            </button>
          ))
        ) : (
          <p className="px-3 py-6 text-center text-[12px] text-slate-500">{emptyHint ?? "No players"}</p>
        )}
      </div>
    </div>
  );
}
