import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { calcCost } from "@/lib/costing";
import { TripCreate } from "@/lib/schemas";

function startOfWeekFrom(date: Date | null): Date | null {
  if (!date) return null;
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

type RouteContext = { params: { id: string } };

export async function PATCH(req: Request, { params }: RouteContext) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof rawBody !== "object" || rawBody === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = TripCreate.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const trip = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = rawBody as Record<string, unknown>;
  const data = parsed.data;

  const requestedType = data.type ?? undefined;
  const requestedZone = data.zone ?? undefined;

  let fixedCPM = data.fixedCPM ?? undefined;
  let wageCPM = data.wageCPM ?? undefined;
  let addOnsCPM = data.addOnsCPM ?? undefined;
  let rollingCPM = data.rollingCPM ?? undefined;
  let rateId: string | null = data.rateId ?? null;

  async function applyRate(rateIdToUse: string | null) {
    if (!rateIdToUse) return;
    const rate = await prisma.rate.findUnique({ where: { id: rateIdToUse } });
    if (!rate) {
      rateId = null;
      return;
    }
    rateId = rate.id;
    if (fixedCPM == null) fixedCPM = Number(rate.fixedCPM);
    if (wageCPM == null) wageCPM = Number(rate.wageCPM);
    if (addOnsCPM == null) addOnsCPM = Number(rate.addOnsCPM);
    if (rollingCPM == null) rollingCPM = Number(rate.rollingCPM);
  }

  await applyRate(rateId);

  if (!rateId && (requestedType || requestedZone)) {
    const exact =
      requestedType && requestedZone
        ? await prisma.rate.findFirst({ where: { type: requestedType, zone: requestedZone } })
        : null;
    const typeOnly =
      !exact && requestedType
        ? await prisma.rate.findFirst({ where: { type: requestedType, zone: null } })
        : null;
    const zoneOnly =
      !exact && !typeOnly && requestedZone
        ? await prisma.rate.findFirst({ where: { zone: requestedZone, type: null } })
        : null;
    const fallback =
      !exact && !typeOnly && !zoneOnly
        ? await prisma.rate.findFirst({ where: { type: null, zone: null } })
        : null;

    const matched = exact ?? typeOnly ?? zoneOnly ?? fallback;
    if (matched) {
      await applyRate(matched.id);
    }
  }

  const { totalCPM, totalCost, profit, marginPct } = calcCost({
    miles: data.miles,
    fixedCPM,
    wageCPM,
    addOnsCPM,
    rollingCPM,
    revenue: data.revenue,
  });

  const hasTripStart = Object.prototype.hasOwnProperty.call(body, "tripStart");
  const hasTripEnd = Object.prototype.hasOwnProperty.call(body, "tripEnd");

  const nextTripStart = hasTripStart
    ? data.tripStart ?? null
    : undefined;
  const nextTripEnd = hasTripEnd ? data.tripEnd ?? null : undefined;
  const nextWeekStart = hasTripStart
    ? startOfWeekFrom(data.tripStart ?? null)
    : undefined;

  const updated = await prisma.trip.update({
    where: { id: params.id },
    data: {
      driverId: data.driverId ?? null,
      unitId: data.unitId ?? null,
      driver: data.driver,
      unit: data.unit,
      type: data.type ?? null,
      zone: data.zone ?? null,
      miles: data.miles,
      revenue: data.revenue ?? null,
      fixedCPM: fixedCPM ?? null,
      wageCPM: wageCPM ?? null,
      addOnsCPM: addOnsCPM ?? null,
      rollingCPM: rollingCPM ?? null,
      ...(hasTripStart ? { tripStart: nextTripStart } : {}),
      ...(hasTripEnd ? { tripEnd: nextTripEnd } : {}),
      ...(hasTripStart ? { weekStart: nextWeekStart } : {}),
      totalCPM,
      totalCost,
      profit,
      marginPct,
      rateId,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, tripId: updated.id });
}
