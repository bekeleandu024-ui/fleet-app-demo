import type { Order } from "@prisma/client";

export type UrgencyLabel = "NOW" | "HIGH" | "MEDIUM" | "LOW";

export function computeUrgency(o: Pick<Order, "puWindowStart" | "delWindowEnd">) {
  const now = new Date();
  const pickup = o.puWindowStart ? new Date(o.puWindowStart) : undefined;
  const delivery = o.delWindowEnd ? new Date(o.delWindowEnd) : undefined;
  const toPickupHrs = pickup ? (pickup.getTime() - now.getTime()) / 36e5 : 9999;
  const toDropHrs = delivery ? (delivery.getTime() - now.getTime()) / 36e5 : 9999;
  const score =
    Math.max(0, 100 - Math.min(toPickupHrs, 72)) * 1.2 +
    Math.max(0, 100 - Math.min(toDropHrs, 120));
  const label: UrgencyLabel = score > 140 ? "NOW" : score > 90 ? "HIGH" : score > 50 ? "MEDIUM" : "LOW";
  return { score, label };
}

export type CostComponents = {
  fixedCPM?: number | null;
  wageCPM?: number | null;
  addOnsCPM?: number | null;
  rollingCPM?: number | null;
};

export function calcBreakevenCPM(costs: CostComponents) {
  return (
    (costs.fixedCPM ?? 0) +
    (costs.wageCPM ?? 0) +
    (costs.addOnsCPM ?? 0) +
    (costs.rollingCPM ?? 0)
  );
}

export function suggestRate({
  miles,
  breakevenCPM,
  targetMargin = 0.18,
}: {
  miles: number;
  breakevenCPM: number;
  targetMargin?: number;
}) {
  const safeMiles = Number.isFinite(miles) && miles > 0 ? miles : 0;
  const safeBreakeven = Number.isFinite(breakevenCPM) ? breakevenCPM : 0;
  if (safeMiles <= 0) {
    const targetCPM = safeBreakeven / (1 - targetMargin);
    return { cpm: Number(targetCPM.toFixed(2)), total: null as number | null };
  }
  const targetCPM = safeBreakeven / (1 - targetMargin);
  return {
    cpm: Number(targetCPM.toFixed(2)),
    total: Number((targetCPM * safeMiles).toFixed(2)),
  };
}

export function marginFromRates({
  breakevenCPM,
  suggestedCPM,
}: {
  breakevenCPM: number;
  suggestedCPM: number;
}) {
  if (!Number.isFinite(breakevenCPM) || !Number.isFinite(suggestedCPM) || suggestedCPM <= 0) {
    return null;
  }
  return 1 - breakevenCPM / suggestedCPM;
}
