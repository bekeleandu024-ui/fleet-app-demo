import { toNum } from "@/lib/serialize";
import type { TripDTO } from "./types";

type TripSource = Record<string, any>;

const toIso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toStringOrNull = (value: unknown): string | null => {
  if (value == null) return null;
  return String(value);
};

const toStringOrEmpty = (value: unknown): string => {
  if (value == null) return "";
  return String(value);
};

export function mapTripToDTO(raw: TripSource): TripDTO {
  return {
    id: String(raw.id),
    orderId: toStringOrNull(raw.orderId),
    driver: toStringOrEmpty(raw.driver),
    unit: toStringOrEmpty(raw.unit),
    type: toStringOrNull(raw.type),
    zone: toStringOrNull(raw.zone),
    tripStart: toIso(raw.tripStart),
    tripEnd: toIso(raw.tripEnd),
    weekStart: toIso(raw.weekStart),
    miles: toNum(raw.miles),
    revenue: toNum(raw.revenue),
    fixedCPM: toNum(raw.fixedCPM),
    wageCPM: toNum(raw.wageCPM),
    addOnsCPM: toNum(raw.addOnsCPM),
    rollingCPM: toNum(raw.rollingCPM),
    totalCPM: toNum(raw.totalCPM),
    totalCost: toNum(raw.totalCost),
    profit: toNum(raw.profit),
    marginPct: toNum(raw.marginPct),
    status: toStringOrNull(raw.status),
    driverId: toStringOrNull(raw.driverId),
    unitId: toStringOrNull(raw.unitId),
    rateId: toStringOrNull(raw.rateId),
    createdAt: toIso(raw.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(raw.updatedAt) ?? new Date().toISOString(),
  };
}
