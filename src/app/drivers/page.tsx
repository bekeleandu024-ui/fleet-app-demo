import Link from "next/link";

import prisma from "@/server/prisma";

type DriverRecord = {
  id: string;
  name: string;
  homeBase: string | null;
  status: "Active" | "Inactive" | string;
  phone: string | null;
  email: string | null;
  licenseNumber: string | null;
  licenseJurisdiction: string | null;
  licenseClass: string | null;
  licenseEndorsements: string[];
  licenseExpiresAt: Date | null;
  medicalExpiresAt: Date | null;
  drugTestDate: Date | null;
  createdAt: Date;
};

type ComplianceStatus = {
  label: string;
  description?: string;
  level: "ok" | "warn" | "fail";
  tone: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const MS_IN_DAY = 86_400_000;
const LICENSE_WARN_DAYS = 30;
const MEDICAL_WARN_DAYS = 30;
const DRUG_TEST_MAX_MONTHS = 12;
const DRUG_TEST_WARN_MONTHS = 10;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((date.getTime() - startOfToday.getTime()) / MS_IN_DAY);
}

function monthsSince(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  return months - (now.getDate() < date.getDate() ? 1 : 0);
}

function describeLicenseExpiry(date: Date | null): ComplianceStatus {
  const diff = daysUntil(date);
  if (diff == null) {
    return {
      label: "Not recorded",
      description: "Add an expiry date to track compliance",
      level: "warn",
      tone: "text-amber-500",
    };
  }

  const formattedDate = dateFormatter.format(date);

  if (diff < 0) {
    return {
      label: `Expired ${formattedDate}`,
      description: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} past due`,
      level: "fail",
      tone: "text-rose-500",
    };
  }

  if (diff <= LICENSE_WARN_DAYS) {
    return {
      label: formattedDate,
      description: `Expires in ${diff} day${diff === 1 ? "" : "s"}`,
      level: "warn",
      tone: "text-amber-500",
    };
  }

  return {
    label: formattedDate,
    description: "License is current",
    level: "ok",
    tone: "text-emerald-500",
  };
}

function describeMedical(date: Date | null): ComplianceStatus {
  const diff = daysUntil(date);
  if (diff == null) {
    return {
      label: "Not tracked",
      description: "Record medical expiry",
      level: "warn",
      tone: "text-amber-500",
    };
  }

  const formattedDate = dateFormatter.format(date);

  if (diff < 0) {
    return {
      label: `Expired ${formattedDate}`,
      description: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} past due`,
      level: "fail",
      tone: "text-rose-500",
    };
  }

  if (diff <= MEDICAL_WARN_DAYS) {
    return {
      label: formattedDate,
      description: `Expires in ${diff} day${diff === 1 ? "" : "s"}`,
      level: "warn",
      tone: "text-amber-500",
    };
  }

  return {
    label: formattedDate,
    description: "Medical is current",
    level: "ok",
    tone: "text-emerald-500",
  };
}

function describeDrugTest(date: Date | null): ComplianceStatus {
  const diff = monthsSince(date);
  if (diff == null) {
    return {
      label: "Not tracked",
      description: "Add last drug test date",
      level: "warn",
      tone: "text-amber-500",
    };
  }

  if (diff >= DRUG_TEST_MAX_MONTHS) {
    return {
      label: "Overdue",
      description: `${diff} month${diff === 1 ? "" : "s"} since last test`,
      level: "fail",
      tone: "text-rose-500",
    };
  }

  if (diff >= DRUG_TEST_WARN_MONTHS) {
    return {
      label: "Due soon",
      description: `${diff} month${diff === 1 ? "" : "s"} since last test`,
      level: "warn",
      tone: "text-amber-500",
    };
  }

  return {
    label: "Current",
    description: `${diff} month${diff === 1 ? "" : "s"} since last test`,
    level: "ok",
    tone: "text-emerald-500",
  };
}

function formatLicense(driver: DriverRecord & { licenseEndorsements: string[] }): string {
  const parts: string[] = [];

  if (driver.licenseClass) {
    parts.push(driver.licenseClass);
  }

  if (driver.licenseNumber) {
    parts.push(driver.licenseNumber);
  }

  let license = parts.join(" — ");
  if (driver.licenseJurisdiction) {
    license = `${license}${license ? " " : ""}(${driver.licenseJurisdiction})`;
  }

  if (driver.licenseEndorsements.length) {
    license = `${license || "License"} • Endorsements: ${driver.licenseEndorsements.join(", ")}`;
  }

  return license || "No license details";
}

function getStatusBadge(status: DriverRecord["status"]): { label: string; className: string } {
  if (status === "Inactive") {
    return {
      label: "Inactive",
      className:
        "inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400",
    };
  }

  return {
    label: "Active",
    className:
      "inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400",
  };
}

function attentionPill(levels: ComplianceStatus[]): { label: string; className: string } | null {
  if (levels.some((status) => status.level === "fail")) {
    return {
      label: "Needs attention",
      className:
        "inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400",
    };
  }

  if (levels.some((status) => status.level === "warn")) {
    return {
      label: "Review soon",
      className:
        "inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500",
    };
  }

  return null;
}

export default async function DriversPage() {
  const records = await prisma.driver.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      homeBase: true,
      status: true,
      phone: true,
      email: true,
      licenseNumber: true,
      licenseJurisdiction: true,
      licenseClass: true,
      licenseEndorsements: true,
      licenseExpiresAt: true,
      medicalExpiresAt: true,
      drugTestDate: true,
      createdAt: true,
    },
  });

  const drivers = records.map((record) => {
    const normalizedStatus = record.status === "Inactive" ? "Inactive" : "Active";
    const endorsements = toStringArray(record.licenseEndorsements);
    const base: DriverRecord = {
      id: record.id,
      name: record.name,
      homeBase: record.homeBase,
      status: normalizedStatus,
      phone: record.phone,
      email: record.email,
      licenseNumber: record.licenseNumber,
      licenseJurisdiction: record.licenseJurisdiction,
      licenseClass: record.licenseClass,
      licenseEndorsements: endorsements,
      licenseExpiresAt: record.licenseExpiresAt,
      medicalExpiresAt: record.medicalExpiresAt,
      drugTestDate: record.drugTestDate,
      createdAt: record.createdAt,
    };

    const licenseStatus = describeLicenseExpiry(base.licenseExpiresAt);
    const medicalStatus = describeMedical(base.medicalExpiresAt);
    const drugStatus = describeDrugTest(base.drugTestDate);

    return {
      data: base,
      licenseStatus,
      medicalStatus,
      drugStatus,
      attention: attentionPill([licenseStatus, medicalStatus, drugStatus]),
    };
  });

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter((entry) => entry.data.status === "Active").length;
  const inactiveDrivers = totalDrivers - activeDrivers;
  const licenseAlerts = drivers.filter((entry) => entry.licenseStatus.level !== "ok").length;
  const complianceAlerts = drivers.filter(
    (entry) => entry.medicalStatus.level !== "ok" || entry.drugStatus.level !== "ok"
  ).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">People directory</p>
          <h1 className="text-3xl font-semibold">Drivers</h1>
        </div>
        <Link
          href="/drivers/new"
          className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:border-emerald-400 hover:text-emerald-300"
        >
          + Add driver
        </Link>
      </header>

      {totalDrivers > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg border border-border bg-card/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active drivers</p>
            <p className="mt-2 text-2xl font-semibold">{activeDrivers}</p>
            <p className="text-xs text-muted-foreground">Ready for dispatch</p>
          </article>
          <article className="rounded-lg border border-border bg-card/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Inactive drivers</p>
            <p className="mt-2 text-2xl font-semibold">{inactiveDrivers}</p>
            <p className="text-xs text-muted-foreground">On leave or offboarding</p>
          </article>
          <article className="rounded-lg border border-border bg-card/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">License alerts</p>
            <p className="mt-2 text-2xl font-semibold">{licenseAlerts}</p>
            <p className="text-xs text-muted-foreground">Expired or expiring within 30 days</p>
          </article>
          <article className="rounded-lg border border-border bg-card/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Compliance follow-ups</p>
            <p className="mt-2 text-2xl font-semibold">{complianceAlerts}</p>
            <p className="text-xs text-muted-foreground">Medical or drug test updates needed</p>
          </article>
        </section>
      )}

      {totalDrivers === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
          <h2 className="text-xl font-semibold">No drivers yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first driver to start tracking compliance and dispatch readiness.
          </p>
          <Link
            href="/drivers/new"
            className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Create driver
          </Link>
        </section>
      ) : (
        <section className="space-y-4">
          {drivers.map(({ data, licenseStatus, medicalStatus, drugStatus, attention }) => {
            const badge = getStatusBadge(data.status);
            const licenseSummary = formatLicense(data);

            return (
              <article key={data.id} className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{data.name}</h2>
                      <span className={badge.className}>{badge.label}</span>
                      {attention && <span className={attention.className}>{attention.label}</span>}
                    </div>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Home base</dt>
                        <dd className="mt-1 text-foreground">{data.homeBase ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Contact</dt>
                        <dd className="mt-1 space-y-1 text-foreground">
                          {data.phone ? <p>{data.phone}</p> : null}
                          {data.email ? <p className="text-sm text-muted-foreground">{data.email}</p> : null}
                          {!data.phone && !data.email && <p>—</p>}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">License</dt>
                        <dd className="mt-1 text-foreground">{licenseSummary}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <Link
                      href={`/drivers/${data.id}/edit`}
                      className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium transition hover:border-emerald-400 hover:text-emerald-300"
                    >
                      Manage driver
                    </Link>
                    <p className="text-xs text-muted-foreground">Added {dateFormatter.format(data.createdAt)}</p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">License expiry</dt>
                    <dd className={`mt-1 font-medium ${licenseStatus.tone}`}>{licenseStatus.label}</dd>
                    {licenseStatus.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{licenseStatus.description}</p>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Medical certificate</dt>
                    <dd className={`mt-1 font-medium ${medicalStatus.tone}`}>{medicalStatus.label}</dd>
                    {medicalStatus.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{medicalStatus.description}</p>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Drug test</dt>
                    <dd className={`mt-1 font-medium ${drugStatus.tone}`}>{drugStatus.label}</dd>
                    {drugStatus.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{drugStatus.description}</p>
                    )}
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
