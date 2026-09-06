"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { stroke: "rgba(148,163,184,0.35)", fontSize: 10 };
const GRID = "rgba(148,163,184,0.10)";

function TipBox({ active, payload, label, suffix = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900/95 px-3 py-2 shadow-xl backdrop-blur">
      {label !== undefined ? <p className="mb-1 text-[11px] font-semibold text-slate-300">{label}</p> : null}
      {payload.map((p: any) => (
        <p key={p.dataKey} className="num text-[11px]" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}

export function ChampProbChart({
  data,
  height = 190,
}: {
  data: { label: string; champ: number; playoff: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="gChamp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00cf72" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#00cf72" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gPlayoff" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={38} unit="%" />
        <Tooltip content={<TipBox suffix="%" />} />
        <Area
          type="monotone"
          dataKey="playoff"
          name="Playoff"
          stroke="#38bdf8"
          strokeWidth={1.6}
          fill="url(#gPlayoff)"
        />
        <Area type="monotone" dataKey="champ" name="Championship" stroke="#00cf72" strokeWidth={2} fill="url(#gChamp)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ProjectionCompareChart({
  data,
  height = 260,
}: {
  data: { name: string; book: number; sleeper: number; model: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-24} textAnchor="end" height={54} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={38} />
        <Tooltip content={<TipBox />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
        <Bar dataKey="book" name="Sportsbook" fill="#00cf72" radius={[3, 3, 0, 0]} />
        <Bar dataKey="model" name="AI model" fill="#a78bfa" radius={[3, 3, 0, 0]} />
        <Bar dataKey="sleeper" name="Sleeper" fill="#38bdf8" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PositionalRadarChart({
  data,
  height = 250,
}: {
  data: { position: string; team: number; league: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="position" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip content={<TipBox />} />
        <Radar name="League avg" dataKey="league" stroke="#64748b" fill="#64748b" fillOpacity={0.14} />
        <Radar name="Your team" dataKey="team" stroke="#00cf72" fill="#00cf72" fillOpacity={0.26} />
        <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function PowerBarChart({
  data,
  height = 320,
}: {
  data: { name: string; value: number; isUser: boolean }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} width={128} tickLine={false} axisLine={false} />
        <Tooltip content={<TipBox />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" name="Roster strength" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isUser ? "#00cf72" : "rgba(148,163,184,0.42)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DiscrepancyChart({
  data,
  height = 280,
}: {
  data: { name: string; discrepancy: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} width={122} tickLine={false} axisLine={false} />
        <Tooltip content={<TipBox />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="discrepancy" name="Book − Sleeper" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.discrepancy >= 0 ? "#00cf72" : "#f87171"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({
  data,
  dataKey = "value",
  color = "#00cf72",
  height = 120,
}: {
  data: any[];
  dataKey?: string;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: -28, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={30} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={36} />
        <Tooltip content={<TipBox />} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
