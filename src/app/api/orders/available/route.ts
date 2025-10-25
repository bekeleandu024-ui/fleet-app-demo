import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { calcBreakevenCPM, computeUrgency, suggestRate } from "@/lib/booking";

export async function GET() {
  const [orders, referenceRate] = await Promise.all([
    prisma.order.findMany({
      where: { trips: { none: {} } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rate.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  const costTemplate = referenceRate
    ? {
        fixedCPM: Number(referenceRate.fixedCPM),
        wageCPM: Number(referenceRate.wageCPM),
        addOnsCPM: Number(referenceRate.addOnsCPM),
        rollingCPM: Number(referenceRate.rollingCPM),
      }
    : { fixedCPM: 0, wageCPM: 0, addOnsCPM: 0, rollingCPM: 0 };

  const breakeven = calcBreakevenCPM(costTemplate);

  const payload = orders.map((order) => {
    const urgency = computeUrgency(order);
    const suggestion = suggestRate({ miles: 0, breakevenCPM: breakeven, targetMargin: 0.18 });

    return {
      id: order.id,
      customer: order.customer,
      origin: order.origin,
      destination: order.destination,
      puWindowStart: order.puWindowStart,
      puWindowEnd: order.puWindowEnd,
      delWindowStart: order.delWindowStart,
      delWindowEnd: order.delWindowEnd,
      createdAt: order.createdAt,
      urgency,
      breakevenCPM: breakeven,
      suggestedCPM: suggestion.cpm,
      suggestedTotal: suggestion.total,
    };
  });

  return NextResponse.json({ orders: payload });
}
