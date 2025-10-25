"use client";

import * as React from "react";
import type { TripDTO } from "./types";

type Bench = {
  revenueCPM?: number;
  totalCPM?: number;
  breakevenCPM?: number;
};

type OptimizeResponse = {
  breakevenCPM: number;
  targetMarginPct: number;
  targetCPM: number;
  suggestedRevenue: number | null;
  marginNowPct: number | null;
  notes: string[];
};

export default function AiOptimizerPanel({
  trip,
  onApply,
  bench,
}: {
  trip: TripDTO;
  bench?: Bench;
  onApply?: (patch: Partial<TripDTO>) => void;
}) {
  const [result, setResult] = React.useState<OptimizeResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function run() {
    try {
      setLoading(true);
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip: {
            miles: trip.miles,
            revenue: trip.revenue,
            fixedCPM: trip.fixedCPM,
            wageCPM: trip.wageCPM,
            addOnsCPM: trip.addOnsCPM,
            rollingCPM: trip.rollingCPM,
            targetMargin: 0.18,
          },
          benchmark: bench ?? {},
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to optimize trip");
      }

      const json = (await res.json()) as OptimizeResponse;
      setResult(json);
    } catch (error) {
      console.error(error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function apply() {
    if (!result || !onApply) return;
    if (result.suggestedRevenue != null) {
      onApply({ revenue: result.suggestedRevenue });
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <h3 className="font-semibold">AI Optimizer</h3>
      <button
        className="rounded-md px-3 py-2 border hover:bg-muted/60"
        onClick={run}
        disabled={loading}
      >
        {loading ? "Analyzing…" : "Suggest adjustments"}
      </button>
      {result && (
        <div className="space-y-2">
          <div>
            Breakeven CPM: <b>{result.breakevenCPM.toFixed(2)}</b>
          </div>
          <div>
            Target CPM (@{result.targetMarginPct}% margin): <b>{result.targetCPM.toFixed(2)}</b>
          </div>
          <div>
            Suggested Revenue: <b>{result.suggestedRevenue?.toLocaleString?.() ?? "—"}</b>
          </div>
          {result.marginNowPct != null && (
            <div>Current Margin: <b>{result.marginNowPct}%</b></div>
          )}
          <ul className="list-disc pl-5 text-muted-foreground">
            {(result.notes ?? []).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <button className="rounded-md px-3 py-2 border hover:bg-muted/60" onClick={apply}>
            Apply to form
          </button>
        </div>
      )}
    </div>
  );
}
