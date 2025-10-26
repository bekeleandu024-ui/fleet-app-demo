"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCPM, formatCurrency, formatDateTimeRange, formatPercent } from "@/lib/utils";
import type {
  AiRecommendation,
  AvailableOrderSummary,
  BookTripFormSnapshot,
  DriverOption,
  UnitOption,
} from "./types";

interface AiAdvisorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: AvailableOrderSummary | null;
  snapshot: BookTripFormSnapshot | null;
  drivers: DriverOption[];
  units: UnitOption[];
  targetMargin: number;
  onApply: (recommendation: AiRecommendation) => void;
  onBookNow: (recommendation: AiRecommendation) => void;
}

const DEFAULT_RECOMMENDATION: AiRecommendation = {};

export function AiAdvisorSheet({
  open,
  onOpenChange,
  order,
  snapshot,
  drivers,
  units,
  targetMargin,
  onApply,
  onBookNow,
}: AiAdvisorSheetProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [recommendation, setRecommendation] = React.useState<AiRecommendation>(DEFAULT_RECOMMENDATION);

  const fetchPlan = React.useCallback(async () => {
    if (!open) return;
    if (!order && !snapshot) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order,
          drivers,
          units,
          targetMargin,
          snapshot,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to fetch AI plan" }));
        throw new Error(payload.error ?? "Unable to fetch AI plan");
      }
      const json = await response.json();
      setRecommendation(json.recommendation ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch AI plan");
      setRecommendation(DEFAULT_RECOMMENDATION);
    } finally {
      setLoading(false);
    }
  }, [open, order, snapshot, drivers, units, targetMargin]);

  React.useEffect(() => {
    if (!open) return;
    void fetchPlan();
  }, [fetchPlan, open]);

  const handleApply = () => {
    if (!recommendation) return;
    onApply(recommendation);
    onOpenChange(false);
  };

  const handleBookNow = () => {
    if (!recommendation) return;
    onApply(recommendation);
    onBookNow(recommendation);
    onOpenChange(false);
  };

  const pickupRange = order
    ? formatDateTimeRange(
        order.puWindowStart ? new Date(order.puWindowStart) : undefined,
        order.puWindowEnd ? new Date(order.puWindowEnd) : undefined
      )
    : null;
  const deliveryRange = order
    ? formatDateTimeRange(
        order.delWindowStart ? new Date(order.delWindowStart) : undefined,
        order.delWindowEnd ? new Date(order.delWindowEnd) : undefined
      )
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-xl">
        <SheetHeader>
          <SheetTitle>AI Trip Advisor</SheetTitle>
          <SheetDescription>
            Weighted by urgency and desired margin ({Math.round(targetMargin * 100)}%).
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-6">
          {order ? (
            <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">{order.customer}</h3>
                  <p className="text-sm text-slate-400">
                    {order.origin} → {order.destination}
                  </p>
                </div>
                <Badge variant="sky">{order.urgency.label}</Badge>
              </header>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-slate-500">Pickup window</dt>
                  <dd className="text-slate-300">{pickupRange}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Delivery window</dt>
                  <dd className="text-slate-300">{deliveryRange}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Breakeven CPM</dt>
                  <dd className="text-slate-300">{order.breakevenCPM != null ? formatCPM(order.breakevenCPM) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Suggested rate</dt>
                  <dd className="text-slate-300">
                    {order.suggestedTotal != null ? (
                      <>
                        {formatCurrency(order.suggestedTotal)}
                        {order.suggestedCPM != null && (
                          <span className="block text-xs text-slate-400">{formatCPM(order.suggestedCPM)} CPM</span>
                        )}
                      </>
                    ) : order.suggestedCPM != null ? (
                      formatCPM(order.suggestedCPM)
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          ) : (
            <p className="text-sm text-slate-400">Provide order details to receive targeted guidance.</p>
          )}

          <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <header>
              <h3 className="text-base font-semibold text-slate-100">Recommendation</h3>
              <p className="text-sm text-slate-400">Optimized for margin and pickup urgency.</p>
            </header>
            {loading ? (
              <p className="text-sm text-slate-400">Requesting guidance…</p>
            ) : error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : recommendation ? (
              <div className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Driver</dt>
                    <dd className="text-slate-300">
                      {recommendation.driverName || recommendation.driverId
                        ? recommendation.driverName || drivers.find((d) => d.id === recommendation.driverId)?.name
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Unit</dt>
                    <dd className="text-slate-300">
                      {recommendation.unitCode || recommendation.unitId
                        ? (() => {
                            if (recommendation.unitCode) return recommendation.unitCode;
                            const unit = units.find((u) => u.id === recommendation.unitId);
                            if (!unit) return "—";
                            return unit.label || unit.code || "—";
                          })()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Start time</dt>
                    <dd className="text-slate-300">
                      {recommendation.start ? new Date(recommendation.start).toLocaleString() : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Suggested CPM</dt>
                    <dd className="text-slate-300">
                      {recommendation.suggestedCPM != null ? formatCPM(recommendation.suggestedCPM) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Suggested total</dt>
                    <dd className="text-slate-300">
                      {recommendation.suggestedTotal != null ? formatCurrency(recommendation.suggestedTotal) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Margin</dt>
                    <dd className="text-slate-300">
                      {recommendation.expectedMarginPct != null
                        ? formatPercent(recommendation.expectedMarginPct)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {recommendation.rationale && (
                  <p className="rounded-md border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
                    {recommendation.rationale}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No recommendation yet.</p>
            )}
          </section>
        </div>
        <SheetFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" variant="secondary" onClick={handleApply} disabled={loading || !!error}>
            Apply to Form
          </Button>
          <Button type="button" onClick={handleBookNow} disabled={loading || !!error}>
            Apply &amp; Book
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
