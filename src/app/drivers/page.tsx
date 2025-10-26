import prisma from "@/src/server/prisma";

type DriverRecord = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  homeBase: string | null;
  active: boolean;
  licenseNumber: string | null;
  licenseJurisdiction: string | null;
  licenseClass: string | null;
  licenseEndorsements: unknown;
  licenseExpiresAt: Date | null;
  medicalExpiresAt: Date | null;
  drugTestDate: Date | null;
  mvrDate: Date | null;
  payType: string | null;
  hourlyRate: number | null;
  cpmRate: number | null;
  status: string | null;
  inactiveAt: Date | null;
  createdAt: Date;
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (
    value &&
    typeof value === "object" &&
    "set" in (value as Record<string, unknown>) &&
    Array.isArray((value as Record<string, unknown>).set)
  ) {
    return toStringArray((value as { set: unknown }).set);
  }

  return [];
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toFixed(2)}`;
}

function formatPay(driver: DriverRecord): string {
  if (driver.payType === "Hourly") {
    const rate = formatMoney(driver.hourlyRate);
    return rate === "—" ? "—" : `${rate}/hr`;
  }

  if (driver.payType === "CPM") {
    const rate = formatMoney(driver.cpmRate);
    return rate === "—" ? "—" : `${rate}/mi`;
  }

  return "—";
}

function formatLicense(driver: DriverRecord): string {
  const pieces: string[] = [];

  if (driver.licenseClass) {
    pieces.push(driver.licenseClass);
  }

  if (driver.licenseNumber) {
    pieces.push(driver.licenseNumber);
  }

  const base = pieces.join(" ");
  const jurisdiction = driver.licenseJurisdiction
    ? `${base ? " " : ""}(${driver.licenseJurisdiction})`
    : "";

  const summary = `${base}${jurisdiction}`.trim();

  const endorsements = toStringArray(driver.licenseEndorsements);

  if (endorsements.length > 0) {
    const endorsementText = endorsements.join(", ");
    return summary ? `${summary} • ${endorsementText}` : endorsementText;
  }

  return summary || "—";
}

function licenseExpiryBadge(date: Date | null): { text: string; className: string } {
  const text = formatDate(date);

  if (!date) {
    return { text, className: "text-gray-400" };
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = dateMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text, className: "text-rose-400" };
  }

  if (diffDays <= 30) {
    return { text, className: "text-amber-400" };
  }

  return { text, className: "text-gray-100" };
}

function statusPill(
  status: string | null,
  _inactiveAt: Date | null,
  active: boolean
): { label: string; className: string } {
  if (active || status === "Active") {
    return {
      label: "Active",
      className:
        "inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400",
    };
  }

  return {
    label: "Inactive",
    className:
      "inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400",
  };
}

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      homeBase: true,
      active: true,
      licenseNumber: true,
      licenseJurisdiction: true,
      licenseClass: true,
      licenseEndorsements: true,
      licenseExpiresAt: true,
      medicalExpiresAt: true,
      drugTestDate: true,
      mvrDate: true,
      payType: true,
      hourlyRate: true,
      cpmRate: true,
      status: true,
      inactiveAt: true,
      createdAt: true,
    },
  });

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-100">Drivers</h1>
        <p className="text-sm text-gray-400">
          Active and inactive drivers, license &amp; compliance status.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm overflow-x-auto">
        <table className="min-w-full table-auto text-left text-sm text-gray-100">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Driver
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                License
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                License Expiry
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Compliance
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Pay
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Contact
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => {
              const license = formatLicense(driver);
              const expiry = licenseExpiryBadge(driver.licenseExpiresAt);
              const pill = statusPill(driver.status, driver.inactiveAt, driver.active);

              return (
                <tr key={driver.id} className="border-b border-border/40 last:border-0">
                  <td className="align-top py-2 pr-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-gray-100">{driver.name ?? "—"}</div>
                    <div className="text-xs text-gray-400">{driver.homeBase ?? "—"}</div>
                  </td>
                  <td className="align-top py-2 pr-4 whitespace-nowrap text-sm">
                    <span className={pill.className}>{pill.label}</span>
                  </td>
                  <td className="align-top py-2 pr-4 whitespace-nowrap text-sm">{license}</td>
                  <td className={`align-top py-2 pr-4 whitespace-nowrap text-sm ${expiry.className}`}>
                    {expiry.text}
                  </td>
                  <td className="align-top py-2 pr-4 whitespace-nowrap text-sm">
                    <div className="space-y-1">
                      <div>
                        <span className="text-xs text-gray-400">Medical</span>
                        <div>{formatDate(driver.medicalExpiresAt)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Drug Test</span>
                        <div>{formatDate(driver.drugTestDate)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">MVR</span>
                        <div>{formatDate(driver.mvrDate)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="align-top py-2 pr-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-gray-100">{driver.payType ?? "—"}</div>
                    <div className="text-xs text-gray-400">{formatPay(driver)}</div>
                  </td>
                  <td className="align-top py-2 pr-4 whitespace-nowrap text-sm">
                    <div className="break-all text-gray-100">{driver.phone ?? "—"}</div>
                    <div className="break-all text-gray-100">{driver.email ?? "—"}</div>
                  </td>
                  <td className="align-top py-2 pr-4 whitespace-nowrap text-sm">
                    {formatDate(driver.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
