import { NextResponse } from "next/server";
import { z } from "zod";
import { calcBreakevenCPM, computeUrgency, marginFromRates, suggestRate } from "@/lib/booking";

export const runtime = "nodejs";

const SnapshotSchema = z
  .object({
    orderId: z.string().optional(),
    driver: z.string().optional(),
    unit: z.string().optional(),
    miles: z.number().nullable().optional(),
    revenue: z.number().nullable().optional(),
    fixedCPM: z.number().nullable().optional(),
    wageCPM: z.number().nullable().optional(),
    addOnsCPM: z.number().nullable().optional(),
    rollingCPM: z.number().nullable().optional(),
    tripStart: z.string().nullable().optional(),
    tripEnd: z.string().nullable().optional(),
  })
  .nullable();

const DriverSchema = z.object({
  id: z.string(),
  name: z.string(),
  homeBase: z.string().nullable().optional(),
});

const UnitSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.string().nullable().optional(),
  homeBase: z.string().nullable().optional(),
});

const RequestSchema = z.object({
  order: z.record(z.any()).optional(),
  snapshot: SnapshotSchema.optional(),
  drivers: z.array(DriverSchema).optional(),
  units: z.array(UnitSchema).optional(),
  targetMargin: z.number().optional(),
});

function normalizeNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { order, snapshot, drivers = [], units = [], targetMargin = 0.18 } = parsed.data;

  const miles = normalizeNumber(snapshot?.miles) ?? 0;
  const costComponents = {
    fixedCPM: normalizeNumber(snapshot?.fixedCPM) ?? 0,
    wageCPM: normalizeNumber(snapshot?.wageCPM) ?? 0,
    addOnsCPM: normalizeNumber(snapshot?.addOnsCPM) ?? 0,
    rollingCPM: normalizeNumber(snapshot?.rollingCPM) ?? 0,
  };

  const breakevenCPM = calcBreakevenCPM(costComponents);
  const baseCost = miles > 0 ? breakevenCPM * miles : 0;
  const targetSuggestion = suggestRate({ miles, breakevenCPM, targetMargin });
  const expectedMargin = marginFromRates({ breakevenCPM, suggestedCPM: targetSuggestion.cpm }) ?? targetMargin;

  const urgency = computeUrgency({
    puWindowStart: order?.puWindowStart ? new Date(order.puWindowStart as string) : null,
    delWindowEnd: order?.delWindowEnd ? new Date(order.delWindowEnd as string) : null,
  } as any);

  const deterministic: any = {
    driverId: null,
    unitId: null,
    start: order?.puWindowStart ?? null,
    suggestedCPM: targetSuggestion.cpm,
    suggestedTotal: targetSuggestion.total,
    expectedMarginPct: expectedMargin,
    rationale: "Deterministic suggestion based on provided cost profile.",
    fallback: true,
  };

  const aiContext = {
    order,
    snapshot,
    drivers,
    units,
    urgency,
    miles,
    breakevenCPM,
    baseCost,
    targetMargin,
    targetSuggestion,
  };

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an expert dispatcher helping a fleet coordinator choose the best trip plan. Always output valid JSON with keys driverId, driverName, unitId, unitCode, start, suggestedCPM, suggestedTotal, expectedMarginPct, rationale. Never suggest a CPM below the breakevenCPM. Apply a rush premium when urgency is HIGH or NOW.",
            },
            {
              role: "user",
              content: JSON.stringify(aiContext),
            },
          ],
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const message = json?.choices?.[0]?.message?.content;
        if (message) {
          const parsedMessage = JSON.parse(message);
          deterministic.driverId = parsedMessage.driverId ?? deterministic.driverId;
          deterministic.driverName = parsedMessage.driverName ?? null;
          deterministic.unitId = parsedMessage.unitId ?? deterministic.unitId;
          deterministic.unitCode = parsedMessage.unitCode ?? null;
          deterministic.start = parsedMessage.start ?? deterministic.start;
          deterministic.suggestedCPM = Math.max(parsedMessage.suggestedCPM ?? deterministic.suggestedCPM, breakevenCPM);
          deterministic.suggestedTotal = parsedMessage.suggestedTotal ?? deterministic.suggestedTotal;
          deterministic.expectedMarginPct = parsedMessage.expectedMarginPct ?? deterministic.expectedMarginPct;
          deterministic.rationale = parsedMessage.rationale ?? deterministic.rationale;
          deterministic.fallback = false;
        }
      }
    } catch (error) {
      console.error("AI plan request failed", error);
    }
  }

  if (!deterministic.suggestedTotal && deterministic.suggestedCPM && miles > 0) {
    deterministic.suggestedTotal = Number((deterministic.suggestedCPM * miles).toFixed(2));
  }

  if (!deterministic.expectedMarginPct && deterministic.suggestedCPM) {
    deterministic.expectedMarginPct = marginFromRates({
      breakevenCPM,
      suggestedCPM: deterministic.suggestedCPM,
    });
  }

  return NextResponse.json({
    recommendation: deterministic,
    breakevenCPM,
    baseCost,
    targetMargin,
    urgency,
  });
}
