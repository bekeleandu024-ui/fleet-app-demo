"use client";

import * as React from "react";
import type { TripDTO } from "./types";

type Similar = Pick<
  TripDTO,
  | "miles"
  | "revenue"
  | "fixedCPM"
  | "wageCPM"
  | "addOnsCPM"
  | "rollingCPM"
  | "totalCPM"
  | "totalCost"
  | "profit"
  | "marginPct"
> & { createdAt?: string | Date };

export default function CostInsights({
  trip,
  recentSimilar = [],
}: {
  trip: TripDTO;
  recentSimilar: Similar[];
}) {
  const miles = trip.miles ?? 0;
  const breakevenCPM =
    (trip.fixedCPM ?? 0) + (trip.wageCPM ?? 0) + (trip.addOnsCPM ?? 0) + (trip.rollingCPM ?? 0);
  const revenueCPM = miles > 0 && trip.revenue != null ? trip.revenue / miles : null;
  const marginAtRevenue =
    revenueCPM != null && breakevenCPM > 0 ? 1 - breakevenCPM / revenueCPM : null;

  const n = recentSimilar.length || 1;
  const avg = {
    totalCPM:
      recentSimilar.reduce(
        (s, x) => s + (x.totalCPM ?? (x.totalCost ?? 0) / Math.max(1, x.miles ?? 0)),
        0,
      ) / n,
    marginPct: recentSimilar.reduce((s, x) => s + (x.marginPct ?? 0), 0) / n,
    revenueCPM:
      recentSimilar.reduce(
        (s, x) => s + (x.revenue ?? 0) / Math.max(1, x.miles ?? 0),
        0,
      ) / n,
    breakevenCPM:
      recentSimilar.reduce(
        (s, x) =>
          s +
          ((x.fixedCPM ?? 0) + (x.wageCPM ?? 0) + (x.addOnsCPM ?? 0) + (x.rollingCPM ?? 0)),
        0,
      ) / n,
  };

  const issues: string[] = [];
  if (!miles) issues.push("Miles are missing.");
  if (miles && (trip.revenue ?? 0) === 0) issues.push("Revenue is 0 with non-zero miles.");
  if (revenueCPM != null && revenueCPM < breakevenCPM)
    issues.push(
      `Revenue CPM (${revenueCPM.toFixed(2)}) is below breakeven (${breakevenCPM.toFixed(2)}).`,
    );
  if ((trip.marginPct ?? -1) < 0) issues.push("Margin is negative.");
  if (Number.isFinite(avg.totalCPM) && (trip.totalCPM ?? breakevenCPM) > avg.totalCPM * 1.15)
    issues.push("Total CPM is >15% worse than similar trips.");
  if (Number.isFinite(avg.totalCPM) && (trip.totalCPM ?? breakevenCPM) < avg.totalCPM * 0.85)
    issues.push("Total CPM is >15% better than similar trips.");

  return (
    <div className="space-y-3 text-sm">
      <h3 className="font-semibold">Cost Insights</h3>
      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
        {issues.length ? (
          issues.map((it, i) => <li key={i}>{it}</li>)
        ) : (
          <li>No obvious cost issues.</li>
        )}
      </ul>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <div className="text-xs text-muted-foreground">Breakeven CPM</div>
          <div className="font-medium">{breakevenCPM.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Revenue CPM</div>
          <div className="font-medium">{revenueCPM != null ? revenueCPM.toFixed(2) : "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Margin @ Revenue</div>
          <div className="font-medium">
            {marginAtRevenue != null ? `${(marginAtRevenue * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Avg Total CPM (similar)</div>
          <div className="font-medium">
            {Number.isFinite(avg.totalCPM) ? avg.totalCPM.toFixed(2) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
