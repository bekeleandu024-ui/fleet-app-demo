import { prisma } from "@/server/prisma";
import { toNum } from "@/lib/serialize";

export default async function RatesPage() {
  const rates = await prisma.rate.findMany({
    orderBy: [{ type: "asc" }, { zone: "asc" }],
    select: {
      id: true,
      type: true,
      zone: true,
      fixedCPM: true,
      wageCPM: true,
      addOnsCPM: true,
      rollingCPM: true
    }
  });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Rates</h1>
        <p className="text-sm text-zinc-400">Linehaul cents-per-mile profiles by equipment and zone.</p>
      </header>
      <div className="overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-900/40">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Fixed CPM</th>
              <th className="px-4 py-3">Wage CPM</th>
              <th className="px-4 py-3">Add-ons CPM</th>
              <th className="px-4 py-3">Rolling CPM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            {rates.map((rate) => (
              <tr key={rate.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3 font-medium text-white">{rate.type ?? "-"}</td>
                <td className="px-4 py-3">{rate.zone ?? "-"}</td>
                <td className="px-4 py-3">{toNum(rate.fixedCPM)?.toFixed(2) ?? "-"}</td>
                <td className="px-4 py-3">{toNum(rate.wageCPM)?.toFixed(2) ?? "-"}</td>
                <td className="px-4 py-3">{toNum(rate.addOnsCPM)?.toFixed(2) ?? "-"}</td>
                <td className="px-4 py-3">{toNum(rate.rollingCPM)?.toFixed(2) ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
