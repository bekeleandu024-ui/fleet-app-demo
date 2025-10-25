import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return value;
};

const requiredTrimmedString = (message: string) =>
  z
    .string({ required_error: message })
    .trim()
    .min(1, message);

const optionalTrimmedString = () =>
  z
    .preprocess(emptyToUndefined, z.string().trim().min(1))
    .optional();

const optionalNonNegative = (field: string) =>
  z
    .preprocess(
      emptyToUndefined,
      z.coerce
        .number({ invalid_type_error: `${field} must be a number` })
        .min(0, `${field} must be ≥ 0`)
    )
    .optional();

const optionalDateTime = (field: string) =>
  z
    .preprocess(emptyToUndefined, z.coerce.date({ invalid_type_error: `${field} must be a valid ISO datetime` }))
    .optional();

export const DriverCreate = z
  .object({
    name: requiredTrimmedString("Name is required"),
    homeBase: optionalTrimmedString(),
    license: optionalTrimmedString(),
    active: z.coerce.boolean().optional().default(true),
  })
  .strip();

export const DriverUpdate = DriverCreate.partial();

export const UnitCreate = z
  .object({
    code: requiredTrimmedString("Code is required"),
    name: requiredTrimmedString("Name is required"),
    type: optionalTrimmedString(),
    homeBase: optionalTrimmedString(),
    active: z.coerce.boolean().optional().default(true),
  })
  .strip();

export const UnitUpdate = UnitCreate.partial();

export const RateCreate = z
  .object({
    type: optionalTrimmedString(),
    zone: optionalTrimmedString(),
    fixedCPM: z
      .preprocess(emptyToUndefined, z.coerce.number({ invalid_type_error: "fixedCPM must be a number" }))
      .pipe(z.number().min(0, "fixedCPM must be ≥ 0")),
    wageCPM: z
      .preprocess(emptyToUndefined, z.coerce.number({ invalid_type_error: "wageCPM must be a number" }))
      .pipe(z.number().min(0, "wageCPM must be ≥ 0")),
    addOnsCPM: z
      .preprocess(emptyToUndefined, z.coerce.number({ invalid_type_error: "addOnsCPM must be a number" }))
      .pipe(z.number().min(0, "addOnsCPM must be ≥ 0")),
    rollingCPM: z
      .preprocess(emptyToUndefined, z.coerce.number({ invalid_type_error: "rollingCPM must be a number" }))
      .pipe(z.number().min(0, "rollingCPM must be ≥ 0")),
  })
  .strip();

export const RateUpdate = RateCreate.partial();

export const TripCreate = z
  .object({
    orderId: optionalTrimmedString(),
    driverId: optionalTrimmedString(),
    driver: requiredTrimmedString("Driver is required"),
    unitId: optionalTrimmedString(),
    unit: requiredTrimmedString("Unit is required"),
    miles: z
      .preprocess(emptyToUndefined, z.coerce.number({ invalid_type_error: "Miles must be a number" }))
      .pipe(z.number().gt(0, "Miles must be greater than zero")),
    revenue: optionalNonNegative("Revenue"),
    fixedCPM: optionalNonNegative("fixedCPM"),
    wageCPM: optionalNonNegative("wageCPM"),
    addOnsCPM: optionalNonNegative("addOnsCPM"),
    rollingCPM: optionalNonNegative("rollingCPM"),
    type: optionalTrimmedString(),
    zone: optionalTrimmedString(),
    tripStart: optionalDateTime("tripStart"),
    tripEnd: optionalDateTime("tripEnd"),
    rateId: optionalTrimmedString(),
  })
  .strip()
  .superRefine((data, ctx) => {
    if (data.tripStart && data.tripEnd) {
      if (data.tripEnd.getTime() < data.tripStart.getTime()) {
        ctx.addIssue({
          code: "custom",
          message: "Trip end must be after trip start",
          path: ["tripEnd"],
        });
      }
    }
  });

export const TripStatus = z.enum([
  "Created",
  "Dispatched",
  "InProgress",
  "Completed",
  "Cancelled",
]);

export const TripStatusUpdate = z
  .object({
    status: TripStatus,
  })
  .strip();

