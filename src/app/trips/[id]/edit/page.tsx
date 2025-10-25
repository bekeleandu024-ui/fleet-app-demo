import { notFound } from "next/navigation";

import { stripDecimalsDeep } from "@/lib/serialize";
import prisma from "@/server/prisma";

import EditTripClientShell from "./EditTripClientShell";
import { mapTripToDTO } from "./map";
import type { TripDTO } from "./types";

interface PageParams {
  params: Promise<{
    id: string;
  }>;
}

function filterNullish(values: Array<string | null>): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

type SimilarTrip = {
  miles: number | null;
  revenue: number | null;
  fixedCPM: number | null;
  wageCPM: number | null;
  addOnsCPM: number | null;
  rollingCPM: number | null;
  totalCPM: number | null;
  totalCost: number | null;
  profit: number | null;
  marginPct: number | null;
  createdAt: string | Date;
};

export default async function EditTrip({ params }: PageParams) {
  const { id } = await params;

  const tripRaw = await prisma.trip.findUnique({
    where: { id },
    include: { order: true },
  });

  if (!tripRaw) {
    notFound();
  }

  const trip: TripDTO = mapTripToDTO(tripRaw);

  const [driversRaw, unitsRaw, typeRecords, zoneRecords] = await Promise.all([
    prisma.driver.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true },
    }),
    prisma.rate.findMany({
      distinct: ["type"],
      select: { type: true },
    }),
    prisma.rate.findMany({
      distinct: ["zone"],
      select: { zone: true },
    }),
  ]);

  const drivers = stripDecimalsDeep(driversRaw);
  const units = stripDecimalsDeep(unitsRaw);

  const types = filterNullish(typeRecords.map(({ type }) => type)).sort((a, b) => a.localeCompare(b));
  const zones = filterNullish(zoneRecords.map(({ zone }) => zone)).sort((a, b) => a.localeCompare(b));

  const similarWhere = tripRaw.order
    ? {
        order: {
          is: {
            origin: tripRaw.order.origin,
            destination: tripRaw.order.destination,
          },
        },
      }
    : {
        type: tripRaw.type ?? undefined,
        zone: tripRaw.zone ?? undefined,
      };

  const recentSimilarRaw = await prisma.trip.findMany({
    where: similarWhere,
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      miles: true,
      revenue: true,
      fixedCPM: true,
      wageCPM: true,
      addOnsCPM: true,
      rollingCPM: true,
      totalCPM: true,
      totalCost: true,
      profit: true,
      marginPct: true,
      createdAt: true,
    },
  });

  const recentSimilar = stripDecimalsDeep(recentSimilarRaw) as SimilarTrip[];

  const tripWithOptions: TripDTO = {
    ...trip,
    availableTypes: types,
    availableZones: zones,
  };

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <EditTripClientShell
        trip={tripWithOptions}
        drivers={drivers}
        units={units}
        recentSimilar={recentSimilar}
      />
    </main>
  );
}
