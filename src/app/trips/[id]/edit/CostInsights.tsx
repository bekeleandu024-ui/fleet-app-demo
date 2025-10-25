"use client";

import * as React from "react";
import type { CostInsightsProps } from "./types";

const metricClass = "space-y-1";
const metricLabelClass = "text-xs uppercase tracking-wide text-muted-foreground";
const metricValueClass = "text-sm font-semibold";

const formatNumber = (value: number | null | undefined, digits = 2): string => {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
};

const marginLabel = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
};

export default function CostInsights({ trip, recentSimilar }: CostInsightsProps) {
  const miles = trip.miles ?? 0;
  const breakevenCPM =
    (trip.fixedCPM ?? 0) + (trip.wageCPM ?? 0) + (trip.addOnsCPM ?? 0) + (trip.rollingCPM ?? 0);
  const revenueCPM = miles > 0 && trip.revenue != null ? trip.revenue / miles : null;
  const estimatedMargin =
    revenueCPM != null && breakevenCPM > 0 ? 1 - breakevenCPM / revenueCPM : trip.marginPct ?? null;

  const averageTotalCPM = React.useMemo(() => {
    if (!recentSimilar.length) return null;
    const values = recentSimilar
      .map((item) => {
        if (item.totalCPM != null) return item.totalCPM;
        if (item.totalCost != null && item.miles && item.miles > 0) {
          return item.totalCost / item.miles;
        }
        return null;
      })
      .filter((value): value is number => value != null && Number.isFinite(value));
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [recentSimilar]);

  const issues: string[] = [];
  if (!miles) issues.push("Miles are missing.");
  if (miles > 0 && (trip.revenue ?? 0) <= 0) issues.push("Revenue is zero with non-zero miles.");
  if (revenueCPM != null && revenueCPM < breakevenCPM)
    issues.push(
      `Revenue CPM (${revenueCPM.toFixed(2)}) is below breakeven (${breakevenCPM.toFixed(2)}).`,
    );
  if ((trip.marginPct ?? estimatedMargin ?? 0) < 0) issues.push("Margin is negative.");
  if (
    averageTotalCPM != null &&
    (trip.totalCPM ?? breakevenCPM) > averageTotalCPM * 1.15
  )
    issues.push("Total CPM is >15% worse than similar trips.");

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="text-base font-semibold">Cost Insights</h3>
        <p className="text-xs text-muted-foreground">
          Benchmarks from the most recent {recentSimilar.length || 0} similar trips.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={metricClass}>
          <div className={metricLabelClass}>Breakeven CPM</div>
          <div className={metricValueClass}>{formatNumber(breakevenCPM)}</div>
        </div>
        <div className={metricClass}>
          <div className={metricLabelClass}>Revenue CPM</div>
          <div className={metricValueClass}>{formatNumber(revenueCPM)}</div>
        </div>
        <div className={metricClass}>
          <div className={metricLabelClass}>Estimated Margin</div>
          <div className={metricValueClass}>{marginLabel(estimatedMargin ?? trip.marginPct ?? null)}</div>
        </div>
        <div className={metricClass}>
          <div className={metricLabelClass}>Avg Total CPM (similar)</div>
          <div className={metricValueClass}>{formatNumber(averageTotalCPM)}</div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide">Issues</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          {issues.length ? issues.map((issue, index) => <li key={index}>{issue}</li>) : <li>No obvious cost issues.</li>}
        </ul>
      </div>
    </div>
  );
}
