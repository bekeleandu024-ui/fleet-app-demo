import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { calcCost } from "@/lib/costing";

async function findRate(type?: string | null, zone?: string | null) {
  let rate = await prisma.rate.findFirst({
    where: { type: type ?? undefined, zone: zone ?? undefined },
  });

  if (!rate && type) {
    rate = await prisma.rate.findFirst({ where: { type, zone: null } });
  }
  if (!rate && zone) {
    rate = await prisma.rate.findFirst({ where: { zone, type: null } });
  }
  if (!rate) {
    rate = await prisma.rate.findFirst({ where: { type: null, zone: null } });
  }

  return rate;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let fixedCPM = trip.fixedCPM;
  let wageCPM = trip.wageCPM;
  let addOnsCPM = trip.addOnsCPM;
  let rollingCPM = trip.rollingCPM;

  if (fixedCPM == null || wageCPM == null || addOnsCPM == null || rollingCPM == null) {
    const rate = await findRate(trip.type, trip.zone);
    if (rate) {
      if (fixedCPM == null) fixedCPM = Number(rate.fixedCPM);
      if (wageCPM == null) wageCPM = Number(rate.wageCPM);
      if (addOnsCPM == null) addOnsCPM = Number(rate.addOnsCPM);
      if (rollingCPM == null) rollingCPM = Number(rate.rollingCPM);
    }
  }

  const { totalCPM, totalCost, profit, marginPct } = calcCost({
    miles: Number(trip.miles),
    revenue: trip.revenue == null ? null : Number(trip.revenue),
    fixedCPM: fixedCPM == null ? null : Number(fixedCPM),
    wageCPM: wageCPM == null ? null : Number(wageCPM),
    addOnsCPM: addOnsCPM == null ? null : Number(addOnsCPM),
    rollingCPM: rollingCPM == null ? null : Number(rollingCPM),
  });

  const updated = await prisma.trip.update({
    where: { id: trip.id },
    data: {
      fixedCPM,
      wageCPM,
      addOnsCPM,
      rollingCPM,
      totalCPM,
      totalCost,
      profit,
      marginPct,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, tripId: updated.id, totalCPM, totalCost, profit, marginPct });
}
