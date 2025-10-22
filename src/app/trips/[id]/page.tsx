// src/app/trips/[id]/page.tsx
import prisma from "@/server/prisma";
import AddEvent from "./ui-add-event";
import TripStatusButtons from "./ui-status";

type PageProps = { params: { id: string } };

export default async function Page({ params }: PageProps) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: { events: { orderBy: { at: "asc" } } },
  });

  if (!trip) {
    return <main className="p-6">Trip not found.</main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <section className="p-4 border rounded-lg">
        <h1 className="text-xl font-bold mb-2">Trip</h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><b>Driver:</b> {trip.driver}</div>
          <div><b>Unit:</b> {trip.unit}</div>
          <div><b>Miles:</b> {trip.miles.toString()}</div>
          <div><b>Revenue:</b> {trip.revenue?.toString() ?? "-"}</div>
          <div><b>Total Cost:</b> {trip.totalCost?.toString() ?? "-"}</div>
          <div>
            <b>Margin %:</b>{" "}
            {trip.marginPct != null ? (Number(trip.marginPct) * 100).toFixed(1) + "%" : "-"}
          </div>
          <div><b>Status:</b> {trip.status}</div>
        </div>
      </section>

      <section className="p-4 border rounded-lg">
        <h2 className="font-semibold mb-2">Status</h2>
        <TripStatusButtons tripId={trip.id} status={trip.status} />
      </section>

      <section className="p-4 border rounded-lg">
        <h2 className="font-semibold mb-2">Tracking</h2>
        <AddEvent tripId={trip.id} />
        <ol className="mt-4 space-y-2">
          {trip.events.map((ev) => (
            <li key={ev.id} className="border rounded p-2 text-sm">
              <b>{ev.type}</b> — {new Date(ev.at).toLocaleString()}{" "}
              {ev.location ? `@ ${ev.location}` : ""} {ev.notes ? `— ${ev.notes}` : ""}
            </li>
          ))}
          {trip.events.length === 0 && (
            <li className="text-gray-600 text-sm">No events yet.</li>
          )}
        </ol>
      </section>
    </main>
  );
}
