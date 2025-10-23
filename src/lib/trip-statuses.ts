// src/lib/trip-statuses.ts
import { TripStatus as TripStatusSchema } from "./schemas";

export const TRIP_STATUSES = TripStatusSchema.options;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export function isTripStatus(value: string): value is TripStatus {
  return TripStatusSchema.safeParse(value).success;
}
