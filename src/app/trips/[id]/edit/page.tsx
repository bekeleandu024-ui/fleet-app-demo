import EditTripClientShell from "./EditTripClientShell";
import { prisma } from "@/src/server/prisma";
import { mapTripToDTO } from "./map";
import { stripDecimalsDeep, toNum } from "@/lib/serialize";
import type { SimilarTripSummary, DriverLite, UnitLite } from "./types";
import type { Prisma } from "@prisma/client";

type PageParams = { params: Promise<{ id: string }> };

type TripWithOrder = Prisma.TripGetPayload<{ include: { order: true } }>;

type SimilarSelect = {
  miles: Prisma.Decimal | number | null;
  revenue: Prisma.Decimal | number | null;
  fixedCPM: Prisma.Decimal | number | null;
  wageCPM: Prisma.Decimal | number | null;
  addOnsCPM: Prisma.Decimal | number | null;
  rollingCPM: Prisma.Decimal | number | null;
  totalCPM: Prisma.Decimal | number | null;
  totalCost: Prisma.Decimal | number | null;
  profit: Prisma.Decimal | number | null;
  marginPct: Prisma.Decimal | number | null;
  createdAt: Date;
};

const toRecentSimilar = (rows: SimilarSelect[]): SimilarTripSummary[] =>
  rows.map((row) => ({
    miles: toNum(row.miles),
    revenue: toNum(row.revenue),
    fixedCPM: toNum(row.fixedCPM),
    wageCPM: toNum(row.wageCPM),
    addOnsCPM: toNum(row.addOnsCPM),
    rollingCPM: toNum(row.rollingCPM),
    totalCPM: toNum(row.totalCPM),
    totalCost: toNum(row.totalCost),
    profit: toNum(row.profit),
    marginPct: toNum(row.marginPct),
    createdAt: row.createdAt.toISOString(),
  }));

const toAvailableList = (values: Array<string | null | undefined>): string[] =>
  values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .filter((value, index, array) => array.indexOf(value) === index)
    .sort((a, b) => a.localeCompare(b));

export default async function EditTrip({ params }: PageParams) {
  const { id } = await params;

  const tripRaw: TripWithOrder | null = await prisma.trip.findUnique({
    where: { id },
    include: { order: true },
  });

  if (!tripRaw) {
    return <main className="p-6">Trip not found.</main>;
  }

  const trip = mapTripToDTO(tripRaw);

  const baseWhere: Prisma.TripWhereInput = { NOT: { id: tripRaw.id } };

  const similarWhere: Prisma.TripWhereInput = tripRaw.order
    ? {
        ...baseWhere,
        order: {
          is: {
            origin: tripRaw.order.origin ?? null,
            destination: tripRaw.order.destination ?? null,
          },
        },
      }
    : {
        ...baseWhere,
        ...(tripRaw.type ? { type: tripRaw.type } : {}),
        ...(tripRaw.zone ? { zone: tripRaw.zone } : {}),
      };

  const [driversRaw, unitsRaw, typeRows, zoneRows, similarRaw] = await Promise.all([
    prisma.driver.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, homeBase: true, active: true },
    }),
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, type: true, homeBase: true, active: true },
    }),
    prisma.rate.findMany({
      distinct: ["type"],
      select: { type: true },
    }),
    prisma.rate.findMany({
      distinct: ["zone"],
      select: { zone: true },
    }),
    prisma.trip.findMany({
      where: similarWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
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
    }),
  ]);

  const drivers: DriverLite[] = stripDecimalsDeep(driversRaw);
  const units: UnitLite[] = stripDecimalsDeep(unitsRaw);

  const availableTypes = toAvailableList(typeRows.map((row) => row.type));
  const availableZones = toAvailableList(zoneRows.map((row) => row.zone));

  const recentSimilar = toRecentSimilar(similarRaw);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <EditTripClientShell
        trip={trip}
        drivers={drivers}
        units={units}
        availableTypes={availableTypes}
        availableZones={availableZones}
        recentSimilar={recentSimilar}
      />
    </main>
  );
}
