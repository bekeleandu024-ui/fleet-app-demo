import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { calcCost } from "@/lib/costing";
import { TripCreate } from "@/lib/schemas";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function clipSegment(value: string | null | undefined, maxLength: number, { removeHyphen = false } = {}) {
  if (!value) return null;
  const slug = slugify(value);
  if (!slug) return null;
  const normalized = removeHyphen ? slug.replace(/-/g, "") : slug;
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).replace(/-+$/g, "");
}

async function generateTripId(driver: string, unit: string, bookingDate: Date) {
  const dateSegment = [
    bookingDate.getFullYear(),
    String(bookingDate.getMonth() + 1).padStart(2, "0"),
    String(bookingDate.getDate()).padStart(2, "0"),
  ].join("");

  const driverSegment = clipSegment(driver, 18);
  const unitSegment = clipSegment(unit, 12, { removeHyphen: true });

  const pieces = [driverSegment, dateSegment, unitSegment].filter((piece): piece is string => Boolean(piece));
  const baseId = (pieces.length ? pieces : ["trip", dateSegment]).join("-");

  let candidate = baseId;
  let suffix = 1;
  // ensure uniqueness by appending an incrementing suffix when needed
  while (true) {
    const exists = await prisma.trip.findUnique({ where: { id: candidate } });
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }
}

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

  const bookingDate = b.tripStart ? new Date(b.tripStart) : new Date();

  // start of week (Sun 00:00) from tripStart (or now)
  const weekStart = new Date(bookingDate);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // ---- Fill CPM defaults from matched Rate when type/zone provided ----
  const requestedType = b.type ?? undefined;
  const requestedZone = b.zone ?? undefined;

  let fixedCPM = b.fixedCPM ?? undefined;
  let wageCPM = b.wageCPM ?? undefined;
  let addOnsCPM = b.addOnsCPM ?? undefined;
  let rollingCPM = b.rollingCPM ?? undefined;
  let rateId: string | null = b.rateId ?? null;

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
    const tryExact =
      requestedType && requestedZone
        ? await prisma.rate.findFirst({ where: { type: requestedType, zone: requestedZone } })
        : null;

    const tryType =
      !tryExact && requestedType
        ? await prisma.rate.findFirst({ where: { type: requestedType, zone: null } })
        : null;

    const tryZone =
      !tryExact && !tryType && requestedZone
        ? await prisma.rate.findFirst({ where: { zone: requestedZone, type: null } })
        : null;

    const tryDefault =
      !tryExact && !tryType && !tryZone
        ? await prisma.rate.findFirst({ where: { type: null, zone: null } })
        : null;

    const rate = tryExact ?? tryType ?? tryZone ?? tryDefault;

    if (rate) {
      await applyRate(rate.id);
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
  const tripId = await generateTripId(b.driver, b.unit, bookingDate);

  const trip = await prisma.trip.create({
    data: {
      id: tripId,
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
