import { z } from "zod";
import { DateTime } from "luxon";
import type { OrderFields, PartialOrderFields } from "./types";

const trimmedString = z.string().transform(val => val.trim());

const requiredString = trimmedString.pipe(
  z.string({ required_error: "Required" }).min(1, "Required"),
);

const optionalString = z
  .preprocess(value => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return value;
  }, z.union([z.string(), z.null()]))
  .transform(value => {
    if (value === null) return null;
    return value.trim();
  });

const isoNullable = z
  .preprocess(value => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = DateTime.fromISO(trimmed, { setZone: true });
      if (!parsed.isValid) return trimmed;
      return parsed.toISO();
    }
    return value;
  }, z.union([z.string(), z.null()]))
  .superRefine((value, ctx) => {
    if (value === null) return;
    const parsed = DateTime.fromISO(value, { setZone: true });
    if (!parsed.isValid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid datetime" });
    }
  })
  .transform(value => {
    if (value === null) return null;
    const parsed = DateTime.fromISO(value, { setZone: true });
    return parsed.isValid ? parsed.toISO() : value;
  });

export const orderFieldSchemas: { [K in keyof OrderFields]: z.ZodType<OrderFields[K]> } = {
  customer: requiredString,
  origin: requiredString,
  destination: requiredString,
  puWindowStart: isoNullable,
  puWindowEnd: isoNullable,
  delWindowStart: isoNullable,
  delWindowEnd: isoNullable,
  requiredTruck: optionalString,
  notes: optionalString.pipe(
    z.union([z.string().max(2000, "Too long"), z.null()]),
  ),
};

export const orderFieldsSchema = z.object(orderFieldSchemas);

export function sanitizeFields(input: Partial<Record<keyof OrderFields, unknown>>): {
  fields: PartialOrderFields;
  warnings: string[];
} {
  const fields: PartialOrderFields = {};
  const warnings: string[] = [];
  for (const key of Object.keys(orderFieldSchemas) as (keyof OrderFields)[]) {
    if (!(key in input)) continue;
    const schema = orderFieldSchemas[key];
    const result = schema.safeParse(input[key]);
    if (result.success) {
      fields[key] = result.data;
    } else {
      const issue = result.error.issues.map(issue => issue.message).join(", ");
      warnings.push(`${key}: ${issue}`);
    }
  }
  return { fields, warnings };
}
