import { NextResponse } from "next/server";
import prisma from "@/server/prisma";

function inferZone(order: {
  origin: string | null;
  destination: string | null;
  notes: string | null;
  requiredTruck: string | null;
}): string | undefined {
  const text = [order.origin, order.destination, order.notes, order.requiredTruck]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLowerCase();

  if (!text) return undefined;

  if (/\b(ontario|toronto|gta|guelph|london|windsor|on)\b/.test(text)) {
    return "Ontario";
  }

  if (/\b(chicago|detroit|wi|wisconsin|il|illinois|mi|michigan|oh|ohio|midwest)\b/.test(text)) {
    return "Midwest";
  }

  if (/\b(new york|ny|nj|new jersey|pa|pennsylvania|ma|massachusetts|east)\b/.test(text)) {
    return "US-East";
  }

  return undefined;
}

async function resolveDriverType(driver?: string | null, unitCode?: string | null) {
  const name = driver?.trim();
  if (name) {
    const driverRecord = await prisma.driver.findUnique({ where: { name } }).catch(() => null);
    if (driverRecord) return driverRecord.active === false ? undefined : "Company";
    const lower = name.toLowerCase();
    if (lower.includes("owner") || lower.includes("oo")) {
      return "OwnerOp";
    }
  }

  const code = unitCode?.trim();
  if (code) {
    const unitRecord = await prisma.unit.findUnique({ where: { code } }).catch(() => null);
    const normalized = code.toUpperCase();
    if (unitRecord) {
      if (unitRecord.code.toUpperCase().startsWith("COM")) return "Company";
    }
    if (normalized.startsWith("COM")) return "Company";
    if (normalized.startsWith("OO") || normalized.startsWith("OWN") || normalized.startsWith("TRK")) {
      return "OwnerOp";
    }
  }

  return undefined;
}

async function findMatchingRate(type?: string, zone?: string) {
  const attempts = [
    { type, zone },
    { type },
    { zone },
    {},
  ];

  for (const where of attempts) {
    const filters = Object.fromEntries(
      Object.entries(where).filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    );
    if (Object.keys(filters).length === 0 && where !== attempts[attempts.length - 1]) {
      continue;
    }

    const rate = await prisma.rate.findFirst({ where: filters }).catch(() => null);
    if (rate) return rate;
  }

  return null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const orderId = typeof payload.orderId === "string" ? payload.orderId : undefined;
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const inferredZone = inferZone({
    origin: order.origin,
    destination: order.destination,
    notes: order.notes,
    requiredTruck: order.requiredTruck,
  });

  const inferredType = await resolveDriverType(
    typeof payload.driver === "string" ? payload.driver : undefined,
    typeof payload.unit === "string" ? payload.unit : undefined
  );

  const rate = await findMatchingRate(inferredType, inferredZone);

  if (!rate) {
    return NextResponse.json({
      found: false,
      type: inferredType ?? null,
      zone: inferredZone ?? null,
    });
  }

  return NextResponse.json({
    found: true,
    rateId: rate.id,
    type: rate.type ?? inferredType ?? null,
    zone: rate.zone ?? inferredZone ?? null,
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
  });
}
