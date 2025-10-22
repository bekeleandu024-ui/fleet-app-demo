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

  // start of week (Sun 00:00) from tripStart (or now)
  const weekStart = b.tripStart ? new Date(b.tripStart) : new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // ---- Fill CPM defaults from matched Rate when type/zone provided ----
  const requestedType = b.type?.trim() || undefined;
  const requestedZone = b.zone?.trim() || undefined;

  let fixedCPM = b.fixedCPM ?? undefined;
  let wageCPM = b.wageCPM ?? undefined;
  let addOnsCPM = b.addOnsCPM ?? undefined;
  let rollingCPM = b.rollingCPM ?? undefined;
  let rateId: string | null = null;

  if (requestedType || requestedZone) {
    // fallback order: exact -> type-only -> zone-only -> global default (both null)
    const tryExact =
      requestedType && requestedZone
        ? await prisma.rate.findFirst({ where: { type: requestedType, zone: requestedZone } })
        : null;

    const tryType = !tryExact && requestedType
      ? await prisma.rate.findFirst({ where: { type: requestedType, zone: null } })
      : null;

    const tryZone = !tryExact && !tryType && requestedZone
      ? await prisma.rate.findFirst({ where: { zone: requestedZone, type: null } })
      : null;

    const tryDefault =
      !tryExact && !tryType && !tryZone
        ? await prisma.rate.findFirst({ where: { type: null, zone: null } })
        : null;

    const rate = tryExact ?? tryType ?? tryZone ?? tryDefault;

    if (rate) {
      rateId = rate.id;
      if (fixedCPM == null) fixedCPM = Number(rate.fixedCPM);
      if (wageCPM == null) wageCPM = Number(rate.wageCPM);
      if (addOnsCPM == null) addOnsCPM = Number(rate.addOnsCPM);
      if (rollingCPM == null) rollingCPM = Number(rate.rollingCPM);
    }
  }

  // ---- Costing (uses supplied or defaulted CPMs) ----
  const { totalCPM, totalCost, profit, marginPct } = calcCost({
    miles: b.miles,
    fixedCPM,
    wageCPM,
    addOnsCPM,
    rollingCPM,
    revenue: b.revenue,
  });

  // ---- Create trip ----
  const trip = await prisma.trip.create({
    data: {
      orderId: b.orderId ?? null,

      // persist both IDs + display strings
      driverId: b.driverId ?? null,
      unitId: b.unitId ?? null,
      driver: b.driver,
      unit: b.unit,

      // store the matched metadata too
      type: b.type ?? null,
      zone: b.zone ?? null,

      miles: b.miles,
      revenue: b.revenue ?? null,
      fixedCPM: fixedCPM ?? null,
      wageCPM: wageCPM ?? null,
      addOnsCPM: addOnsCPM ?? null,
      rollingCPM: rollingCPM ?? null,

      tripStart: b.tripStart ? new Date(b.tripStart) : null,
      tripEnd: b.tripEnd ? new Date(b.tripEnd) : null,
      weekStart,

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
