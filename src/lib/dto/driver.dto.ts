import type { Driver } from "@prisma/client";

import { stripDecimalsDeep, toISO } from "@/lib/serialize";

export type DriverDTO = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  homeBase: string | null;
  active: boolean;
  licenseNumber: string | null;
  licenseJurisdiction: string | null;
  licenseClass: string | null;
  licenseEndorsements: string[];
  licenseExpiresAt: string | null;
  medicalExpiresAt: string | null;
  drugTestDate: string | null;
  mvrDate: string | null;
  payType: string | null;
  hourlyRate: number | null;
  cpmRate: number | null;
  rate: number | null;
  cpm: number | null;
  deductionsProfileId: string | null;
  status: string;
  inactiveReason: string | null;
  inactiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function mapDriverToDTO(driver: Driver): DriverDTO {
  const plain = stripDecimalsDeep(driver) as Driver;

  return {
    id: plain.id,
    name: plain.name,
    phone: plain.phone ?? null,
    email: plain.email ?? null,
    homeBase: plain.homeBase ?? null,
    active: plain.active,
    licenseNumber: plain.licenseNumber ?? null,
    licenseJurisdiction: plain.licenseJurisdiction ?? null,
    licenseClass: plain.licenseClass ?? null,
    licenseEndorsements: Array.isArray(plain.licenseEndorsements)
      ? plain.licenseEndorsements.filter((item): item is string => typeof item === "string")
      : [],
    licenseExpiresAt: toISO(plain.licenseExpiresAt),
    medicalExpiresAt: toISO(plain.medicalExpiresAt),
    drugTestDate: toISO(plain.drugTestDate),
    mvrDate: toISO(plain.mvrDate),
    payType: plain.payType ?? null,
    hourlyRate: typeof plain.hourlyRate === "number" ? plain.hourlyRate : null,
    cpmRate: typeof plain.cpmRate === "number" ? plain.cpmRate : null,
    rate: typeof plain.hourlyRate === "number" ? plain.hourlyRate : null,
    cpm: typeof plain.cpmRate === "number" ? plain.cpmRate : null,
    deductionsProfileId: plain.deductionsProfileId ?? null,
    status: plain.status,
    inactiveReason: plain.inactiveReason ?? null,
    inactiveAt: toISO(plain.inactiveAt),
    createdAt: toISO(plain.createdAt) ?? new Date().toISOString(),
    updatedAt: toISO(plain.updatedAt) ?? new Date().toISOString(),
  };
}
