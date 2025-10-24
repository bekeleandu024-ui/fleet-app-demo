"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getOrderInsights } from "@/server/ai-dispatcher";
import type { OrderInsight } from "@/types/ai";

const STORAGE_KEY = "ai-orders-assistant";

const priorityStyles: Record<
  OrderInsight["priority"],
  { badge: string; dot: string; label: string }
> = {
  high: {
    badge: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    dot: "bg-rose-400",
    label: "High priority",
  },
  medium: {
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    dot: "bg-amber-400",
    label: "Medium priority",
  },
  low: {
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    dot: "bg-emerald-400",
    label: "Low priority",
  },
};

function formatHours(hours: number | null) {
  if (hours == null) return "—";
  const rounded = Math.round(hours * 10) / 10;
  if (Math.abs(rounded) < 0.5) {
    return "<0.5h";
  }
  return `${rounded}h`;
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
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
      <span className="sr-only">Toggle AI assistance</span>
    </button>
  );
}

function InsightCard({ insight }: { insight: OrderInsight }) {
  const style = priorityStyles[insight.priority];
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-inner">
      <header className="flex flex-wrap items-center gap-2">
        <span
          className={`flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${style.badge}`}
        >
          <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
          {style.label}
        </span>
        <h3 className="text-base font-semibold text-slate-100">{insight.summary}</h3>
      </header>

      <dl className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
        <div>
          <dt className="uppercase tracking-wide text-slate-400">Order age</dt>
          <dd className="mt-1 font-medium text-slate-100">
            {formatHours(insight.metrics.ageHours)}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-slate-400">Pickup in</dt>
          <dd className="mt-1 font-medium text-slate-100">
            {insight.metrics.hoursUntilPickup != null
              ? formatHours(insight.metrics.hoursUntilPickup)
              : "Schedule TBD"}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-slate-400">Trips assigned</dt>
          <dd className="mt-1 font-medium text-slate-100">{insight.metrics.assignedTrips}</dd>
        </div>
      </dl>

      {insight.reasoning.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-300">
          {insight.reasoning.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      {insight.recommendations.length > 0 && (
        <div className="mt-4 space-y-2">
          {insight.recommendations.map((recommendation) => (
            <div
              key={`${insight.orderId}-${recommendation.title}`}
              className="rounded-md border border-slate-800 bg-slate-900/80 p-3"
            >
              <p className="text-sm font-semibold text-slate-100">{recommendation.title}</p>
              <p className="mt-1 text-xs text-slate-300">{recommendation.detail}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function AIOrdersAssistant() {
  const [enabled, setEnabled] = useState(false);
  const [insights, setInsights] = useState<OrderInsight[]>([]);
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

  const loadInsights = useCallback(() => {
    startTransition(() => {
      setError(null);
      getOrderInsights()
        .then((response) => {
          setInsights(response.insights);
          setGeneratedAt(response.generatedAt);
        })
        .catch((err) => {
          console.error("Failed to load AI order insights", err);
          setError("Could not load AI insights. Please try again.");
        });
    });
  }, [startTransition]);

  useEffect(() => {
    if (!enabled) return;
    loadInsights();
  }, [enabled, loadInsights]);

  const statusLabel = useMemo(() => {
    if (isPending) return "Generating AI plan...";
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
          <h2 className="text-lg font-semibold text-slate-100">AI dispatcher accelerator</h2>
          <p className="text-sm text-slate-300">
            Toggle to surface the next-best booking moves, suggested assets, and pricing guardrails.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Toggle enabled={enabled} onToggle={setEnabled} />
          <p className="text-xs text-slate-400">{statusLabel}</p>
          {enabled && (
            <button
              type="button"
              onClick={loadInsights}
              className="text-xs font-medium text-sky-300 hover:text-sky-200"
              disabled={isPending}
            >
              Refresh suggestions
            </button>
          )}
        </div>
      </div>

      {!enabled ? (
        <p className="mt-4 text-sm text-slate-300">
          Enable the AI layer to prioritize orders that need attention and pre-stage the right
          driver/unit pairings.
        </p>
      ) : isPending && insights.length === 0 ? (
        <div className="mt-4 space-y-2">
          <div className="h-20 animate-pulse rounded-lg bg-slate-800/80" />
          <div className="h-20 animate-pulse rounded-lg bg-slate-800/80" />
        </div>
      ) : insights.length === 0 ? (
        <p className="mt-4 text-sm text-slate-300">
          No urgent orders detected. The AI layer will notify you as new loads come in.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {insights.map((insight) => (
            <InsightCard key={insight.orderId} insight={insight} />
          ))}
        </div>
      )}
    </section>
  );
}
