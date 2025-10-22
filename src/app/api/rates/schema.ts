// src/app/api/rates/schema.ts
import type { Rate } from "@prisma/client";
import { z } from "zod";

const optionalLabel = z
  .preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return value;
  }, z.string().min(1).nullable().optional());

const cpmField = z
  .coerce
  .number({ invalid_type_error: "Value must be a number" })
  .refine((value) => Number.isFinite(value), { message: "Value must be finite" });

export const RateCreate = z.object({
  type: optionalLabel,
  zone: optionalLabel,
  fixedCPM: cpmField,
  wageCPM: cpmField,
  addOnsCPM: cpmField,
  rollingCPM: cpmField,
});

export type RateCreateInput = z.infer<typeof RateCreate>;

export function serializeRate(rate: Rate) {
  const fixedCPM = Number(rate.fixedCPM);
  const wageCPM = Number(rate.wageCPM);
  const addOnsCPM = Number(rate.addOnsCPM);
  const rollingCPM = Number(rate.rollingCPM);
  const totalCPM = fixedCPM + wageCPM + addOnsCPM + rollingCPM;

  return {
    id: rate.id,
    type: rate.type ?? null,
    zone: rate.zone ?? null,
    fixedCPM,
    wageCPM,
    addOnsCPM,
    rollingCPM,
    totalCPM,
  };
}
