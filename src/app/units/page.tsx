import Link from "next/link";
import prisma from "@/src/server/prisma";

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({
    orderBy: { code: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Units</h1>
        <Link href="/units/new" className="rounded border px-3 py-2">
          + New Unit
        </Link>
      </div>

      {units.length === 0 ? (
        <p className="text-sm text-gray-600">No units yet. Create one to get started.</p>
      ) : (
        <ul className="space-y-3">
          {units.map((unit) => (
            <li key={unit.id} className="rounded border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">{unit.code}</div>
                  <div className="text-sm text-gray-600">
                    {unit.type ? unit.type : "No type"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {unit.homeBase ? unit.homeBase : "No home base"}
                  </div>
                  {!unit.active && (
                    <span className="mt-1 inline-block rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                      Inactive
                    </span>
                  )}
                </div>
                <Link href={`/units/${unit.id}/edit`} className="rounded border px-3 py-2 text-sm">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
