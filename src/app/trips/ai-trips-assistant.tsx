"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getTripOptimizations } from "@/server/ai-dispatcher";
import type { TripOptimization } from "@/types/ai";

const STORAGE_KEY = "ai-trips-assistant";

const healthStyles: Record<
  TripOptimization["health"],
  { badge: string; dot: string; label: string }
> = {
  intervene: {
    badge: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    dot: "bg-rose-400",
    label: "Intervention needed",
  },
  watch: {
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    dot: "bg-amber-400",
    label: "Watch closely",
  },
  excellent: {
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    dot: "bg-emerald-400",
    label: "On track",
  },
};

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatNumber(value: number | null, suffix: string) {
  if (value == null) return "—";
  return `${value.toFixed(2)}${suffix}`;
}

function TripCard({ optimization }: { optimization: TripOptimization }) {
  const style = healthStyles[optimization.health];
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-inner">
      <header className="flex flex-wrap items-center gap-2">
        <span
          className={`flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${style.badge}`}
        >
          <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
          {style.label}
        </span>
        <h3 className="text-base font-semibold text-slate-100">
          {optimization.headline} · {optimization.driver || "Unassigned"} / {optimization.unit || "TBD"}
        </h3>
      </header>

      <dl className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-4">
        <div>
          <dt className="uppercase tracking-wide text-slate-400">Status</dt>
          <dd className="mt-1 font-medium text-slate-100">{optimization.status}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-slate-400">Margin</dt>
          <dd className="mt-1 font-medium text-slate-100">{formatPercent(optimization.marginPct)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-slate-400">RPM</dt>
          <dd className="mt-1 font-medium text-slate-100">{formatNumber(optimization.revenuePerMile, "/mi")}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-slate-400">CPM</dt>
          <dd className="mt-1 font-medium text-slate-100">{formatNumber(optimization.costPerMile, "/mi")}</dd>
        </div>
      </dl>

      {optimization.reasoning.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-300">
          {optimization.reasoning.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      {optimization.actionItems.length > 0 && (
        <div className="mt-4 space-y-2">
          {optimization.actionItems.map((action) => (
            <div
              key={`${optimization.tripId}-${action.title}`}
              className="rounded-md border border-slate-800 bg-slate-900/80 p-3"
            >
              <p className="text-sm font-semibold text-slate-100">{action.title}</p>
              <p className="mt-1 text-xs text-slate-300">{action.detail}</p>
            </div>
          ))}
        </div>
      )}

      {optimization.projectedGain && (
        <p className="mt-3 rounded-md border border-emerald-700/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          {optimization.projectedGain.description}: {formatCurrency(optimization.projectedGain.amount)} potential gain
        </p>
      )}
    </article>
  );
}

export default function AITripsAssistant() {
  const [enabled, setEnabled] = useState(false);
  const [optimizations, setOptimizations] = useState<TripOptimization[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "on") {
      setEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  }, [enabled]);

  const loadOptimizations = useCallback(() => {
    startTransition(() => {
      setError(null);
      getTripOptimizations()
        .then((response) => {
          setOptimizations(response.optimizations);
          setGeneratedAt(response.generatedAt);
        })
        .catch((err) => {
          console.error("Failed to load AI trip optimizations", err);
          setError("Could not load AI coaching. Please try again.");
        });
    });
  }, [startTransition]);

  useEffect(() => {
    if (!enabled) return;
    loadOptimizations();
  }, [enabled, loadOptimizations]);

  const statusLabel = useMemo(() => {
    if (isPending) return "Scanning trips...";
    if (error) return error;
    if (generatedAt) {
      const formatted = new Date(generatedAt).toLocaleTimeString();
      return `Updated ${formatted}`;
    }
    return "AI assistance ready";
  }, [error, generatedAt, isPending]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-slate-100 shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">AI profitability coach</h2>
          <p className="text-sm text-slate-300">
            Watch booked and in-progress trips for margin risk and get proactive play calls to keep them profitable.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => setEnabled((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
              enabled
                ? "border-sky-400 bg-sky-500/80"
                : "border-slate-600 bg-slate-800 hover:border-slate-500"
            }`}
            aria-pressed={enabled}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                enabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
            <span className="sr-only">Toggle AI profit coach</span>
          </button>
          <p className="text-xs text-slate-400">{statusLabel}</p>
          {enabled && (
            <button
              type="button"
              onClick={loadOptimizations}
              className="text-xs font-medium text-sky-300 hover:text-sky-200"
              disabled={isPending}
            >
              Refresh guidance
            </button>
          )}
        </div>
      </div>

      {!enabled ? (
        <p className="mt-4 text-sm text-slate-300">
          Enable the AI coach to surface trips with slipping margins and receive recommended fixes before settlement.
        </p>
      ) : isPending && optimizations.length === 0 ? (
        <div className="mt-4 space-y-2">
          <div className="h-20 animate-pulse rounded-lg bg-slate-800/80" />
          <div className="h-20 animate-pulse rounded-lg bg-slate-800/80" />
        </div>
      ) : optimizations.length === 0 ? (
        <p className="mt-4 text-sm text-slate-300">
          All clear! The AI layer will flag trips if profitability drifts.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {optimizations.map((optimization) => (
            <TripCard key={optimization.tripId} optimization={optimization} />
          ))}
        </div>
      )}
    </section>
  );
}
