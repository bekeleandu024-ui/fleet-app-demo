import Link from "next/link";
import prisma from "@/server/prisma";

export default async function TripsPage() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
  });

  const formatDecimal = (value: { toString(): string } | null | undefined) => {
    if (value == null) return "-";
    return value.toString();
  };

  const formatMargin = (value: { toString(): string } | null | undefined) => {
    if (value == null) return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return value.toString();
    return `${(num * 100).toFixed(1)}%`;
  };

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trips</h1>
      </div>

      {trips.length === 0 ? (
        <p className="text-gray-600">No trips yet.</p>
      ) : (
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
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    <Link
                      href={`/trips/${trip.id}`}
                      className="inline-flex items-center gap-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                      <span>{trip.driver}</span>
                      <span aria-hidden="true" className="text-xs text-gray-400">
                        →
                      </span>
                      <span className="sr-only">View trip</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{trip.unit}</td>
                  <td className="px-4 py-2 text-gray-700">{formatDecimal(trip.miles)}</td>
                  <td className="px-4 py-2 text-gray-700">{formatDecimal(trip.revenue)}</td>
                  <td className="px-4 py-2 text-gray-700">{formatDecimal(trip.totalCost)}</td>
                  <td className="px-4 py-2 text-gray-700">{formatMargin(trip.marginPct)}</td>
                  <td className="px-4 py-2 text-gray-700">{trip.status}</td>
                  <td className="px-4 py-2 text-gray-700">
                    <Link
                      href={`/trips/${trip.id}`}
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
      )}
    </main>
  );
}
