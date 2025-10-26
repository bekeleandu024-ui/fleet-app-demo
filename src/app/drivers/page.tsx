import prisma from "@/src/server/prisma";

type LicenseData = {
  licenseClass: string | null;
  licenseNumber: string | null;
  licenseJurisdiction: string | null;
  licenseEndorsements: unknown;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is string =>
        typeof entry === "string" && entry.trim().length > 0
    )
    .map((entry) => entry.trim());
}

function formatLicense(driver: LicenseData): string {
  const parts: string[] = [];

  if (driver.licenseClass) {
    parts.push(driver.licenseClass);
  }

  if (driver.licenseNumber) {
    parts.push(driver.licenseNumber);
  }

  let summary = parts.join(" ");

  if (driver.licenseJurisdiction) {
    summary = summary
      ? `${summary} (${driver.licenseJurisdiction})`
      : `(${driver.licenseJurisdiction})`;
  }

  const endorsements = toStringArray(driver.licenseEndorsements);
  if (endorsements.length > 0) {
    summary = summary
      ? `${summary} • ${endorsements.join(", ")}`
      : endorsements.join(", ");
  }

  return summary || "—";
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function licenseExpiryDisplay(date: Date | null): {
  text: string;
  className: string;
} {
  if (!date) {
    return { text: "—", className: "text-gray-400" };
  }

  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const dateMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffMs = dateMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const text = formatDate(date);

  if (diffDays < 0) {
    return { text, className: "text-rose-400" };
  }

  if (diffDays <= 30) {
    return { text, className: "text-amber-400" };
  }

  return { text, className: "text-gray-100" };
}

function statusPill(
  active: boolean | null | undefined
): { label: string; className: string } {
  if (active) {
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
  const records = await prisma.driver.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      homeBase: true,
      active: true,
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

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold text-white">Drivers</h1>

      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm overflow-x-auto">
        <table className="min-w-full table-auto text-left">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 whitespace-nowrap">
                Driver
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 whitespace-nowrap">
                Home base
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 whitespace-nowrap">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 whitespace-nowrap">
                License
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 whitespace-nowrap">
                License expiry
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 whitespace-nowrap">
                Phone
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 whitespace-nowrap">
                Email
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 whitespace-nowrap">
                Created
              </th>
            </tr>
          </thead>

          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  className="py-4 pr-4 align-top text-sm text-gray-100 whitespace-nowrap"
                  colSpan={8}
                >
                  No drivers found.
                </td>
              </tr>
            ) : (
              records.map((driver) => {
                const pill = statusPill(driver.active);
                const license = formatLicense(driver);
                const expiry = licenseExpiryDisplay(driver.licenseExpiresAt);

                return (
                  <tr
                    key={driver.id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                      {driver.name ?? "—"}
                    </td>

                    <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                      {driver.homeBase ?? "—"}
                    </td>

                    <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                      <span className={pill.className}>{pill.label}</span>
                    </td>

                    <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                      {license}
                    </td>

                    <td
                      className={`py-2 pr-4 align-top text-sm whitespace-nowrap ${expiry.className}`}
                    >
                      {expiry.text}
                    </td>

                    <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                      {driver.phone ?? "—"}
                    </td>

                    <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                      {driver.email ?? "—"}
                    </td>

                    <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                      {formatDate(driver.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
