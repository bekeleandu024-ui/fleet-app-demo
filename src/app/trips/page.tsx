import prisma from "@/server/prisma";
import TripsTable, { type TripListItem } from "./ui-trips-table";
import AITripsAssistant from "./ai-trips-assistant";

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

  const completedStatus = "completed";
  const bookedStatuses = new Set([
    "created",
    "dispatched",
    "inprogress",
    "booked",
    "open",
  ]);

  const completedTrips = items.filter(
    (trip) => trip.status?.toLowerCase() === completedStatus,
  );
  const bookedTrips = items.filter((trip) => {
    const status = trip.status?.toLowerCase();
    return status != null && bookedStatuses.has(status);
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trips Demo</h1>
      </div>

      <AITripsAssistant />

      {items.length === 0 ? (
        <p className="text-gray-600">No trips yet.</p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">Trips Booked</h2>
            {bookedTrips.length === 0 ? (
              <p className="text-gray-600">No booked trips at the moment.</p>
            ) : (
              <TripsTable trips={bookedTrips} />
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">Trips Completed</h2>
            {completedTrips.length === 0 ? (
              <p className="text-gray-600">No completed trips yet.</p>
            ) : (
              <TripsTable trips={completedTrips} />
            )}
          </section>
        </div>
      )}
    </main>
  );
}
