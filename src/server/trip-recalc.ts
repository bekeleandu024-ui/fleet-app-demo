import prisma from "@/server/prisma";
import { calcCost } from "@/lib/costing";

function toNumber(value: any) {
  return value == null ? null : Number(value);
}

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

export type TripRecalcTotals = {
  fixedCPM: number | null;
  wageCPM: number | null;
  addOnsCPM: number | null;
  rollingCPM: number | null;
  totalCPM: number | null;
  totalCost: number | null;
  profit: number | null;
  marginPct: number | null;
};

export type TripRecalcResult = {
  trip: {
    id: string;
    driver: string;
    unit: string;
    type: string | null;
    zone: string | null;
    status: string;
    miles: number;
    revenue: number | null;
  };
  before: TripRecalcTotals;
  after: TripRecalcTotals;
  rateApplied: {
    id: string;
    type: string | null;
    zone: string | null;
  } | null;
};

export async function recalcTripTotals(tripId: string): Promise<TripRecalcResult | null> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return null;

  const before: TripRecalcTotals = {
    fixedCPM: toNumber(trip.fixedCPM),
    wageCPM: toNumber(trip.wageCPM),
    addOnsCPM: toNumber(trip.addOnsCPM),
    rollingCPM: toNumber(trip.rollingCPM),
    totalCPM: toNumber(trip.totalCPM),
    totalCost: toNumber(trip.totalCost),
    profit: toNumber(trip.profit),
    marginPct: toNumber(trip.marginPct),
  };

  let fixedCPM = before.fixedCPM;
  let wageCPM = before.wageCPM;
  let addOnsCPM = before.addOnsCPM;
  let rollingCPM = before.rollingCPM;
  let rateApplied: { id: string; type: string | null; zone: string | null } | null = null;

  if (fixedCPM == null || wageCPM == null || addOnsCPM == null || rollingCPM == null) {
    const rate = await findRate(trip.type, trip.zone);
    if (rate) {
      rateApplied = { id: rate.id, type: rate.type, zone: rate.zone };
      if (fixedCPM == null) fixedCPM = Number(rate.fixedCPM);
      if (wageCPM == null) wageCPM = Number(rate.wageCPM);
      if (addOnsCPM == null) addOnsCPM = Number(rate.addOnsCPM);
      if (rollingCPM == null) rollingCPM = Number(rate.rollingCPM);
    }
  }

  const totals = calcCost({
    miles: Number(trip.miles),
    revenue: trip.revenue == null ? null : Number(trip.revenue),
    fixedCPM: fixedCPM == null ? null : fixedCPM,
    wageCPM: wageCPM == null ? null : wageCPM,
    addOnsCPM: addOnsCPM == null ? null : addOnsCPM,
    rollingCPM: rollingCPM == null ? null : rollingCPM,
  });

  await prisma.trip.update({
    where: { id: trip.id },
    data: {
      fixedCPM,
      wageCPM,
      addOnsCPM,
      rollingCPM,
      totalCPM: totals.totalCPM,
      totalCost: totals.totalCost,
      profit: totals.profit,
      marginPct: totals.marginPct,
    },
  });

  const after: TripRecalcTotals = {
    fixedCPM,
    wageCPM,
    addOnsCPM,
    rollingCPM,
    totalCPM: totals.totalCPM,
    totalCost: totals.totalCost,
    profit: totals.profit,
    marginPct: totals.marginPct,
  };

  return {
    trip: {
      id: trip.id,
      driver: trip.driver,
      unit: trip.unit,
      type: trip.type ?? null,
      zone: trip.zone ?? null,
      status: trip.status,
      miles: Number(trip.miles),
      revenue: trip.revenue == null ? null : Number(trip.revenue),
    },
    before,
    after,
    rateApplied,
  };
}
