"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import { api, useApp } from "@/components/data-provider";
import {
  Badge,
  Modal,
  Panel,
  SectionHeader,
  Skeleton,
  Slider,
  Toggle,
  fmt,
  timeAgo,
  useToast,
} from "@/components/ui";

export default function SettingsPage() {
  const { data, refresh } = useApp();
  const { push } = useToast();
  const snapshot = data?.snapshot;
  const league = snapshot?.league;
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [newLeagueOpen, setNewLeagueOpen] = useState(false);
  const [leagueDraft, setLeagueDraft] = useState<any>(null);

  // Fall back to the server-rendered settings until the user edits something,
  // so the page paints with real values instead of a skeleton.
  const form = draft ?? snapshot?.settings ?? null;

  useEffect(() => {
    setLeagueDraft(null);
  }, [league?.id]);

  const leagueForm =
    leagueDraft ??
    (league
      ? {
          name: league.name,
          current_week: league.current_week,
          playoff_teams: league.playoff_teams,
          scoring_type: league.scoring_type,
        }
      : null);
  const setLeagueForm = (patch: any) => setLeagueDraft(patch);

  if (!league || !form) return <Skeleton className="h-96" />;

  const update = (patch: any) => {
    setDraft({ ...form, ...patch });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: {
          leagueId: league.id,
          autonomous_mode: !!form.autonomous_mode,
          require_trade_approval: !!form.require_trade_approval,
          waiver_automation: !!form.waiver_automation,
          lineup_automation: !!form.lineup_automation,
          news_monitoring: !!form.news_monitoring,
          risk_tolerance: form.risk_tolerance,
          aggressiveness: form.aggressiveness,
          max_daily_transactions: form.max_daily_transactions,
          min_champ_improvement: form.min_champ_improvement,
          max_faab_pct: form.max_faab_pct,
          book_weight: form.book_weight,
          consensus_weight: form.consensus_weight,
          sleeper_weight: form.sleeper_weight,
          scan_interval_sec: form.scan_interval_sec,
          strategy: form.strategy,
          protectedPlayerIds: JSON.parse(form.protected_player_ids || "[]"),
        },
      });
      push({ tone: "success", title: "AI controls saved", body: "The next cycle runs with your new limits." });
      setDirty(false);
      setDraft(null);
      refresh(true);
    } catch (err: any) {
      push({ tone: "error", title: "Save failed", body: err.message });
    } finally {
      setSaving(false);
    }
  };

  const leagueAction = async (action: string) => {
    setBusy(action);
    try {
      if (action === "sync") {
        await api(`/api/leagues/${league.id}/sync`, { method: "POST", body: {} });
        push({ tone: "success", title: "League synced", body: "Rosters, injuries and the sportsbook feed were refreshed." });
      } else if (action === "advance") {
        const res = await api<{ league: any }>(`/api/leagues/${league.id}/advance`, { method: "POST", body: {} });
        push({ tone: "success", title: `Advanced to week ${res.league.current_week}` });
      } else if (action === "save-league") {
        await api(`/api/leagues/${league.id}`, { method: "PATCH", body: { ...leagueForm, current_week: Number(leagueForm.current_week), playoff_teams: Number(leagueForm.playoff_teams) } });
        push({ tone: "success", title: "League updated" });
      } else if (action === "delete") {
        if (!confirm(`Delete "${league.name}"? This removes its rosters, trades and AI history.`)) return;
        await api(`/api/leagues/${league.id}`, { method: "DELETE" });
        push({ tone: "info", title: "League deleted" });
        window.location.href = (data?.leagues?.length ?? 0) > 1 ? "/dashboard" : "/connect";
        return;
      }
      refresh(true);
    } catch (err: any) {
      push({ tone: "error", title: "Action failed", body: err.message });
    } finally {
      setBusy(null);
    }
  };

  const protectedIds: string[] = JSON.parse(form.protected_player_ids || "[]");
  const toggleProtected = (id: string) => {
    const next = protectedIds.includes(id) ? protectedIds.filter((x) => x !== id) : [...protectedIds, id];
    update({ protected_player_ids: JSON.stringify(next) });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <BrainCircuit size={22} className="text-turf-300" /> AI GM Settings
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Define how much autonomy the GM has, how much risk it can take, and how it weighs each projection source.
          </p>
        </div>
        <button onClick={save} disabled={saving || !dirty} className="btn-primary text-[13px]">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {dirty ? "Save changes" : "Saved"}
        </button>
      </div>

      {dirty ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-[12.5px] text-amber-200">
          <AlertTriangle size={14} /> You have unsaved changes to the autonomy controls.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <SectionHeader icon={Zap} title="Autonomy" subtitle="What the GM is allowed to do without asking" />
          <div className="space-y-2.5 p-4">
            <Toggle
              label="Autonomous mode"
              description="Master switch. When off, the GM only analyses and drafts recommendations."
              checked={!!form.autonomous_mode}
              onChange={(v) => update({ autonomous_mode: v })}
            />
            <Toggle
              label="Require trade approval"
              description="Offers are queued for you to approve instead of being sent straight to the rival GM."
              checked={!!form.require_trade_approval}
              onChange={(v) => update({ require_trade_approval: v })}
            />
            <Toggle
              label="Waiver automation"
              description="Submit FAAB claims automatically when a target clears your improvement threshold."
              checked={!!form.waiver_automation}
              onChange={(v) => update({ waiver_automation: v })}
            />
            <Toggle
              label="Lineup automation"
              description="Re-optimise starters every cycle as lines move and injury news lands."
              checked={!!form.lineup_automation}
              onChange={(v) => update({ lineup_automation: v })}
            />
            <Toggle
              label="News monitoring"
              description="Watch the wire for injuries, usage changes and depth-chart moves, and re-score instantly."
              checked={!!form.news_monitoring}
              onChange={(v) => update({ news_monitoring: v })}
            />
          </div>
        </Panel>

        <Panel>
          <SectionHeader icon={Shield} title="Risk & limits" subtitle="Hard guardrails the GM cannot cross" />
          <div className="space-y-2.5 p-4">
            <Slider
              label="Risk tolerance"
              value={form.risk_tolerance}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => update({ risk_tolerance: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              hint={`Blocks any trade with a risk score above ${Math.round(30 + form.risk_tolerance * 70)}/100 and sets the minimum acceptance probability.`}
            />
            <Slider
              label="Aggressiveness"
              value={form.aggressiveness}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => update({ aggressiveness: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              hint="Drives FAAB bid sizing and how hard the GM chases marginal upgrades."
            />
            <Slider
              label="Max transactions per day"
              value={form.max_daily_transactions}
              min={0}
              max={12}
              step={1}
              onChange={(v) => update({ max_daily_transactions: v })}
              hint="Combined cap on AI trade offers and waiver claims in a rolling 24 hours."
            />
            <Slider
              label="Minimum championship improvement"
              value={form.min_champ_improvement}
              min={0}
              max={5}
              step={0.05}
              onChange={(v) => update({ min_champ_improvement: v })}
              format={(v) => `${v.toFixed(2)}%`}
              hint="A move must raise simulated title probability by at least this much to be executed."
            />
            <Slider
              label="Max FAAB per claim"
              value={form.max_faab_pct}
              min={5}
              max={100}
              step={5}
              onChange={(v) => update({ max_faab_pct: v })}
              format={(v) => `${v}%`}
              hint="Share of remaining FAAB the GM may spend on any single claim."
            />
            <Slider
              label="Scan interval"
              value={form.scan_interval_sec}
              min={15}
              max={600}
              step={15}
              onChange={(v) => update({ scan_interval_sec: v })}
              format={(v) => `${v}s`}
              hint="How often the autonomous loop wakes up to re-price the market and act."
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <SectionHeader icon={Trophy} title="Projection weights" subtitle="How the model blends its sources" />
          <div className="space-y-2.5 p-4">
            <Slider
              label="Sportsbook (FanDuel props)"
              value={form.book_weight}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => update({ book_weight: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              hint="Primary signal: de-vigged prop lines converted to fantasy points."
            />
            <Slider
              label="Consensus rankings"
              value={form.consensus_weight}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => update({ consensus_weight: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider
              label="Sleeper platform projections"
              value={form.sleeper_weight}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => update({ sleeper_weight: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[11px] text-slate-400">
                Weights are normalised automatically. Current effective blend:{" "}
                <span className="num font-semibold text-turf-300">
                  {Math.round((form.book_weight / (form.book_weight + form.consensus_weight + form.sleeper_weight || 1)) * 100)}% book
                </span>
                {" · "}
                <span className="num font-semibold text-violet-300">
                  {Math.round((form.consensus_weight / (form.book_weight + form.consensus_weight + form.sleeper_weight || 1)) * 100)}% consensus
                </span>
                {" · "}
                <span className="num font-semibold text-sky-300">
                  {Math.round((form.sleeper_weight / (form.book_weight + form.consensus_weight + form.sleeper_weight || 1)) * 100)}% sleeper
                </span>
              </p>
            </div>
            <div>
              <label className="label">Strategy</label>
              <select className="input" value={form.strategy} onChange={(e) => update({ strategy: e.target.value })}>
                <option value="win_now" className="bg-ink-900">Win now — maximise this season's title odds</option>
                <option value="balanced" className="bg-ink-900">Balanced — value and win-now weighted evenly</option>
                <option value="upside" className="bg-ink-900">Upside — favour ceiling and volatility</option>
                <option value="floor" className="bg-ink-900">Floor — favour safe, high-snap-share assets</option>
              </select>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader icon={Shield} title="Untouchable players" subtitle="The GM will never trade or drop these" />
          <div className="scroll-thin max-h-[430px] overflow-y-auto divide-row">
            {(snapshot?.roster ?? []).map((p: any) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]">
                <input
                  type="checkbox"
                  className="accent-turf-500"
                  checked={protectedIds.includes(p.id)}
                  onChange={() => toggleProtected(p.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-slate-100">{p.name}</span>
                  <span className="num block text-[11px] text-slate-500">
                    {p.position} · {p.nfl_team} · value {fmt(p.value, 0)}
                  </span>
                </span>
                {protectedIds.includes(p.id) ? <Badge tone="green">protected</Badge> : null}
              </label>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionHeader
          icon={Database}
          title="League & connection"
          subtitle={`Sleeper ${league.source === "live" ? "live API" : "simulation feed"} · league id ${league.sleeper_league_id}`}
          right={
            <div className="flex flex-wrap gap-2">
              <button onClick={() => leagueAction("sync")} disabled={!!busy} className="btn-ghost !py-1.5 text-xs">
                {busy === "sync" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync now
              </button>
              <button onClick={() => leagueAction("advance")} disabled={!!busy} className="btn-ghost !py-1.5 text-xs">
                {busy === "advance" ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Simulate week
              </button>
              <button onClick={() => setNewLeagueOpen(true)} className="btn-ghost !py-1.5 text-xs">
                <Plus size={12} /> New league
              </button>
              <button onClick={() => leagueAction("delete")} disabled={!!busy} className="btn-danger !py-1.5 text-xs">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          }
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">League name</label>
            <input className="input" value={leagueForm?.name ?? ""} onChange={(e) => setLeagueForm({ ...leagueForm, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Current week</label>
            <input
              type="number"
              min={1}
              max={17}
              className="input"
              value={leagueForm?.current_week ?? 1}
              onChange={(e) => setLeagueForm({ ...leagueForm, current_week: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Playoff teams</label>
            <input
              type="number"
              min={2}
              max={8}
              className="input"
              value={leagueForm?.playoff_teams ?? 6}
              onChange={(e) => setLeagueForm({ ...leagueForm, playoff_teams: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Scoring</label>
            <select className="input" value={leagueForm?.scoring_type ?? "ppr"} onChange={(e) => setLeagueForm({ ...leagueForm, scoring_type: e.target.value })}>
              <option value="ppr" className="bg-ink-900">PPR</option>
              <option value="half_ppr" className="bg-ink-900">Half PPR</option>
              <option value="standard" className="bg-ink-900">Standard</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button onClick={() => leagueAction("save-league")} disabled={!!busy} className="btn-ghost text-xs">
              {busy === "save-league" ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save league settings
            </button>
          </div>
        </div>
        <div className="grid gap-px border-t border-white/[0.06] bg-white/[0.06] sm:grid-cols-3">
          <InfoTile label="Sleeper account" value={data?.account ? `@${data.account.username}` : "Not connected"} sub={data?.account?.source === "live" ? "live API" : "simulation feed"} />
          <InfoTile label="Last sync" value={league.synced_at ? timeAgo(league.synced_at) : "—"} sub={`week ${league.current_week} of ${league.regular_season_weeks}`} />
          <InfoTile label="Last AI cycle" value={form.last_run_at ? timeAgo(form.last_run_at) : "—"} sub={`every ${form.scan_interval_sec}s`} />
        </div>
      </Panel>

      <NewLeagueModal open={newLeagueOpen} onClose={() => setNewLeagueOpen(false)} onCreated={() => refresh(true)} />
    </div>
  );
}

function InfoTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-ink-950/40 p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="num mt-1.5 text-[14px] font-bold text-white">{value}</p>
      {sub ? <p className="num mt-0.5 text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  );
}

function NewLeagueModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState({ name: "", teamName: "Autonomous FC", totalRosters: 12, scoringType: "ppr", currentWeek: 7 });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api("/api/leagues", { method: "POST", body: form });
      push({ tone: "success", title: "League created", body: "Draft, schedule and six weeks of results were simulated." });
      onCreated();
      onClose();
    } catch (err: any) {
      push({ tone: "error", title: "Could not create league", body: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a new league"
      subtitle="Generates a complete mid-season league with rosters, records and a live prop feed."
      footer={
        <>
          <button onClick={onClose} className="btn-ghost text-xs">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !form.name} className="btn-primary text-xs">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create league
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">League name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The Expected Points Club" />
        </div>
        <div>
          <label className="label">Your team name</label>
          <input className="input" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} />
        </div>
        <div>
          <label className="label">Teams</label>
          <input type="number" min={8} max={14} className="input" value={form.totalRosters} onChange={(e) => setForm({ ...form, totalRosters: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">Scoring</label>
          <select className="input" value={form.scoringType} onChange={(e) => setForm({ ...form, scoringType: e.target.value })}>
            <option value="ppr" className="bg-ink-900">PPR</option>
            <option value="half_ppr" className="bg-ink-900">Half PPR</option>
            <option value="standard" className="bg-ink-900">Standard</option>
          </select>
        </div>
        <div>
          <label className="label">Start at week</label>
          <input type="number" min={1} max={14} className="input" value={form.currentWeek} onChange={(e) => setForm({ ...form, currentWeek: Number(e.target.value) })} />
        </div>
      </div>
    </Modal>
  );
}
