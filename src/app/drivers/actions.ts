"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DriverCreate, DriverUpdate } from "@/lib/schemas";
import { stripDecimalsDeep } from "@/lib/serialize";
import prisma from "@/server/prisma";

type ActionResult<T extends Record<string, unknown> = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function buildPayload(formData: FormData) {
  const readString = (key: string) => {
    const value = formData.get(key);
    if (value == null) return undefined;
    const str = value.toString().trim();
    return str.length ? str : undefined;
  };

  const readDate = (key: string) => readString(key);

  const endorsements = formData
    .getAll("licenseEndorsements")
    .map((value) => value.toString().trim())
    .filter((value) => value.length > 0);

  const licenseNumber = readString("licenseNumber");
  const licenseJurisdiction = readString("licenseJurisdiction");
  const licenseClass = readString("licenseClass");
  const licenseExpiresAt = readDate("licenseExpiresAt");

  const license =
    licenseNumber ||
    licenseJurisdiction ||
    licenseClass ||
    endorsements.length > 0 ||
    licenseExpiresAt
      ? {
          number: licenseNumber,
          jurisdiction: licenseJurisdiction,
          class: licenseClass,
          endorsements,
          expiresAt: licenseExpiresAt,
        }
      : undefined;

  const compliance: Record<string, string> = {};
  const medical = readDate("medicalExpiresAt");
  if (medical) compliance.medicalExpiresAt = medical;
  const drugTest = readDate("drugTestDate");
  if (drugTest) compliance.drugTestDate = drugTest;
  const mvr = readDate("mvrDate");
  if (mvr) compliance.mvrDate = mvr;

  const typeRaw = readString("payType");
  const payType = typeRaw === "Hourly" || typeRaw === "CPM" ? typeRaw : null;
  const hourlyRate = readString("hourlyRate") ?? readString("rate");
  const cpmRate = readString("cpmRate") ?? readString("cpm");
  const deductionsProfileId = readString("deductionsProfileId");

  const payroll =
    payType || hourlyRate || cpmRate || deductionsProfileId
      ? {
          type: payType,
          hourlyRate: hourlyRate ?? undefined,
          cpmRate: cpmRate ?? undefined,
          deductionsProfileId: deductionsProfileId ?? undefined,
        }
      : undefined;

  const status = (readString("status") as "Active" | "Inactive" | undefined) ?? "Active";

  return {
    name: readString("name") ?? "",
    phone: readString("phone"),
    email: readString("email"),
    homeBase: readString("homeBase"),
    license,
    compliance: Object.keys(compliance).length ? compliance : undefined,
    payroll,
    status,
    inactiveReason: readString("inactiveReason"),
    inactiveAt: readDate("inactiveAt"),
  };
}

function toPersistence(data: z.infer<typeof DriverCreate>) {
  return {
    name: data.name,
    phone: data.phone ?? null,
    email: data.email ?? null,
    homeBase: data.homeBase ?? null,
    licenseNumber: data.license?.number ?? null,
    licenseJurisdiction: data.license?.jurisdiction ?? null,
    licenseClass: data.license?.class ?? null,
    licenseEndorsements: data.license?.endorsements ?? [],
    licenseExpiresAt: data.license?.expiresAt ?? null,
    medicalExpiresAt: data.compliance?.medicalExpiresAt ?? null,
    drugTestDate: data.compliance?.drugTestDate ?? null,
    mvrDate: data.compliance?.mvrDate ?? null,
    payType: data.payroll?.type ?? null,
    hourlyRate: data.payroll?.hourlyRate ?? null,
    cpmRate: data.payroll?.cpmRate ?? null,
    deductionsProfileId: data.payroll?.deductionsProfileId ?? null,
    status: data.status,
    inactiveReason: data.status === "Inactive" ? data.inactiveReason ?? null : null,
    inactiveAt: data.status === "Inactive" ? data.inactiveAt ?? null : null,
  };
}

function formatError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Request failed";
}

export async function createDriverAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const payload = buildPayload(formData);
    const parsed = DriverCreate.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue?.message ?? "Validation failed" };
    }

    const data = stripDecimalsDeep(parsed.data);

    if (data.license?.number && data.license?.jurisdiction) {
      const conflict = await prisma.driver.findFirst({
        where: {
          licenseNumber: data.license.number,
          licenseJurisdiction: data.license.jurisdiction,
        } as any,
        select: { id: true },
      });

      if (conflict) {
        return { ok: false, error: "A driver with this license already exists" };
      }
    }

    const created = await prisma.driver.create({
      data: toPersistence(data) as any,
      select: { id: true },
    });

    revalidatePath("/drivers");
    return { ok: true, id: created.id };
  } catch (error) {
    console.error(error);
    return { ok: false, error: formatError(error) };
  }
}

export async function updateDriverAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const payload = buildPayload(formData);
    const partial = DriverUpdate.safeParse(payload);
    if (!partial.success) {
      const issue = partial.error.issues[0];
      return { ok: false, error: issue?.message ?? "Validation failed" };
    }

    const full = DriverCreate.safeParse(payload);
    if (!full.success) {
      const issue = full.error.issues[0];
      return { ok: false, error: issue?.message ?? "Validation failed" };
    }

    const data = stripDecimalsDeep(full.data);

    if (data.license?.number && data.license?.jurisdiction) {
      const conflict = await prisma.driver.findFirst({
        where: {
          licenseNumber: data.license.number,
          licenseJurisdiction: data.license.jurisdiction,
          NOT: { id },
        } as any,
        select: { id: true },
      });

      if (conflict) {
        return { ok: false, error: "A driver with this license already exists" };
      }
    }

    await prisma.driver.update({
      where: { id },
      data: toPersistence(data) as any,
    });

    revalidatePath("/drivers");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: formatError(error) };
  }
}

export async function deleteDriverAction(id: string): Promise<ActionResult> {
  try {
    const futureTrips = await prisma.trip.count({
      where: { driverId: id, tripStart: { gt: new Date() } },
    });

    if (futureTrips > 0) {
      return { ok: false, error: `${futureTrips} future trips` };
    }

    await prisma.driver.delete({ where: { id } });
    revalidatePath("/drivers");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: formatError(error) };
  }
}
