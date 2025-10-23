import { z } from "next/dist/compiled/zod";

const trimToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return value;
};

export const RateSettingCreate = z
  .object({
    rateKey: z.string({ required_error: "Key is required" }).trim().min(1, "Key is required"),
    category: z.string({ required_error: "Category is required" }).trim().min(1, "Category is required"),
    unit: z.string({ required_error: "Unit is required" }).trim().min(1, "Unit is required"),
    note: z.preprocess(trimToUndefined, z.string().trim().min(1)).optional(),
    value: z
      .preprocess(
        trimToUndefined,
        z.coerce.number({ invalid_type_error: "Value must be a number" })
      )
      .pipe(z.number().min(0, "Value must be ≥ 0")),
  })
  .strip();

export const RateSettingUpdate = RateSettingCreate.partial();
