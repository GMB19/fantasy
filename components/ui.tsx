"use client";

import { clsx } from "clsx";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

export function cn(...parts: any[]) {
  return clsx(parts);
}

// ---------------------------------------------------------------- primitives

export function Panel({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("panel", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  right,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  icon?: any;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-turf-500/12 text-turf-300">
            <Icon size={16} />
          </span>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "border-turf-500/25 bg-turf-500/12 text-turf-300",
  red: "border-red-500/25 bg-red-500/10 text-red-300",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  blue: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  violet: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  slate: "border-white/10 bg-white/[0.05] text-slate-300",
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
        TONES[tone] ?? TONES.slate,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  delta,
  tone = "slate",
  icon: Icon,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delta?: number | null;
  tone?: string;
  icon?: any;
  loading?: boolean;
}) {
  return (
    <div className="panel panel-hover p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        {Icon ? <Icon size={14} className="text-slate-500" /> : null}
      </div>
      {loading ? (
        <div className="shimmer mt-3 h-7 w-24 rounded-md bg-white/[0.06]" />
      ) : (
        <div className="num mt-2 text-[26px] font-bold leading-none tracking-tight text-white">{value}</div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {typeof delta === "number" && !Number.isNaN(delta) ? (
          <span
            className={cn(
              "num text-[11px] font-semibold",
              delta > 0 ? "text-turf-300" : delta < 0 ? "text-red-300" : "text-slate-400"
            )}
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta).toFixed(2)}
          </span>
        ) : null}
        {sub ? <span className="text-[11px] text-slate-400">{sub}</span> : null}
      </div>
    </div>
  );
}

export function Progress({ value, tone = "green" }: { value: number; tone?: string }) {
  const colors: Record<string, string> = {
    green: "bg-turf-500",
    blue: "bg-sky-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    violet: "bg-violet-500",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className={cn("h-full rounded-full transition-all duration-700", colors[tone] ?? colors.green)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: any;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {Icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-400">
          <Icon size={20} />
        </span>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        {body ? <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg bg-white/[0.05]", className)} />;
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2 p-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition hover:border-white/15",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span>
        <span className="block text-sm font-medium text-slate-100">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-turf-400/50 bg-turf-500/80" : "border-white/10 bg-white/[0.08]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
          style={{ height: 18, width: 18 }}
        />
      </button>
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-100">{label}</span>
        <span className="num rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-turf-300">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-turf-500"
      />
      {hint ? <p className="mt-2 text-xs leading-relaxed text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8">
      <div
        className={cn(
          "panel animate-fade-in my-auto w-full bg-ink-900/95",
          wide ? "max-w-4xl" : "max-w-lg"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="scroll-thin max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="scroll-thin flex gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            active === t.id ? "bg-turf-500/15 text-turf-200" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
          )}
        >
          {t.label}
          {typeof t.count === "number" ? (
            <span className="num ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{t.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- toasts

type Toast = { id: string; title: string; body?: string; tone: "success" | "error" | "info" | "warn" };
const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 5200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  const icons = { success: CheckCircle2, error: XCircle, info: Info, warn: AlertTriangle };
  const tones = {
    success: "border-turf-500/30 bg-turf-500/10",
    error: "border-red-500/30 bg-red-500/10",
    info: "border-sky-500/30 bg-sky-500/10",
    warn: "border-amber-500/30 bg-amber-500/10",
  };
  const iconTones = {
    success: "text-turf-300",
    error: "text-red-300",
    info: "text-sky-300",
    warn: "text-amber-300",
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              className={cn(
                "panel pointer-events-auto animate-fade-in flex items-start gap-3 border p-3.5 backdrop-blur-2xl",
                tones[t.tone]
              )}
            >
              <Icon size={16} className={cn("mt-0.5 shrink-0", iconTones[t.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{t.title}</p>
                {t.body ? <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{t.body}</p> : null}
              </div>
              <button
                onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
                className="rounded p-0.5 text-slate-400 hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------------------------------------------------------- helpers

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 45) return `${Math.max(1, s)}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function signed(n: number, digits = 2): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;
}

export const POSITION_TONES: Record<string, string> = {
  QB: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  RB: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  WR: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  TE: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  K: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  DEF: "border-slate-400/30 bg-slate-400/10 text-slate-300",
};

export function PositionBadge({ position }: { position: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[30px] items-center justify-center rounded-md border px-1.5 text-[10px] font-bold tracking-wide",
        POSITION_TONES[position] ?? POSITION_TONES.DEF
      )}
    >
      {position}
    </span>
  );
}

export function InjuryBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const tone =
    status === "OUT" || status === "IR" ? "red" : status === "DOUBTFUL" ? "amber" : "amber";
  return <Badge tone={tone}>{status === "QUESTIONABLE" ? "Q" : status === "DOUBTFUL" ? "D" : status}</Badge>;
}
