"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";

export type TripListItem = {
  id: string;
  driver: string;
  unit: string;
  miles: number;
  revenue: number | null;
  totalCost: number | null;
  marginPct: number | null;
  status: string;
};

type TripsTableProps = {
  trips: TripListItem[];
};

export default function TripsTable({ trips }: TripsTableProps) {
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

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    id: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToEdit(id);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
      <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
        <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-300">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Driver</th>
            <th className="px-4 py-3 text-left font-semibold">Unit</th>
            <th className="px-4 py-3 text-left font-semibold">Miles</th>
            <th className="px-4 py-3 text-left font-semibold">Revenue</th>
            <th className="px-4 py-3 text-left font-semibold">Total Cost</th>
            <th className="px-4 py-3 text-left font-semibold">Margin %</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {trips.map((trip) => (
            <tr
              key={trip.id}
              role="button"
              tabIndex={0}
              aria-label={`Edit trip ${trip.driver}`}
              onClick={() => goToEdit(trip.id)}
              onKeyDown={(event) => handleKeyDown(event, trip.id)}
              className="group cursor-pointer transition-colors duration-200 hover:bg-[#1e293b] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <td className="px-4 py-3 font-medium text-slate-100 transition-colors duration-200 group-hover:text-slate-100">
                {trip.driver}
              </td>
              <td className="px-4 py-3 text-slate-300 transition-colors duration-200 group-hover:text-slate-200">
                {trip.unit}
              </td>
              <td className="px-4 py-3 text-slate-300 transition-colors duration-200 group-hover:text-slate-200">
                {formatDecimal(trip.miles)}
              </td>
              <td className="px-4 py-3 text-slate-300 transition-colors duration-200 group-hover:text-slate-200">
                {formatDecimal(trip.revenue)}
              </td>
              <td className="px-4 py-3 text-slate-300 transition-colors duration-200 group-hover:text-slate-200">
                {formatDecimal(trip.totalCost)}
              </td>
              <td className="px-4 py-3 text-slate-300 transition-colors duration-200 group-hover:text-slate-200">
                {formatMargin(trip.marginPct)}
              </td>
              <td className="px-4 py-3 text-slate-300 transition-colors duration-200 group-hover:text-slate-200">
                {trip.status}
              </td>
              <td className="px-4 py-3 text-slate-300">
                <Link
                  href={`/trips/${trip.id}`}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="text-sm font-medium text-sky-400 transition-colors duration-200 hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 group-hover:text-sky-300"
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
