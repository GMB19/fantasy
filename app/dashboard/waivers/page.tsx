"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  DollarSign,
  Loader2,
  Radar,
  Search,
  Send,
  Trash2,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { api, useApp, usePolling } from "@/components/data-provider";
import { PlayerDetailModal, PlayerRow } from "@/components/player";
import {
  Badge,
  EmptyState,
  Modal,
  Panel,
  Progress,
  SectionHeader,
  Skeleton,
  Stat,
  Tabs,
  fmt,
  signed,
  timeAgo,
  useToast,
  PositionBadge,
} from "@/components/ui";

const CLAIM_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export default function WaiverWirePage() {
  const { data, refresh } = useApp();
  const { push } = useToast();
  const league = data?.snapshot?.league;

  const [tab, setTab] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [targets, setTargets] = useState<any[] | null>(null);
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [claimFor, setClaimFor] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: waiverData, loading, reload } = usePolling<{ claims: any[]; freeAgents: any[]; faab: any }>(
    league ? `/api/waivers?leagueId=${league.id}&status=${tab}` : null,
    7000,
    [tab, league?.id]
  );

  const claims = waiverData?.claims ?? [];
  const faab = waiverData?.faab;
  const freeAgents = (waiverData?.freeAgents ?? []).filter((p) =>
    search ? p.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  const scan = async () => {
    if (!league) return;
    setScanning(true);
    try {
      const res = await api<{ targets: any[] }>("/api/waivers/scan", { method: "POST", body: { leagueId: league.id } });
      setTargets(res.targets);
      push({
        tone: "success",
        title: `${res.targets.length} waiver targets`,
        body: res.targets[0] ? `Top add: ${res.targets[0].player.name} (+${fmt(res.targets[0].ppgDelta, 2)} PPG)` : "No adds improve your lineup.",
      });
    } catch (err: any) {
      push({ tone: "error", title: "Scan failed", body: err.message });
    } finally {
      setScanning(false);
    }
  };

  const claimAction = async (claimId: string, action: string) => {
    setBusy(claimId + action);
    try {
      if (action === "delete") await api(`/api/waivers/claims/${claimId}`, { method: "DELETE" });
      else await api(`/api/waivers/claims/${claimId}`, { method: "PATCH", body: { action } });
      push({ tone: "info", title: action === "process_now" ? "Claim processed" : "Claim updated" });
      await Promise.all([reload(true), refresh(true)]);
    } catch (err: any) {
      push({ tone: "error", title: "Action failed", body: err.message });
    } finally {
      setBusy(null);
    }
  };

  if (!league) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Radar size={22} className="text-turf-300" /> Waiver Wire
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Free agents ranked by the points they add to your optimal lineup, with FAAB priced against modelled rival bids.
          </p>
        </div>
        <button onClick={scan} disabled={scanning} className="btn-primary text-[13px]">
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}
          {scanning ? "Scanning wire…" : "Scan waivers"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="FAAB remaining" value={`$${faab?.left ?? 0}`} sub={`of $${faab?.budget ?? 100}`} icon={DollarSign} />
        <Stat label="Pending claims" value={claims.filter((c) => c.status === "pending").length} sub="processing soon" icon={Clock} />
        <Stat label="Claims won" value={claims.filter((c) => c.status === "won").length} sub="this season" icon={Trophy} />
        <Stat label="Free agents" value={waiverData?.freeAgents?.length ?? 0} sub="available now" icon={Zap} />
      </div>

      {faab ? (
        <Panel className="p-4">
          <div className="mb-2 flex items-center justify-between text-[11.5px]">
            <span className="font-semibold text-slate-300">FAAB budget used</span>
            <span className="num text-slate-400">
              ${faab.spent} spent · ${faab.left} left
            </span>
          </div>
          <Progress value={(faab.spent / Math.max(1, faab.budget)) * 100} tone="blue" />
        </Panel>
      ) : null}

      {targets ? (
        <Panel>
          <SectionHeader
            icon={TrendingUp}
            title="AI waiver board"
            subtitle="Ranked by championship impact then lineup points added"
            right={
              <button onClick={() => setTargets(null)} className="btn-ghost !py-1.5 text-xs">
                Clear
              </button>
            }
          />
          {targets.length ? (
            <div className="divide-row">
              {targets.map((t, i) => (
                <div key={i} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="num mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[12px] font-bold text-slate-300">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <PositionBadge position={t.player.position} />
                          <span className="text-[13.5px] font-semibold text-white">{t.player.name}</span>
                          <span className="num text-[11px] text-slate-500">{t.player.nfl_team}</span>
                          {t.player.injury_status ? <Badge tone="amber">{t.player.injury_status}</Badge> : null}
                        </div>
                        <p className="num mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-slate-400">
                          <span className="text-turf-300">+{fmt(t.ppgDelta, 2)} PPG</span>
                          <span className={t.champDelta >= 0 ? "text-turf-300" : "text-red-300"}>
                            {signed(t.champDelta)}% title odds
                          </span>
                          <span>bid ${t.bid} (max ${t.maxBid})</span>
                          <span>competition {t.competitionRisk}/100</span>
                          {t.dropPlayer ? <span className="text-red-300">drop {t.dropPlayer.name}</span> : null}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setClaimFor({ player: t.player, drop: t.dropPlayer, bid: t.bid })}
                      className="btn-primary !py-1.5 text-xs"
                    >
                      <Send size={12} /> Claim ${t.bid}
                    </button>
                  </div>
                  <details className="group mt-2.5 pl-10">
                    <summary className="cursor-pointer list-none text-[11.5px] font-semibold text-turf-300 hover:text-turf-200">
                      Why the AI wants this add →
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {t.rationale.map((r: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-[12px] leading-relaxed text-slate-300">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-turf-400" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Radar} title="No adds improve your lineup" body="Your roster is currently stronger than every available free agent." />
          )}
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <SectionHeader
            icon={Clock}
            title="Claim queue"
            subtitle="AI and manual claims, with outcomes"
            right={<Tabs tabs={CLAIM_TABS} active={tab} onChange={setTab} />}
          />
          {loading && !claims.length ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : claims.length ? (
            <div className="divide-row">
              {claims.map((c) => (
                <div key={c.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-white">{c.headline}</span>
                        <Badge
                          tone={
                            c.status === "won" ? "green" : c.status === "pending" ? "amber" : c.status === "lost" ? "red" : "slate"
                          }
                        >
                          {c.status}
                        </Badge>
                        <Badge tone={c.origin === "ai" ? "violet" : "slate"}>{c.origin === "ai" ? "AI" : "manual"}</Badge>
                      </div>
                      <p className="num mt-1 flex flex-wrap gap-x-4 text-[11.5px] text-slate-400">
                        <span>${c.bid} FAAB</span>
                        <span className="text-turf-300">+{fmt(c.ppg_delta, 2)} PPG</span>
                        <span>{signed(c.champ_delta)}% title odds</span>
                        <span>{c.status === "pending" ? `processes ${timeAgo(c.process_at)}`.replace("ago", "") : timeAgo(c.created_at)}</span>
                      </p>
                      {c.result_note ? <p className="mt-1 text-[11.5px] text-slate-400">{c.result_note}</p> : null}
                    </div>
                    <div className="flex gap-1.5">
                      {c.status === "pending" ? (
                        <>
                          <button onClick={() => claimAction(c.id, "process_now")} disabled={!!busy} className="btn-ghost !py-1.5 text-xs">
                            {busy === c.id + "process_now" ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Process
                          </button>
                          <button onClick={() => claimAction(c.id, "cancel")} disabled={!!busy} className="btn-ghost !py-1.5 text-xs">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={() => claimAction(c.id, "delete")} disabled={!!busy} className="btn-ghost !py-1.5 text-xs">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  {c.rationale?.length ? (
                    <details className="group mt-2">
                      <summary className="cursor-pointer list-none text-[11.5px] font-semibold text-turf-300">Reasoning →</summary>
                      <ul className="mt-2 space-y-1.5">
                        {c.rationale.map((r: string, i: number) => (
                          <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-slate-300">
                            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-turf-400" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Clock} title="No claims yet" body="The AI submits claims automatically when waiver automation is on." />
          )}
        </Panel>

        <Panel>
          <SectionHeader
            icon={Search}
            title="Available players"
            subtitle="Every unrostered player, live projections"
            right={
              <input
                className="input !w-44 !py-1.5 text-xs"
                placeholder="Search players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            }
          />
          <div className="scroll-thin max-h-[620px] overflow-y-auto divide-row">
            {freeAgents.length ? (
              freeAgents.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  onClick={() => setDetailId(p.id)}
                  right={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setClaimFor({ player: p, drop: null, bid: 1 });
                      }}
                      className="btn-ghost !px-2 !py-1 text-[11px]"
                    >
                      Claim
                    </button>
                  }
                />
              ))
            ) : (
              <EmptyState icon={Search} title="No matching free agents" />
            )}
          </div>
        </Panel>
      </div>

      <ClaimModal
        target={claimFor}
        leagueId={league.id}
        roster={data?.snapshot?.roster ?? []}
        onClose={() => setClaimFor(null)}
        onDone={() => Promise.all([reload(true), refresh(true)])}
      />

      <PlayerDetailModal playerId={detailId} leagueId={league.id} onClose={() => setDetailId(null)} onChanged={() => refresh(true)} />
    </div>
  );
}

function ClaimModal({
  target,
  leagueId,
  roster,
  onClose,
  onDone,
}: {
  target: any;
  leagueId: string;
  roster: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { push } = useToast();
  const [bid, setBid] = useState(1);
  const [dropId, setDropId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const open = !!target;
  const player = target?.player;

  useEffect(() => {
    if (target) {
      setBid(target.bid ?? 1);
      setDropId(target.drop?.id ?? "");
    }
  }, [target]);

  const submit = async () => {
    setSaving(true);
    try {
      await api("/api/waivers", {
        method: "POST",
        body: { leagueId, addPlayerId: player.id, dropPlayerId: dropId || target?.drop?.id || null, bid },
      });
      push({ tone: "success", title: "Claim submitted", body: `$${bid} on ${player.name}` });
      onDone();
      onClose();
    } catch (err: any) {
      push({ tone: "error", title: "Claim failed", body: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={player ? `Claim ${player.name}` : "Claim player"}
      subtitle="Your bid is processed against modelled rival demand in ~2 minutes."
      footer={
        <>
          <button onClick={onClose} className="btn-ghost text-xs">
            Cancel
          </button>
          <button onClick={submit} disabled={saving} className="btn-primary text-xs">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Submit claim
          </button>
        </>
      }
    >
      {player ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <PositionBadge position={player.position} />
            <div>
              <p className="text-[13px] font-semibold text-white">{player.name}</p>
              <p className="num text-[11px] text-slate-400">
                {player.nfl_team} · snap {fmt(player.snap_pct, 0)}% · {fmt(player.targets_pg, 1)} tgt/gm
              </p>
            </div>
          </div>
          <div>
            <label className="label">FAAB bid ($)</label>
            <input type="number" min={0} className="input" value={bid} onChange={(e) => setBid(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Drop player (optional)</label>
            <select className="input" value={dropId || target?.drop?.id || ""} onChange={(e) => setDropId(e.target.value)}>
              <option value="">No drop</option>
              {roster.map((p: any) => (
                <option key={p.id} value={p.id} className="bg-ink-900">
                  {p.name} ({p.position}) · {fmt(p.model_pts)} proj
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
