import { notFound } from "next/navigation";

import prisma from "@/server/prisma";

import EditForm from "./ui-edit-form";

interface PageParams {
  params: {
    id: string;
  };
}

function filterNullish(values: Array<string | null>): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

export default async function EditTrip({ params }: PageParams) {
  const trip = await prisma.trip.findUnique({ where: { id: params.id } });

  if (!trip) {
    notFound();
  }

  const [drivers, units, typeRecords, zoneRecords] = await Promise.all([
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

  const types = filterNullish(typeRecords.map(({ type }) => type)).sort((a, b) => a.localeCompare(b));
  const zones = filterNullish(zoneRecords.map(({ zone }) => zone)).sort((a, b) => a.localeCompare(b));

  return (
    <EditForm
      trip={trip}
      drivers={drivers}
      units={units}
      types={types}
      zones={zones}
    />
  );
}
