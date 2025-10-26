import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import EditForm from "./ui-edit-form";

export default async function TripEditPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      driverRef: true,
      unitRef: true,
      rateRef: true,
    },
  });

  if (!trip) {
    notFound();
  }

  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });
  const units = await prisma.unit.findMany({ orderBy: { code: "asc" } });
  const rates = await prisma.rate.findMany({ orderBy: [{ type: "asc" }, { zone: "asc" }] });
  const typeValues = await prisma.trip.findMany({ distinct: ["type"], where: { type: { not: null } }, select: { type: true } });
  const zoneValues = await prisma.trip.findMany({ distinct: ["zone"], where: { zone: { not: null } }, select: { zone: true } });

  const sTrip = {
    id: trip.id,
    driver: trip.driver,
    unit: trip.unit,
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
    type: trip.type,
    zone: trip.zone,
    status: trip.status,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    driverId: trip.driverId,
    unitId: trip.unitId,
    rateId: trip.rateId,
    tripStart: trip.tripStart ? trip.tripStart.toISOString() : null,
    tripEnd: trip.tripEnd ? trip.tripEnd.toISOString() : null,
  };

  const driverOptions = drivers.map(driver => ({ id: driver.id, name: driver.name }));
  const unitOptions = units.map(unit => ({ id: unit.id, code: unit.code }));
  const typeOptions = typeValues
    .map(entry => entry.type)
    .filter((value): value is string => Boolean(value))
    .sort();
  const zoneOptions = zoneValues
    .map(entry => entry.zone)
    .filter((value): value is string => Boolean(value))
    .sort();
  const rateOptions = rates.map(rate => ({
    id: rate.id,
    label: [rate.type, rate.zone].filter(Boolean).join(" • ") || "Rate",
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
  }));

  return (
    <EditForm
      trip={sTrip}
      drivers={driverOptions}
      units={unitOptions}
      types={typeOptions}
      zones={zoneOptions}
      rates={rateOptions}
    />
  );
}
