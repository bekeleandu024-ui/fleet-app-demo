"use client";

import { useEffect, useMemo, useState } from "react";
import type { FleetSnapshot, FleetTruckMarker, FleetTruckStatus } from "@/types/fleet";

type FleetTrucksMapProps = {
  fleet?: FleetSnapshot | null;
};

type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const EMPTY_SNAPSHOT: FleetSnapshot = {
  generatedAt: new Date(0).toISOString(),
  markerOrder: [],
  trucksById: {},
};

function buildBounds(markers: FleetTruckMarker[]): MapBounds | null {
  if (!markers.length) return null;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const marker of markers) {
    if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) {
      continue;
    }
    minLat = Math.min(minLat, marker.lat);
    maxLat = Math.max(maxLat, marker.lat);
    minLng = Math.min(minLng, marker.lng);
    maxLng = Math.max(maxLng, marker.lng);
  }

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(minLng) ||
    !Number.isFinite(maxLng)
  ) {
    return null;
  }

  if (Math.abs(maxLat - minLat) < 0.001) {
    minLat -= 0.05;
    maxLat += 0.05;
  }
  if (Math.abs(maxLng - minLng) < 0.001) {
    minLng -= 0.05;
    maxLng += 0.05;
  }

  return { minLat, maxLat, minLng, maxLng };
}

function formatStatus(status: FleetTruckStatus) {
  switch (status) {
    case "available":
      return "Available";
    case "assigned":
      return "Assigned";
    case "in-transit":
      return "In transit";
    case "inactive":
      return "Inactive";
    default:
      return status;
  }
}

function badgeTone(status: FleetTruckStatus) {
  switch (status) {
    case "available":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "assigned":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "in-transit":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "inactive":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function listTone(status: FleetTruckStatus) {
  switch (status) {
    case "available":
      return "text-emerald-600";
    case "assigned":
      return "text-amber-600";
    case "in-transit":
      return "text-sky-600";
    case "inactive":
      return "text-gray-500";
    default:
      return "text-gray-600";
  }
}

export default function FleetTrucksMap({ fleet }: FleetTrucksMapProps) {
  const safeFleet = fleet ?? EMPTY_SNAPSHOT;
  const markerOrder = safeFleet.markerOrder ?? [];
  const trucksById = safeFleet.trucksById ?? {};

  const markers = useMemo(
    () => markerOrder.map((id) => trucksById[id]).filter(Boolean) as FleetTruckMarker[],
    [markerOrder, trucksById]
  );

  const [markerIdx, setMarkerIdx] = useState(() => (markers.length ? 0 : -1));

  useEffect(() => {
    if (markers.length === 0) {
      setMarkerIdx(-1);
      return;
    }
    setMarkerIdx((prev) => {
      if (prev === -1) return 0;
      if (prev >= markers.length) return markers.length - 1;
      return prev;
    });
  }, [markers.length]);

  const bounds = useMemo(() => buildBounds(markers), [markers]);

  const selectedMarkerId =
    markerIdx >= 0 && markerIdx < markerOrder.length
      ? markerOrder[markerIdx]
      : null;

  const selectedTruck = selectedMarkerId ? trucksById[selectedMarkerId] ?? null : null;

  function project(truck: FleetTruckMarker) {
    if (!bounds) {
      return { left: "50%", top: "50%" };
    }
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lngRange = bounds.maxLng - bounds.minLng || 1;
    const left = ((truck.lng - bounds.minLng) / lngRange) * 100;
    const top = ((bounds.maxLat - truck.lat) / latRange) * 100;
    return { left: `${left}%`, top: `${top}%` };
  }

  function renderTrucks() {
    if (markers.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          No active units to plot yet.
        </div>
      );
    }

    return markers.map((truck, index) => {
      const isSelected = selectedMarkerId === truck.id;
      const position = project(truck);

      return (
        <button
          key={truck.id}
          type="button"
          onClick={() => setMarkerIdx(index)}
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-xs font-semibold shadow transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
            isSelected
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:border-emerald-400"
          }`}
          style={position}
          aria-pressed={isSelected}
        >
          {truck.label}
        </button>
      );
    });
  }

  const availableCount = markers.filter((marker) => marker.status === "available").length;
  const onTripCount = markers.filter((marker) => marker.status === "assigned" || marker.status === "in-transit").length;
  const inactiveCount = markers.filter((marker) => marker.status === "inactive").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Fleet map</h2>
            <p className="text-xs text-gray-500">
              {safeFleet.generatedAt
                ? `Last updated ${new Date(safeFleet.generatedAt).toLocaleString()}`
                : "Live snapshot"}
            </p>
          </div>
          <dl className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <dt className="font-medium text-gray-800">Units</dt>
              <dd>{markers.length}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="font-medium text-emerald-600">Available</dt>
              <dd>{availableCount}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="font-medium text-sky-600">On trip</dt>
              <dd>{onTripCount}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="font-medium text-gray-500">Inactive</dt>
              <dd>{inactiveCount}</dd>
            </div>
          </dl>
        </header>

        <div className="relative h-[420px] overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-100 via-white to-sky-50 shadow-inner">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(148,163,184,0.25)_1px,_transparent_1px),linear-gradient(180deg,_rgba(148,163,184,0.25)_1px,_transparent_1px)] bg-[length:80px_80px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(79,70,229,0.08),transparent_45%),radial-gradient(circle_at_70%_75%,rgba(16,185,129,0.08),transparent_40%)]" />
          <div className="absolute inset-0">{renderTrucks()}</div>
        </div>
      </section>

      <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Truck details</h3>
        {selectedTruck ? (
          <dl className="space-y-3 text-sm text-gray-700">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Unit</dt>
              <dd className="font-medium text-gray-900">{selectedTruck.label}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Status</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${badgeTone(selectedTruck.status)}`}>
                  {formatStatus(selectedTruck.status)}
                </span>
                {selectedTruck.driver && (
                  <span className="text-xs text-gray-500">Driver {selectedTruck.driver}</span>
                )}
              </dd>
            </div>
            {selectedTruck.city && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Location</dt>
                <dd>{selectedTruck.city}</dd>
              </div>
            )}
            {selectedTruck.notes && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Assignment</dt>
                <dd>{selectedTruck.notes}</dd>
              </div>
            )}
            {selectedTruck.lastEvent && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Updated</dt>
                <dd>
                  {new Date(selectedTruck.lastEvent).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
            )}
          </dl>
        ) : markers.length === 0 ? (
          <p className="text-sm text-gray-500">
            There are no tracked units yet. Add units to the fleet to start monitoring live positions.
          </p>
        ) : (
          <p className="text-sm text-gray-500">Select a marker to view the unit details.</p>
        )}

        {markers.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">All units</h4>
            <ul className="mt-2 space-y-2 text-sm">
              {markers.map((truck, index) => {
                const isSelected = selectedMarkerId === truck.id;
                const tone = listTone(truck.status);
                return (
                  <li key={truck.id}>
                    <button
                      type="button"
                      onClick={() => setMarkerIdx(index)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-white hover:border-emerald-300"
                      }`}
                    >
                      <span className="font-medium">{truck.label}</span>
                      <span className={`text-xs font-medium ${tone}`}>
                        {formatStatus(truck.status)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
