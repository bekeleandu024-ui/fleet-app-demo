"use client";

import * as React from "react";
import type { AiOptimizerProps } from "./types";

type OptimizeResponse = {
  breakevenCPM: number;
  targetCPM: number;
  targetMarginPct: number;
  suggestedRevenue: number | null;
  marginNowPct: number | null;
  notes: string[];
};

const buttonClass = "rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/60";
const headingClass = "text-base font-semibold";

const formatCurrency = (value: number | null) => {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function AiOptimizerPanel({ trip, bench, onApply }: AiOptimizerProps) {
  const [result, setResult] = React.useState<OptimizeResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const breakevenCPM =
    (trip.fixedCPM ?? 0) + (trip.wageCPM ?? 0) + (trip.addOnsCPM ?? 0) + (trip.rollingCPM ?? 0);

  const runOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          miles: trip.miles,
          revenue: trip.revenue,
          fixedCPM: trip.fixedCPM,
          wageCPM: trip.wageCPM,
          addOnsCPM: trip.addOnsCPM,
          rollingCPM: trip.rollingCPM,
          targetMargin: 0.18,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch optimization suggestions");
      }

      const json = (await response.json()) as OptimizeResponse;
      setResult(json);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unexpected error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!onApply || result?.suggestedRevenue == null) return;
    onApply({ revenue: result.suggestedRevenue });
  };

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className={headingClass}>AI Optimizer</h3>
        <p className="text-xs text-muted-foreground">
          Target an 18% margin using rate and revenue adjustments.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border/60 bg-background/50 p-3 text-xs text-muted-foreground">
        <div>
          Breakeven CPM: <span className="font-medium text-foreground">{breakevenCPM.toFixed(2)}</span>
        </div>
        {bench?.breakevenCPM != null && (
          <div>
            Avg breakeven CPM (similar):
            <span className="ml-1 font-medium text-foreground">{bench.breakevenCPM.toFixed(2)}</span>
          </div>
        )}
        {bench?.totalCPM != null && (
          <div>
            Avg total CPM (similar):
            <span className="ml-1 font-medium text-foreground">{bench.totalCPM.toFixed(2)}</span>
          </div>
        )}
        {bench?.revenueCPM != null && (
          <div>
            Avg revenue CPM (similar):
            <span className="ml-1 font-medium text-foreground">{bench.revenueCPM.toFixed(2)}</span>
          </div>
        )}
      </div>

      <button className={buttonClass} type="button" onClick={runOptimization} disabled={loading}>
        {loading ? "Analyzing…" : "Suggest adjustments"}
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div>
            Target CPM (@{result.targetMarginPct.toFixed(1)}% margin):
            <span className="ml-2 font-semibold">{result.targetCPM.toFixed(2)}</span>
          </div>
          <div>
            Suggested revenue: <span className="font-semibold">{formatCurrency(result.suggestedRevenue)}</span>
          </div>
          {result.marginNowPct != null && (
            <div>
              Current margin: <span className="font-semibold">{result.marginNowPct.toFixed(1)}%</span>
            </div>
          )}
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {(result.notes ?? []).map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
          <button className={buttonClass} type="button" onClick={handleApply}>
            Apply to form
          </button>
        </div>
      )}
    </div>
  );
}
