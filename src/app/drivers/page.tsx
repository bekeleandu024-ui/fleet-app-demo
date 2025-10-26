import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Drivers</h1>
          <p className="text-sm text-slate-600">Manage drivers assigned to trips.</p>
        </div>
        <Link href="/drivers/new" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
          + New driver
        </Link>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Home base</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {drivers.map(driver => (
              <tr key={driver.id}>
                <td className="px-4 py-2">{driver.name}</td>
                <td className="px-4 py-2">{driver.homeBase ?? "—"}</td>
                <td className="px-4 py-2">{driver.active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/drivers/${driver.id}/edit`}
                    className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No drivers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
