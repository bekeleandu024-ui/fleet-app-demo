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

  const parseNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };

  const requestedType =
    typeof body.type === "string" && body.type.trim().length > 0
      ? body.type.trim()
      : undefined;
  const requestedZone =
    typeof body.zone === "string" && body.zone.trim().length > 0
      ? body.zone.trim()
      : undefined;

  let fixedCPM = parseNumber(body.fixedCPM);
  let wageCPM = parseNumber(body.wageCPM);
  let addOnsCPM = parseNumber(body.addOnsCPM);
  let rollingCPM = parseNumber(body.rollingCPM);
  let rateId: string | null = null;

  if (requestedType || requestedZone) {
    const rate = await prisma.rate.findFirst({
      where: {
        ...(requestedType ? { type: requestedType } : {}),
        ...(requestedZone ? { zone: requestedZone } : {}),
      },
    });

    if (rate) {
      rateId = rate.id;
      if (fixedCPM == null) fixedCPM = Number(rate.fixedCPM);
      if (wageCPM == null) wageCPM = Number(rate.wageCPM);
      if (addOnsCPM == null) addOnsCPM = Number(rate.addOnsCPM);
      if (rollingCPM == null) rollingCPM = Number(rate.rollingCPM);
    }
  }

  // compute costs
  const { totalCPM, totalCost, profit, marginPct } = calcCost({
    miles: Number(body.miles),
    fixedCPM,
    wageCPM,
    addOnsCPM,
    rollingCPM,
    revenue: Number(body.revenue ?? 0),
  });

  const trip = await prisma.trip.create({
    data: {
      orderId: body.orderId ?? null,
      driver: body.driver,
      unit: body.unit,
      tripStart: body.tripStart ? new Date(body.tripStart) : null,
      tripEnd: body.tripEnd ? new Date(body.tripEnd) : null,
      weekStart,
      miles: Number(body.miles),
      revenue: body.revenue != null ? Number(body.revenue) : null,
      fixedCPM: fixedCPM != null ? Number(fixedCPM) : null,
      wageCPM: wageCPM != null ? Number(wageCPM) : null,
      addOnsCPM: addOnsCPM != null ? Number(addOnsCPM) : null,
      rollingCPM: rollingCPM != null ? Number(rollingCPM) : null,
      totalCPM,
      totalCost,
      profit,
      marginPct,
      status: "Dispatched",
      rateId,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, tripId: trip.id });
}
