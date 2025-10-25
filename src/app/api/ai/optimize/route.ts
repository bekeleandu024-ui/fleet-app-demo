import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  trip: {
    miles: number | null;
    revenue: number | null;
    fixedCPM: number | null;
    wageCPM: number | null;
    addOnsCPM: number | null;
    rollingCPM: number | null;
    targetMargin?: number;
  };
  benchmark?: { revenueCPM?: number; totalCPM?: number; breakevenCPM?: number };
};

export async function POST(req: Request) {
  const { trip, benchmark }: Body = await req.json();

  const miles = trip.miles ?? 0;
  const breakevenCPM =
    (trip.fixedCPM ?? 0) + (trip.wageCPM ?? 0) + (trip.addOnsCPM ?? 0) + (trip.rollingCPM ?? 0);
  const targetMargin = trip.targetMargin ?? 0.18;
  const targetCPM = breakevenCPM / (1 - targetMargin);
  const suggestedRevenue = miles > 0 ? Number((targetCPM * miles).toFixed(2)) : null;

  const currentRevenueCPM = miles > 0 && trip.revenue != null ? trip.revenue / miles : null;
  const marginNow =
    currentRevenueCPM != null && breakevenCPM > 0 ? 1 - breakevenCPM / currentRevenueCPM : null;

  const actions: string[] = [];
  if (suggestedRevenue != null && (trip.revenue ?? 0) < suggestedRevenue)
    actions.push(
      `Increase revenue to $${suggestedRevenue.toLocaleString()} to target ${Math.round(
        targetMargin * 100,
      )}% margin.`,
    );
  if ((trip.rollingCPM ?? 0) > 0.12)
    actions.push("Lower rollingCPM (fuel/ops) by optimizing route or idling.");
  if (
    benchmark?.totalCPM != null &&
    benchmark.totalCPM > 0 &&
    (trip.addOnsCPM ?? 0) > benchmark.totalCPM * 0.2
  )
    actions.push("Review accessorials; they are high vs benchmark.");

  return NextResponse.json({
    breakevenCPM,
    targetMarginPct: targetMargin * 100,
    targetCPM: Number(targetCPM.toFixed(2)),
    suggestedRevenue,
    marginNowPct: marginNow != null ? Number((marginNow * 100).toFixed(1)) : null,
    notes: actions,
  });
}
