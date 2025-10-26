import { prisma } from "@/src/server/prisma";

type DriverRecord = {
  id: string;
  name: string;
  homeBase: string | null;
  active: boolean;
  licenseNumber: string | null;
  licenseJurisdiction: string | null;
  licenseClass: string | null;
  licenseExpiresAt: Date | null;
};

type ExpiryPresentation = {
  label: string;
  toneClass: string;
};

const buildLicenseDisplay = (driver: DriverRecord): string => {
  const primaryParts: string[] = [];

  if (driver.licenseClass) {
    primaryParts.push(driver.licenseClass);
  }

  if (driver.licenseNumber) {
    primaryParts.push(driver.licenseNumber);
  }

  const primary = primaryParts.join(" — ");
  const withJurisdiction = driver.licenseJurisdiction
    ? `${primary}${primary ? " " : ""}(${driver.licenseJurisdiction})`
    : primary;

  return withJurisdiction || "—";
};

const formatExpiry = (date: Date | null): ExpiryPresentation => {
  if (!date) {
    return { label: "—", toneClass: "text-gray-200" };
  }

  const isoDate = date.toISOString().slice(0, 10);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = date.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return { label: isoDate, toneClass: "text-red-400" };
  }

  if (diffDays <= 30) {
    return { label: isoDate, toneClass: "text-yellow-400" };
  }

  return { label: isoDate, toneClass: "text-gray-200" };
};

export default async function Drivers() {
  const drivers: DriverRecord[] = await prisma.driver.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      homeBase: true,
      active: true,
      licenseNumber: true,
      licenseJurisdiction: true,
      licenseClass: true,
      licenseExpiresAt: true,
    },
  });

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-semibold text-gray-100">Drivers</h1>
      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">
                  Driver
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">
                  Home base
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">
                  License
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">
                  License expiry
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {drivers.map((driver) => {
                const licenseDisplay = buildLicenseDisplay(driver);
                const expiry = formatExpiry(driver.licenseExpiresAt);

                return (
                  <tr key={driver.id}>
                    <td className="py-2 align-top text-sm text-gray-100">{driver.name}</td>
                    <td className="py-2 align-top text-sm text-gray-100">
                      {driver.homeBase ?? "—"}
                    </td>
                    <td className="py-2 align-top text-sm text-gray-100">
                      <span
                        className={
                          driver.active
                            ? "inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                            : "inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300"
                        }
                      >
                        {driver.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2 align-top text-sm text-gray-100">{licenseDisplay}</td>
                    <td className={`py-2 align-top text-sm text-gray-100 ${expiry.toneClass}`}>{expiry.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
