import Link from "next/link";
import prisma from "@/src/server/prisma";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Link href="/drivers/new" className="rounded border px-3 py-2">
          + New Driver
        </Link>
      </div>

      {drivers.length === 0 ? (
        <p className="text-sm text-gray-600">No drivers yet. Create one to get started.</p>
      ) : (
        <ul className="space-y-3">
          {drivers.map((driver) => (
            <li key={driver.id} className="rounded border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">{driver.name}</div>
                  <div className="text-sm text-gray-600">
                    {driver.homeBase ? driver.homeBase : "No home base"}
                  </div>
                  {!driver.active && (
                    <span className="mt-1 inline-block rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                      Inactive
                    </span>
                  )}
                </div>
                <Link href={`/drivers/${driver.id}/edit`} className="rounded border px-3 py-2 text-sm">
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
