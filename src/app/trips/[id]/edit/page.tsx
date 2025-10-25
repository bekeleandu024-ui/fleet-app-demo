import { prisma } from "@/src/server/prisma";
import { stripDecimalsDeep } from "@/lib/serialize";
import { mapTripToDTO } from "./map";
import type { TripDTO } from "./types";
import EditTripClientShell from "./EditTripClientShell";
import type { Prisma } from "@prisma/client";

type PageParams = { params: Promise<{ id: string }> };

export default async function EditTrip({ params }: PageParams) {
  // Next 15: await params
  const { id } = await params;

  const tripRaw = await prisma.trip.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!tripRaw) return <main className="p-6">Trip not found.</main>;

  const trip: TripDTO = mapTripToDTO(tripRaw);

  // ✅ Fetch active drivers/units; do NOT use Unit.name (it doesn't exist)
  const [driversRaw, unitsRaw] = await Promise.all([
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
  ]);

  const drivers = stripDecimalsDeep(driversRaw);
  const units = stripDecimalsDeep(unitsRaw);

  // Similar-trip query (unchanged, just typed)
  const similarWhere: Prisma.TripWhereInput = tripRaw.order
    ? { order: { is: { origin: tripRaw.order.origin, destination: tripRaw.order.destination } } }
    : { type: tripRaw.type ?? undefined, zone: tripRaw.zone ?? undefined };

  const recentSimilar = await prisma.trip.findMany({
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
  const recentSimilarPlain = stripDecimalsDeep(recentSimilar);

  // Pass ONLY plain data to the client shell
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <EditTripClientShell
        trip={trip}
        drivers={drivers}
        units={units}
        recentSimilar={recentSimilarPlain}
      />
    </main>
  );
}
