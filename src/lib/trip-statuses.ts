// src/lib/trip-statuses.ts
export const TRIP_STATUSES = [
  "Created",
  "Dispatched",
  "In Transit",
  "Completed",
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export function isTripStatus(value: string): value is TripStatus {
  return TRIP_STATUSES.some((status) => status === value);
}
