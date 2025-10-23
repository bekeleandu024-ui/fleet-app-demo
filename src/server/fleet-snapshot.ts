"use server";

import prisma from "./prisma";
import type { FleetSnapshot, FleetTruckMarker, FleetTruckStatus } from "@/types/fleet";

const BASE_COORDS: Record<string, { lat: number; lng: number }> = {
  guelph: { lat: 43.5448, lng: -80.2482 },
  kitchener: { lat: 43.4516, lng: -80.4925 },
  cambridge: { lat: 43.3616, lng: -80.3144 },
  brampton: { lat: 43.7315, lng: -79.7624 },
  mississauga: { lat: 43.589, lng: -79.6441 },
  hamilton: { lat: 43.2557, lng: -79.8711 },
};

const DEFAULT_COORD = { lat: 43.7001, lng: -79.4163 }; // Toronto fallback

const LOCATION_OFFSETS = [
  { lat: 0, lng: 0 },
  { lat: 0.08, lng: 0.06 },
  { lat: -0.05, lng: -0.07 },
  { lat: 0.04, lng: -0.05 },
  { lat: -0.06, lng: 0.05 },
];

function getCoordinate(homeBase: string | null | undefined, index: number) {
  const key = (homeBase ?? "").trim().toLowerCase();
  const base = BASE_COORDS[key] ?? DEFAULT_COORD;
  const offset = LOCATION_OFFSETS[index % LOCATION_OFFSETS.length];
  return {
    lat: base.lat + offset.lat,
    lng: base.lng + offset.lng,
  };
}

function getStatus(unitActive: boolean, tripStatus: string | null | undefined): FleetTruckStatus {
  if (!unitActive) return "inactive";
  if (!tripStatus) return "available";
  if (tripStatus === "InProgress") return "in-transit";
  if (tripStatus === "Dispatched") return "assigned";
  return "available";
}

export async function getFleetSnapshot(): Promise<FleetSnapshot> {
  const [units, activeTrips] = await Promise.all([
    prisma.unit.findMany({ orderBy: { code: "asc" } }),
    prisma.trip.findMany({
      where: {
        status: {
          in: ["Dispatched", "InProgress"],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeTripByUnit = new Map<string, (typeof activeTrips)[number]>();
  for (const trip of activeTrips) {
    if (!trip.unitId) continue;
    if (!activeTripByUnit.has(trip.unitId)) {
      activeTripByUnit.set(trip.unitId, trip);
    }
  }

  const activeTripIds = Array.from(activeTripByUnit.values()).map((trip) => trip.id);
  const latestEvents = activeTripIds.length
    ? await prisma.event.findMany({
        where: { tripId: { in: activeTripIds } },
        orderBy: { at: "desc" },
      })
    : [];

  const lastEventByTripId = new Map<string, (typeof latestEvents)[number]>();
  for (const event of latestEvents) {
    if (!lastEventByTripId.has(event.tripId)) {
      lastEventByTripId.set(event.tripId, event);
    }
  }

  const offsetCounter: Record<string, number> = {};

  const markers: FleetTruckMarker[] = units.map((unit) => {
    const homeKey = (unit.homeBase ?? "").trim().toLowerCase();
    const offsetIndex = offsetCounter[homeKey] ?? 0;
    offsetCounter[homeKey] = offsetIndex + 1;

    const coordinate = getCoordinate(unit.homeBase, offsetIndex);
    const activeTrip = unit.id ? activeTripByUnit.get(unit.id) : undefined;
    const status = getStatus(unit.active ?? true, activeTrip?.status ?? null);
    const lastEvent = activeTrip ? lastEventByTripId.get(activeTrip.id) : undefined;

    return {
      id: unit.id,
      label: unit.code,
      code: unit.code,
      status,
      city: unit.homeBase ?? null,
      driver: activeTrip?.driver ?? null,
      lat: coordinate.lat,
      lng: coordinate.lng,
      notes: activeTrip
        ? activeTrip.orderId
          ? `Trip ${activeTrip.id} for order ${activeTrip.orderId}`
          : `Trip ${activeTrip.id}`
        : unit.active
        ? "Idle at home base"
        : "Marked inactive",
      lastEvent: lastEvent?.at
        ? lastEvent.at.toISOString()
        : activeTrip?.updatedAt?.toISOString() ?? null,
    } satisfies FleetTruckMarker;
  });

  const sortedMarkers = markers.sort((a, b) => a.label.localeCompare(b.label));
  const trucksById = Object.fromEntries(sortedMarkers.map((marker) => [marker.id, marker]));

  return {
    generatedAt: new Date().toISOString(),
    markerOrder: sortedMarkers.map((marker) => marker.id),
    trucksById,
  };
}
