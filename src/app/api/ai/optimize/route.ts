import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  miles: z.number().nullable().optional(),
  revenue: z.number().nullable().optional(),
  fixedCPM: z.number().nullable().optional(),
  wageCPM: z.number().nullable().optional(),
  addOnsCPM: z.number().nullable().optional(),
  rollingCPM: z.number().nullable().optional(),
  targetMargin: z.number().nullable().optional(),
});

type Body = z.infer<typeof bodySchema>;

type OptimizePayload = {
  breakevenCPM: number;
  targetMarginPct: number;
  targetCPM: number;
  suggestedRevenue: number | null;
  marginNowPct: number | null;
  notes: string[];
};

const toFixed = (value: number, digits: number) => Number(value.toFixed(digits));

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const body: Body = parsed.data;

  const miles = body.miles ?? 0;
  const revenue = body.revenue ?? 0;
  const fixedCPM = body.fixedCPM ?? 0;
  const wageCPM = body.wageCPM ?? 0;
  const addOnsCPM = body.addOnsCPM ?? 0;
  const rollingCPM = body.rollingCPM ?? 0;
  const targetMargin = body.targetMargin ?? 0.18;

  const breakevenCPM = fixedCPM + wageCPM + addOnsCPM + rollingCPM;
  const targetCPM = targetMargin >= 1 ? breakevenCPM : breakevenCPM / Math.max(1 - targetMargin, 0.01);
  const suggestedRevenue = miles > 0 ? toFixed(targetCPM * miles, 2) : null;

  const currentRevenueCPM = miles > 0 && revenue > 0 ? revenue / miles : null;
  const marginNow =
    currentRevenueCPM != null && currentRevenueCPM > 0 ? 1 - breakevenCPM / currentRevenueCPM : null;

  const notes: string[] = [];
  if (suggestedRevenue != null && suggestedRevenue > revenue) {
    notes.push(`Increase revenue to ${formatCurrency(suggestedRevenue)} to hit ${Math.round(targetMargin * 100)}% margin.`);
  }
  if (rollingCPM > 0.12) {
    notes.push("Rolling CPM is high; review fuel and ops spend.");
  }
  if (marginNow != null && marginNow < targetMargin) {
    notes.push("Current margin is below target.");
  }

  const payload: OptimizePayload = {
    breakevenCPM: toFixed(breakevenCPM, 2),
    targetMarginPct: toFixed(targetMargin * 100, 1),
    targetCPM: toFixed(targetCPM, 2),
    suggestedRevenue,
    marginNowPct: marginNow != null ? toFixed(marginNow * 100, 1) : null,
    notes,
  };

  return NextResponse.json(payload);
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
