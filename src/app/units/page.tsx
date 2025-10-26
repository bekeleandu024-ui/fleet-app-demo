import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Units</h1>
          <p className="text-sm text-slate-600">Tractors and trailers available for trips.</p>
        </div>
        <Link href="/units/new" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
          + New unit
        </Link>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Code</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Home base</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {units.map(unit => (
              <tr key={unit.id}>
                <td className="px-4 py-2">{unit.code}</td>
                <td className="px-4 py-2">{unit.type ?? "—"}</td>
                <td className="px-4 py-2">{unit.homeBase ?? "—"}</td>
                <td className="px-4 py-2">{unit.active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/units/${unit.id}/edit`}
                    className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {units.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No units yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
