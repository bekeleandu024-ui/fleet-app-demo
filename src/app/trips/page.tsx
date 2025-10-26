import Link from "next/link";
import prisma from "@/lib/prisma";

function formatNumber(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export default async function TripsPage() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      order: true,
      driverRef: true,
      unitRef: true,
      rateRef: true,
    },
    take: 20,
  });

  const safeTrips = trips.map(trip => ({
    ...trip,
    miles: Number(trip.miles),
    revenue: trip.revenue ? Number(trip.revenue) : null,
    totalCost: trip.totalCost ? Number(trip.totalCost) : null,
    profit: trip.profit ? Number(trip.profit) : null,
    marginPct: trip.marginPct ? Number(trip.marginPct) : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Trips</h1>
          <p className="text-sm text-slate-600">Recent trips with quick links to edit or recalculate totals.</p>
        </div>
        <Link href="/orders/new" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
          New order
        </Link>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Driver</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Unit</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Order</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Zone</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Miles</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Revenue</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Profit</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Margin %</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {safeTrips.map(trip => (
              <tr key={trip.id}>
                <td className="px-4 py-2">{trip.driverRef?.name ?? trip.driver}</td>
                <td className="px-4 py-2">{trip.unitRef?.code ?? trip.unit}</td>
                <td className="px-4 py-2">{trip.order?.customer ?? "—"}</td>
                <td className="px-4 py-2">{trip.type ?? "—"}</td>
                <td className="px-4 py-2">{trip.zone ?? "—"}</td>
                <td className="px-4 py-2 text-right">{formatNumber(trip.miles, 0)}</td>
                <td className="px-4 py-2 text-right">{formatNumber(trip.revenue)}</td>
                <td className="px-4 py-2 text-right">{formatNumber(trip.profit)}</td>
                <td className="px-4 py-2 text-right">
                  {trip.marginPct !== null && trip.marginPct !== undefined
                    ? `${formatNumber(trip.marginPct, 1)}%`
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/trips/${trip.id}/edit`}
                      className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/trips/${trip.id}/recalc`}
                      className="rounded border border-blue-400 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      Recalc
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {safeTrips.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                  No trips recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
