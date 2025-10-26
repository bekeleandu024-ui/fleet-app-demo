import { prisma } from "@/server/prisma";
import { formatYMD } from "@/lib/date";
import { StatusPill } from "@/components/StatusPill";

function licenseStatusColor(expiresAt: Date | null): string {
  if (!expiresAt) {
    return "text-zinc-500";
  }

  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  if (days < 0) {
    return "text-rose-400";
  }

  if (days <= 30) {
    return "text-amber-300";
  }

  return "text-emerald-300";
}

export default async function DriversPage() {
  const raw = await prisma.driver.findMany({
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
      createdAt: true
    }
  });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Drivers</h1>
        <p className="text-sm text-zinc-400">Credential snapshot for fleet operators.</p>
      </header>
      <div className="overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-900/40">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Home base</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">License</th>
              <th className="px-4 py-3">License expiry</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            {raw.map((driver) => {
              const licenseSummary = driver.licenseNumber
                ? `${driver.licenseClass ?? "-"} ${driver.licenseNumber}${driver.licenseJurisdiction ? ` (${driver.licenseJurisdiction})` : ""}`
                : "-";

              const endorsements = driver.licenseEndorsements?.length
                ? driver.licenseEndorsements.join(", ")
                : null;

              const expiresAt = driver.licenseExpiresAt ? new Date(driver.licenseExpiresAt) : null;

              return (
                <tr key={driver.id} className="hover:bg-zinc-900/60">
                  <td className="px-4 py-3 font-medium text-white">{driver.name}</td>
                  <td className="px-4 py-3">{driver.homeBase ?? "-"}</td>
                  <td className="px-4 py-3">
                    <StatusPill active={driver.active} />
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    <div className="flex flex-col">
                      <span>{licenseSummary}</span>
                      {endorsements ? <span className="text-xs text-zinc-500">{endorsements}</span> : null}
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${licenseStatusColor(expiresAt)}`}>
                    {formatYMD(expiresAt)}
                  </td>
                  <td className="px-4 py-3">{driver.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    {driver.email ? (
                      <a className="text-emerald-300 hover:text-emerald-200" href={`mailto:${driver.email}`}>
                        {driver.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatYMD(driver.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
