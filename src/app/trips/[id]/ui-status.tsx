"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { TRIP_STATUSES, type TripStatus } from "@/lib/trip-statuses";

type TripStatusButtonProps = {
  tripId: string;
  status: string;
};

export default function TripStatusButtons({
  tripId,
  status,
}: TripStatusButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState<TripStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(nextStatus: TripStatus) {
    setError(null);
    setPending(nextStatus);

    try {
      const res = await fetch(`/api/trips/${tripId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to update status");
        return;
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Failed to update status");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        Current status: <span className="font-medium text-gray-900">{status}</span>
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {TRIP_STATUSES.map((label, index) => {
          const isCurrent = label === status;
          const isDisabled = pending !== null || isCurrent;
          const isPending = pending === label;

          return (
            <Fragment key={label}>
              <button
                type="button"
                onClick={() => updateStatus(label)}
                disabled={isDisabled}
                className={`px-3 py-1.5 border rounded transition-colors ${
                  isCurrent
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 hover:bg-gray-100"
                } ${isPending ? "opacity-75" : ""}`}
              >
                {isPending ? "…" : label}
              </button>
              {index < TRIP_STATUSES.length - 1 && (
                <span className="text-gray-400">→</span>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
