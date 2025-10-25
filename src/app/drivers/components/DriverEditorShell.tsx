"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import DriverChecklistCard from "./DriverChecklistCard";
import DriverForm from "./DriverForm";
import DangerZone from "./DangerZone";

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

type DriverEditorShellProps = {
  mode: "create" | "edit";
  driver: PlainDriver;
  terminals: string[];
  futureTripCount?: number;
};

type ChecklistItem = {
  key: string;
  level: "pass" | "warn" | "fail";
  message: string;
  anchor?: string;
};

const MS_IN_DAY = 86_400_000;
const LICENSE_WARN_DAYS = 30;
const LICENSE_FAIL_DAYS = 7;
const MEDICAL_WARN_DAYS = 30;
const DRUG_TEST_MONTHS = 12;

function diffInDays(target?: string | null) {
  if (!target) return null;
  const date = new Date(target);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((date.getTime() - Date.now()) / MS_IN_DAY);
}

function diffInMonths(target?: string | null) {
  if (!target) return null;
  const date = new Date(target);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  return months + (now.getDate() >= date.getDate() ? 0 : -1);
}

export default function DriverEditorShell({ mode, driver, terminals, futureTripCount }: DriverEditorShellProps) {
  const router = useRouter();

  const violations = useMemo<ChecklistItem[]>(() => {
    const results: ChecklistItem[] = [];

    const licenseDays = diffInDays(driver.licenseExpiresAt);
    let licenseLevel: ChecklistItem["level"] = "fail";
    let licenseMessage = "License expiry date missing";
    if (licenseDays != null) {
      if (licenseDays < 0) {
        licenseLevel = "fail";
        licenseMessage = "License expired";
      } else if (licenseDays <= LICENSE_FAIL_DAYS) {
        licenseLevel = "fail";
        licenseMessage = `License expiring in ${licenseDays} day${licenseDays === 1 ? "" : "s"}`;
      } else if (licenseDays <= LICENSE_WARN_DAYS) {
        licenseLevel = "warn";
        licenseMessage = `License expiring soon (${licenseDays} days)`;
      } else {
        licenseLevel = "pass";
        licenseMessage = "License current";
      }
    }
    results.push({ key: "license", level: licenseLevel, message: licenseMessage, anchor: "license" });

    const endorsementsLevel = driver.licenseEndorsements.length ? "pass" : "warn";
    const endorsementsMessage = driver.licenseEndorsements.length
      ? "Endorsements recorded"
      : "Review endorsement requirements";
    results.push({ key: "endorsements", level: endorsementsLevel, message: endorsementsMessage, anchor: "license" });

    const medicalDays = diffInDays(driver.medicalExpiresAt ?? null);
    let medicalLevel: ChecklistItem["level"] = "warn";
    let medicalMessage = "Medical expiry not tracked";
    if (medicalDays != null) {
      if (medicalDays < 0) {
        medicalLevel = "fail";
        medicalMessage = "Medical expired";
      } else if (medicalDays <= MEDICAL_WARN_DAYS) {
        medicalLevel = "warn";
        medicalMessage = `Medical expires in ${medicalDays} day${medicalDays === 1 ? "" : "s"}`;
      } else {
        medicalLevel = "pass";
        medicalMessage = "Medical current";
      }
    }
    results.push({ key: "medical", level: medicalLevel, message: medicalMessage, anchor: "compliance" });

    const drugTestMonths = diffInMonths(driver.drugTestDate ?? null);
    let drugLevel: ChecklistItem["level"] = "warn";
    let drugMessage = "Drug test date missing";
    if (drugTestMonths != null) {
      if (drugTestMonths >= DRUG_TEST_MONTHS) {
        drugLevel = "fail";
        drugMessage = "Drug test overdue";
      } else if (drugTestMonths >= DRUG_TEST_MONTHS - 2) {
        drugLevel = "warn";
        drugMessage = "Drug test approaching 12 months";
      } else {
        drugLevel = "pass";
        drugMessage = "Drug test current";
      }
    }
    results.push({ key: "drugTest", level: drugLevel, message: drugMessage, anchor: "compliance" });

    let payrollLevel: ChecklistItem["level"] = "warn";
    let payrollMessage = "Payroll configuration optional";
    if (driver.payType === "Hourly") {
      if (driver.rate != null) {
        payrollLevel = "pass";
        payrollMessage = "Hourly rate configured";
      } else {
        payrollLevel = "fail";
        payrollMessage = "Add hourly rate";
      }
    } else if (driver.payType === "CPM") {
      if (driver.cpm != null) {
        payrollLevel = "pass";
        payrollMessage = "CPM configured";
      } else {
        payrollLevel = "fail";
        payrollMessage = "Add CPM amount";
      }
    }
    results.push({ key: "payroll", level: payrollLevel, message: payrollMessage, anchor: "payroll" });

    return results.slice(0, 5);
  }, [driver]);

  const handleSaved = (id: string) => {
    if (mode === "create" && id) {
      router.push(`/drivers/${id}/edit`);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
      <DriverChecklistCard driver={driver} violations={violations} />
      <DriverForm mode={mode} initial={driver} terminals={terminals} onSaved={handleSaved} />
      <div className="space-y-4">
        {futureTripCount != null && futureTripCount > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-100/40 p-4 text-sm text-amber-900">
            Driver has {futureTripCount} scheduled future trip{futureTripCount === 1 ? "" : "s"}.
          </div>
        )}
        <DangerZone driverId={driver.id} driverName={driver.name} status={driver.status} />
      </div>
    </div>
  );
}
