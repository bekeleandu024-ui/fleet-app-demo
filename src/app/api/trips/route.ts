import { NextResponse } from "next/server";
import prisma from "@/src/server/prisma";
import { TripCreate } from "@/src/lib/schemas";
import { calcCost } from "@/src/lib/costing";

export async function GET() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(trips);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = TripCreate.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  const tripStart = data.tripStart ?? null;
  const tripEnd = data.tripEnd ?? null;

  const weekStartSource = tripStart ?? new Date();
  const weekStart = new Date(weekStartSource);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const { totalCPM, totalCost, profit, marginPct } = calcCost({
    miles: data.miles,
    fixedCPM: data.fixedCPM,
    wageCPM: data.wageCPM,
    addOnsCPM: data.addOnsCPM,
    rollingCPM: data.rollingCPM,
    revenue: data.revenue,
  });

  const trip = await prisma.trip.create({
    data: {
      orderId: data.orderId ?? null,
      driverId: data.driverId ?? null,
      unitId: data.unitId ?? null,
      driver: data.driver,
      unit: data.unit,
      tripStart,
      tripEnd,
      weekStart,
      miles: data.miles,
      revenue: data.revenue ?? null,
      fixedCPM: data.fixedCPM ?? null,
      wageCPM: data.wageCPM ?? null,
      addOnsCPM: data.addOnsCPM ?? null,
      rollingCPM: data.rollingCPM ?? null,
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
