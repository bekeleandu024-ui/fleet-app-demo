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
