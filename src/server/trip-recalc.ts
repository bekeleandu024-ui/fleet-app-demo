import prisma from "@/lib/prisma";

export type TripTotals = {
  miles: number;
  revenue: number | null;
  fixedCPM: number | null;
  wageCPM: number | null;
  addOnsCPM: number | null;
  rollingCPM: number | null;
  totalCPM: number | null;
  totalCost: number | null;
  profit: number | null;
  marginPct: number | null;
};

export async function recalcTripTotals(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { rateRef: true },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const before: TripTotals = {
    miles: Number(trip.miles),
    revenue: trip.revenue ? Number(trip.revenue) : null,
    fixedCPM: trip.fixedCPM ? Number(trip.fixedCPM) : null,
    wageCPM: trip.wageCPM ? Number(trip.wageCPM) : null,
    addOnsCPM: trip.addOnsCPM ? Number(trip.addOnsCPM) : null,
    rollingCPM: trip.rollingCPM ? Number(trip.rollingCPM) : null,
    totalCPM: trip.totalCPM ? Number(trip.totalCPM) : null,
    totalCost: trip.totalCost ? Number(trip.totalCost) : null,
    profit: trip.profit ? Number(trip.profit) : null,
    marginPct: trip.marginPct ? Number(trip.marginPct) : null,
  };

  let { fixedCPM, wageCPM, addOnsCPM, rollingCPM } = before;
  let rateApplied: { id: string; label: string } | undefined;

  if ((!fixedCPM || !wageCPM || !addOnsCPM || !rollingCPM) && trip.rateRef) {
    const rate = trip.rateRef;
    rateApplied = {
      id: rate.id,
      label: [rate.type, rate.zone].filter(Boolean).join(" • ") || "Rate",
    };
    fixedCPM = fixedCPM ?? Number(rate.fixedCPM);
    wageCPM = wageCPM ?? Number(rate.wageCPM);
    addOnsCPM = addOnsCPM ?? Number(rate.addOnsCPM);
    rollingCPM = rollingCPM ?? Number(rate.rollingCPM);
  }

  const totals = sumTotals({
    miles: before.miles,
    revenue: before.revenue,
    fixedCPM,
    wageCPM,
    addOnsCPM,
    rollingCPM,
  });

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      fixedCPM: totals.fixedCPM,
      wageCPM: totals.wageCPM,
      addOnsCPM: totals.addOnsCPM,
      rollingCPM: totals.rollingCPM,
      totalCPM: totals.totalCPM,
      totalCost: totals.totalCost,
      profit: totals.profit,
      marginPct: totals.marginPct,
    },
  });

  const after: TripTotals = {
    miles: Number(updated.miles),
    revenue: updated.revenue ? Number(updated.revenue) : null,
    fixedCPM: updated.fixedCPM ? Number(updated.fixedCPM) : null,
    wageCPM: updated.wageCPM ? Number(updated.wageCPM) : null,
    addOnsCPM: updated.addOnsCPM ? Number(updated.addOnsCPM) : null,
    rollingCPM: updated.rollingCPM ? Number(updated.rollingCPM) : null,
    totalCPM: updated.totalCPM ? Number(updated.totalCPM) : null,
    totalCost: updated.totalCost ? Number(updated.totalCost) : null,
    profit: updated.profit ? Number(updated.profit) : null,
    marginPct: updated.marginPct ? Number(updated.marginPct) : null,
  };

  return {
    trip: {
      id: trip.id,
      driver: trip.driver,
      unit: trip.unit,
      type: trip.type,
      zone: trip.zone,
      status: trip.status,
    },
    before,
    after,
    rateApplied,
  };
}

function sumTotals({
  miles,
  revenue,
  fixedCPM,
  wageCPM,
  addOnsCPM,
  rollingCPM,
}: {
  miles: number;
  revenue: number | null;
  fixedCPM: number | null | undefined;
  wageCPM: number | null | undefined;
  addOnsCPM: number | null | undefined;
  rollingCPM: number | null | undefined;
}): TripTotals {
  const safeFixed = fixedCPM ?? 0;
  const safeWage = wageCPM ?? 0;
  const safeAddOns = addOnsCPM ?? 0;
  const safeRolling = rollingCPM ?? 0;
  const totalCPM = safeFixed + safeWage + safeAddOns + safeRolling;
  const totalCost = Number.isFinite(miles) ? (miles * totalCPM) / 100 : null;
  const profit = revenue != null && totalCost != null ? revenue - totalCost : null;
  const marginPct = revenue && revenue !== 0 && profit != null ? (profit / revenue) * 100 : null;

  return {
    miles,
    revenue,
    fixedCPM: fixedCPM ?? null,
    wageCPM: wageCPM ?? null,
    addOnsCPM: addOnsCPM ?? null,
    rollingCPM: rollingCPM ?? null,
    totalCPM,
    totalCost,
    profit,
    marginPct,
  };
}
