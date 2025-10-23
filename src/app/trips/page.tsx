import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import prisma from "@/server/prisma";

type TripListItem = {
  id: string;
  driver: string;
  unit: string;
  miles: number;
  revenue: number | null;
  totalCost: number | null;
  marginPct: number | null;
  status: string;
};

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

function TripsTable({ trips }: { trips: TripListItem[] }) {
  "use client";
  const router = useRouter();

  const formatDecimal = (value: number | null | undefined) => {
    if (value == null) return "-";
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatMargin = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${(value * 100).toFixed(1)}%`;
  };

  const goToEdit = (id: string) => {
    router.push(`/trips/${id}/edit`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToEdit(id);
    }
  };

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full divide-y">
        <thead className="bg-gray-50 text-sm text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Driver</th>
            <th className="px-4 py-2 text-left font-semibold">Unit</th>
            <th className="px-4 py-2 text-left font-semibold">Miles</th>
            <th className="px-4 py-2 text-left font-semibold">Revenue</th>
            <th className="px-4 py-2 text-left font-semibold">Total Cost</th>
            <th className="px-4 py-2 text-left font-semibold">Margin %</th>
            <th className="px-4 py-2 text-left font-semibold">Status</th>
            <th className="px-4 py-2 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {trips.map((trip) => (
            <tr
              key={trip.id}
              role="button"
              tabIndex={0}
              aria-label={`Edit trip ${trip.driver}`}
              onClick={() => goToEdit(trip.id)}
              onKeyDown={(event) => handleKeyDown(event, trip.id)}
              className="cursor-pointer hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-black"
            >
              <td className="px-4 py-2 font-medium text-gray-900">{trip.driver}</td>
              <td className="px-4 py-2 text-gray-700">{trip.unit}</td>
              <td className="px-4 py-2 text-gray-700">{formatDecimal(trip.miles)}</td>
              <td className="px-4 py-2 text-gray-700">{formatDecimal(trip.revenue)}</td>
              <td className="px-4 py-2 text-gray-700">{formatDecimal(trip.totalCost)}</td>
              <td className="px-4 py-2 text-gray-700">{formatMargin(trip.marginPct)}</td>
              <td className="px-4 py-2 text-gray-700">{trip.status}</td>
              <td className="px-4 py-2 text-gray-700">
                <Link
                  href={`/trips/${trip.id}`}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="text-sm font-medium text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
