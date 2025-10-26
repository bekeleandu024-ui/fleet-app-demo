import { StatusPill } from "@/components/StatusPill";
import { prisma } from "@/server/prisma";

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      type: true,
      homeBase: true,
      active: true
    }
  });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Units</h1>
        <p className="text-sm text-zinc-400">Active power units and trailers in the fleet.</p>
      </header>
      <div className="overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-900/40">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Home base</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            {units.map((unit) => (
              <tr key={unit.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3 font-medium text-white">{unit.code}</td>
                <td className="px-4 py-3">{unit.type ?? "-"}</td>
                <td className="px-4 py-3">{unit.homeBase ?? "-"}</td>
                <td className="px-4 py-3">
                  <StatusPill active={unit.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
