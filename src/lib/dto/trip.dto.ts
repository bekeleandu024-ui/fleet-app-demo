import type { Driver, Trip, Unit } from "@prisma/client";

import { stripDecimalsDeep, toISO, toNum } from "@/lib/serialize";

export type TripDTO = {
  id: string;
  orderId: string | null;
  driverId: string | null;
  unitId: string | null;
  driver: string | null;
  unit: string | null;
  type: string | null;
  zone: string | null;
  tripStart: string | null;
  tripEnd: string | null;
  weekStart: string | null;
  miles: number | null;
  revenue: number | null;
  fixedCPM: number | null;
  wageCPM: number | null;
  addOnsCPM: number | null;
  rollingCPM: number | null;
  totalCPM: number | null;
  totalCost: number | null;
  profit: number | null;
  marginPct: number | null;
  status: string;
  rateId: string | null;
  createdAt: string;
  updatedAt: string;
};

type TripWithRefs = Trip & {
  driverRef?: Pick<Driver, "name"> | null;
  unitRef?: Pick<Unit, "code"> | null;
};

export function mapTripToDTO(trip: TripWithRefs): TripDTO {
  const plain = stripDecimalsDeep(trip) as TripWithRefs;

  return {
    id: plain.id,
    orderId: plain.orderId ?? null,
    driverId: plain.driverId ?? null,
    unitId: plain.unitId ?? null,
    driver: plain.driverRef?.name ?? (typeof plain.driver === "string" ? plain.driver : null),
    unit: plain.unitRef?.code ?? (typeof plain.unit === "string" ? plain.unit : null),
    type: plain.type ?? null,
    zone: plain.zone ?? null,
    tripStart: toISO(plain.tripStart),
    tripEnd: toISO(plain.tripEnd),
    weekStart: toISO(plain.weekStart),
    miles: toNum(plain.miles),
    revenue: toNum(plain.revenue),
    fixedCPM: toNum(plain.fixedCPM),
    wageCPM: toNum(plain.wageCPM),
    addOnsCPM: toNum(plain.addOnsCPM),
    rollingCPM: toNum(plain.rollingCPM),
    totalCPM: toNum(plain.totalCPM),
    totalCost: toNum(plain.totalCost),
    profit: toNum(plain.profit),
    marginPct: toNum(plain.marginPct),
    status: plain.status,
    rateId: plain.rateId ?? null,
    createdAt: toISO(plain.createdAt) ?? new Date().toISOString(),
    updatedAt: toISO(plain.updatedAt) ?? new Date().toISOString(),
  };
}
