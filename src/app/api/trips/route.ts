import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { calcCost } from "@/lib/costing";
import { TripCreate } from "@/lib/schemas";

export async function GET() {
  const trips = await prisma.trip.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(trips);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = TripCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const b = parsed.data;

  // beginning of week for tripStart or now
  const weekStart = b.tripStart ? new Date(b.tripStart) : new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const { totalCPM, totalCost, profit, marginPct } = calcCost({
    miles: Number(b.miles),
    fixedCPM: b.fixedCPM,
    wageCPM: b.wageCPM,
    addOnsCPM: b.addOnsCPM,
    rollingCPM: b.rollingCPM,
    revenue: b.revenue,
  });

  const trip = await prisma.trip.create({
    data: {
      orderId: b.orderId ?? null,
      // store both IDs and display strings
      driverId: b.driverId ?? null,
      unitId: b.unitId ?? null,
      driver: b.driver,
      unit: b.unit,
      type: b.type ?? null,
      zone: b.zone ?? null,

      miles: b.miles,
      revenue: b.revenue ?? null,
      fixedCPM: b.fixedCPM ?? null,
      wageCPM: b.wageCPM ?? null,
      addOnsCPM: b.addOnsCPM ?? null,
      rollingCPM: b.rollingCPM ?? null,

      tripStart: b.tripStart ? new Date(b.tripStart) : null,
      tripEnd: b.tripEnd ? new Date(b.tripEnd) : null,
      weekStart,

      totalCPM,
      totalCost,
      profit,
      marginPct,
      status: "Dispatched",
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, tripId: trip.id });
}
