import prisma from "@/src/server/prisma";

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

function getLicenseDisplay(
  licenseClass: string | null,
  licenseNumber: string | null,
  licenseJurisdiction: string | null,
): string {
  const parts: string[] = [];

  if (licenseClass) {
    parts.push(licenseClass);
  }

  if (licenseNumber) {
    parts.push(licenseNumber);
  }

  if (licenseJurisdiction) {
    parts.push(`(${licenseJurisdiction})`);
  }

  if (parts.length === 0) {
    return "—";
  }

  return parts.join(" ");
}

function getLicenseExpiry(
  licenseExpiresAt: Date | null,
): { label: string; tone: string } {
  if (!licenseExpiresAt) {
    return { label: "—", tone: "text-gray-100" };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDate = new Date(
    licenseExpiresAt.getFullYear(),
    licenseExpiresAt.getMonth(),
    licenseExpiresAt.getDate(),
  );
  const diffMs = expiryDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let tone = "text-gray-100";
  if (diffDays < 0) {
    tone = "text-red-400";
  } else if (diffDays <= 30) {
    tone = "text-yellow-400";
  }

  return {
    label: formatDate(licenseExpiresAt) ?? "—",
    tone,
  };
}

function formatCreatedAt(createdAt: Date): string {
  return createdAt.toISOString().slice(0, 10);
}

export default async function DriversPage(): Promise<JSX.Element> {
  const drivers = await prisma.driver.findMany({
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

  const formattedDrivers = drivers.map((driver): {
    id: string;
    name: string;
    homeBase: string;
    status: { label: string; tone: string };
    license: string;
    licenseExpiry: { label: string; tone: string };
    phone: string;
    email: string;
    created: string;
  } => {
    const licenseExpiry = getLicenseExpiry(driver.licenseExpiresAt);

    return {
      id: driver.id,
      name: driver.name ?? "—",
      homeBase: driver.homeBase ?? "—",
      status: driver.active
        ? { label: "Active", tone: "bg-emerald-500/20 text-emerald-300" }
        : { label: "Inactive", tone: "bg-rose-500/10 text-rose-300" },
      license: getLicenseDisplay(
        driver.licenseClass,
        driver.licenseNumber,
        driver.licenseJurisdiction,
      ),
      licenseExpiry,
      phone: driver.phone ?? "—",
      email: driver.email ?? "—",
      created: formatCreatedAt(driver.createdAt),
    };
  });

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold text-white">Drivers</h1>
      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-100">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Driver
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Home base
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                License
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                License expiry
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Phone
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Email
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {formattedDrivers.map((driver) => (
              <tr key={driver.id} className="border-t border-border/60">
                <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                  {driver.name || "—"}
                </td>
                <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                  {driver.homeBase}
                </td>
                <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${driver.status.tone}`}
                  >
                    {driver.status.label}
                  </span>
                </td>
                <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                  {driver.license}
                </td>
                <td className="py-2 pr-4 align-top text-sm whitespace-nowrap">
                  <span className={driver.licenseExpiry.tone}>{driver.licenseExpiry.label}</span>
                </td>
                <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                  {driver.phone}
                </td>
                <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                  {driver.email}
                </td>
                <td className="py-2 pr-4 align-top text-sm text-gray-100 whitespace-nowrap">
                  {driver.created}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
