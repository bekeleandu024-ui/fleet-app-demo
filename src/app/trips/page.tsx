import prisma from "@/server/prisma";
import TripsTable, { type TripListItem } from "./ui-trips-table";

export default async function TripsPage() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
  });

  const items: TripListItem[] = trips.map((trip) => ({
    id: trip.id,
    driver: trip.driver,
    unit: trip.unit,
    miles: Number(trip.miles),
    revenue: trip.revenue == null ? null : Number(trip.revenue),
    totalCost: trip.totalCost == null ? null : Number(trip.totalCost),
    marginPct: trip.marginPct == null ? null : Number(trip.marginPct),
    status: trip.status,
  }));

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trips</h1>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600">No trips yet.</p>
      ) : (
        <TripsTable trips={items} />
      )}
    </main>
  );
}
