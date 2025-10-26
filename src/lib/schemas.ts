import { z } from "zod";

export const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return value;
};

export const requiredTrimmedString = (message: string) =>
  z
    .string({ required_error: message, invalid_type_error: message })
    .trim()
    .min(1, message);

export const optionalDate = (label: string) =>
  z
    .preprocess(emptyToUndefined, z.coerce.date({ invalid_type_error: `${label} must be a valid date` }))
    .optional();

export const nonNegNumber = (label: string) =>
  z
    .preprocess(
      emptyToUndefined,
      z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} must be ≥ 0`)
    );

const optionalTrimmedString = () =>
  z
    .preprocess(emptyToUndefined, z.string().trim().min(1))
    .optional();

const optionalNonNegative = (field: string) => nonNegNumber(field).optional();

const optionalDateTime = (field: string) =>
  z
    .preprocess(emptyToUndefined, z.coerce.date({ invalid_type_error: `${field} must be a valid ISO datetime` }))
    .optional();

const inactiveReasonSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1, "Inactive reason is required when status is inactive")
);

const phoneSchema = z
  .preprocess(
    emptyToUndefined,
    z
      .string({ invalid_type_error: "Phone must be a string" })
      .trim()
      .regex(/^(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})$/, "Phone must be a valid North American number")
  )
  .optional();

const emailSchema = z
  .preprocess(emptyToUndefined, z.string().trim().email("Email must be valid"))
  .optional();

const licenseSchema = z
  .object({
    number: optionalTrimmedString(),
    jurisdiction: optionalTrimmedString(),
    class: optionalTrimmedString(),
    endorsements: z.array(z.string().trim().min(1)).default([]),
    expiresAt: optionalDate("License expiry"),
  })
  .optional();

const complianceSchema = z
  .object({
    medicalExpiresAt: optionalDate("Medical expiry"),
    drugTestDate: optionalDate("Drug test date"),
    mvrDate: optionalDate("MVR date"),
  })
  .partial()
  .optional();

const payrollSchema = z
  .object({
    type: z.enum(["Hourly", "CPM"]).nullable().optional(),
    hourlyRate: nonNegNumber("Hourly rate").optional(),
    cpmRate: nonNegNumber("CPM rate").optional(),
    deductionsProfileId: optionalTrimmedString(),
  })
  .optional();

const driverShape = z
  .object({
    name: requiredTrimmedString("Name is required"),
    phone: phoneSchema,
    email: emailSchema,
    homeBase: optionalTrimmedString(),
    license: licenseSchema,
    compliance: complianceSchema,
    payroll: payrollSchema,
    status: z.enum(["Active", "Inactive"]).default("Active"),
    inactiveReason: inactiveReasonSchema.optional(),
    inactiveAt: optionalDate("Inactive at"),
  })
  .strip();

const applyDriverRefinements = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data, ctx) => {
    const record = data as z.infer<typeof driverShape>;
    const status = record.status;
    const license = record.license;
    const payroll = record.payroll;
    const inactiveReason = record.inactiveReason;
    const inactiveAt = record.inactiveAt;

    const hasLicenseDetails = Boolean(
      license?.number ||
        license?.jurisdiction ||
        license?.class ||
        (license?.endorsements?.length ?? 0) > 0 ||
        license?.expiresAt
    );

    if (status === "Active" && hasLicenseDetails) {
      const expiresAt = license?.expiresAt ?? null;
      if (!expiresAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Active drivers require a license expiry date",
          path: ["license", "expiresAt"],
        });
      } else if (expiresAt.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Active drivers must have a future license expiry",
          path: ["license", "expiresAt"],
        });
      }
    }

    if (status === "Inactive") {
      if (!inactiveReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Inactive drivers must include a reason",
          path: ["inactiveReason"],
        });
      }
      if (!inactiveAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Inactive drivers must include a date",
          path: ["inactiveAt"],
        });
      }
    }

    const payType = payroll?.type ?? null;
    if (payType === "Hourly" && payroll?.hourlyRate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hourly drivers require an hourly rate",
        path: ["payroll", "hourlyRate"],
      });
    }
    if (payType === "CPM" && payroll?.cpmRate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPM drivers require a cents-per-mile rate",
        path: ["payroll", "cpmRate"],
      });
    }
  });

export const DriverCreate = applyDriverRefinements(driverShape);

export const DriverUpdate = applyDriverRefinements(driverShape.partial());

export const UnitCreate = z
  .object({
    code: requiredTrimmedString("Code is required"),
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
