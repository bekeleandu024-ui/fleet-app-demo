import prisma from "@/server/prisma";
import Link from "next/link";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Link href="/drivers/new" className="px-3 py-2 rounded-lg border">
          + New Driver
        </Link>
      </div>

      {drivers.length === 0 ? (
        <p className="text-gray-600">No drivers yet. Add your first driver.</p>
      ) : (
        <ul className="space-y-3">
          {drivers.map((driver) => (
            <li key={driver.id} className="p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{driver.name}</div>
                  {driver.homeBase && (
                    <div className="text-sm text-gray-600">{driver.homeBase}</div>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    driver.active
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  {driver.active ? "Active" : "Inactive"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
