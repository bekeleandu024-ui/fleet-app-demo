import { toNum } from "@/lib/serialize";
import type { TripDTO } from "./types";

type TripSource = Record<string, any>;

export function mapTripToDTO(t: TripSource): TripDTO {
  return {
    id: t.id,
    orderId: t.orderId ?? null,
    driver: t.driver,
    unit: t.unit,
    type: t.type ?? null,
    zone: t.zone ?? null,
    tripStart: t.tripStart ? new Date(t.tripStart).toISOString() : null,
    tripEnd: t.tripEnd ? new Date(t.tripEnd).toISOString() : null,
    weekStart: t.weekStart ? new Date(t.weekStart).toISOString() : null,

    miles: toNum(t.miles),
    revenue: toNum(t.revenue),

    fixedCPM: toNum(t.fixedCPM),
    wageCPM: toNum(t.wageCPM),
    addOnsCPM: toNum(t.addOnsCPM),
    rollingCPM: toNum(t.rollingCPM),
    totalCPM: toNum(t.totalCPM),
    totalCost: toNum(t.totalCost),
    profit: toNum(t.profit),
    marginPct: toNum(t.marginPct),

    status: t.status ?? null,
    driverId: t.driverId ?? null,
    unitId: t.unitId ?? null,
    rateId: t.rateId ?? null,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
  };
}
