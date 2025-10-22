// src/app/api/trips/route.ts
import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { calcCost } from "@/lib/costing";

export async function GET() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(trips);
}

export async function POST(req: Request) {
  const body = await req.json();

  // basic validation
  if (!body.driver || !body.unit || body.miles == null) {
    return NextResponse.json(
      { error: "driver, unit, miles are required" },
      { status: 400 }
    );
  }

  // compute weekStart (Sunday)
  const weekStart = body.tripStart ? new Date(body.tripStart) : new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // compute costs
  const { totalCPM, totalCost, profit, marginPct } = calcCost({
    miles: Number(body.miles),
    fixedCPM: Number(body.fixedCPM ?? 0),
    wageCPM: Number(body.wageCPM ?? 0),
    addOnsCPM: Number(body.addOnsCPM ?? 0),
    rollingCPM: Number(body.rollingCPM ?? 0),
    revenue: Number(body.revenue ?? 0),
  });

  const trip = await prisma.trip.create({
    data: {
      orderId: body.orderId ?? null,
      driver: body.driver,
      driverId: body.driverId ?? null,
      unit: body.unit,
      tripStart: body.tripStart ? new Date(body.tripStart) : null,
      tripEnd: body.tripEnd ? new Date(body.tripEnd) : null,
      weekStart,
      miles: Number(body.miles),
      revenue: body.revenue != null ? Number(body.revenue) : null,
      fixedCPM: body.fixedCPM != null ? Number(body.fixedCPM) : null,
      wageCPM: body.wageCPM != null ? Number(body.wageCPM) : null,
      addOnsCPM: body.addOnsCPM != null ? Number(body.addOnsCPM) : null,
      rollingCPM: body.rollingCPM != null ? Number(body.rollingCPM) : null,
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
