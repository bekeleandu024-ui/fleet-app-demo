import { notFound } from "next/navigation";

import { stripDecimalsDeep, toISO } from "@/lib/serialize";
import prisma from "@/server/prisma";

import DriverEditorShell from "../../components/DriverEditorShell";

type PlainDriver = {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  homeBase?: string | null;
  licenseNumber: string;
  licenseJurisdiction: string;
  licenseClass: string;
  licenseEndorsements: string[];
  licenseExpiresAt: string;
  medicalExpiresAt?: string | null;
  drugTestDate?: string | null;
  mvrDate?: string | null;
  payType?: "Hourly" | "CPM" | null;
  rate?: number | null;
  cpm?: number | null;
  deductionsProfileId?: string | null;
  status: "Active" | "Inactive";
  inactiveReason?: string | null;
  inactiveAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const driverRecord = await prisma.driver.findUnique({ where: { id } });
  if (!driverRecord) {
    notFound();
  }

  const clean = stripDecimalsDeep(driverRecord as any) as any;

  const plain: PlainDriver = {
    id: clean.id,
    name: clean.name,
    phone: clean.phone ?? null,
    email: clean.email ?? null,
    homeBase: clean.homeBase ?? null,
    licenseNumber: clean.licenseNumber,
    licenseJurisdiction: clean.licenseJurisdiction,
    licenseClass: clean.licenseClass,
    licenseEndorsements: clean.licenseEndorsements ?? [],
    licenseExpiresAt: toISO(clean.licenseExpiresAt) ?? new Date().toISOString(),
    medicalExpiresAt: toISO(clean.medicalExpiresAt),
    drugTestDate: toISO(clean.drugTestDate),
    mvrDate: toISO(clean.mvrDate),
    payType: clean.payType as PlainDriver["payType"],
    rate: typeof clean.rate === "number" ? clean.rate : clean.rate != null ? Number(clean.rate) : null,
    cpm: typeof clean.cpm === "number" ? clean.cpm : clean.cpm != null ? Number(clean.cpm) : null,
    deductionsProfileId: clean.deductionsProfileId ?? null,
    status: clean.status as PlainDriver["status"],
    inactiveReason: clean.inactiveReason ?? null,
    inactiveAt: toISO(clean.inactiveAt),
    createdAt: toISO(clean.createdAt) ?? undefined,
    updatedAt: toISO(clean.updatedAt) ?? undefined,
  };

  const futureTripCount = await prisma.trip.count({
    where: { driverId: id, tripStart: { gt: new Date() } },
  });

  const terminals = ["Toronto", "Guelph", "Ottawa"];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Driver settings</p>
        <h1 className="text-2xl font-semibold">Edit {plain.name}</h1>
      </header>
      <DriverEditorShell mode="edit" driver={plain} terminals={terminals} futureTripCount={futureTripCount} />
    </div>
  );
}
