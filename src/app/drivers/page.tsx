import prisma from "@/server/prisma";
import Link from "next/link";

export default async function Drivers() {
  const items = await prisma.driver.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Link href="/drivers/new" className="px-3 py-2 rounded border">+ New</Link>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600">No drivers yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(d => (
            <li key={d.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-xs text-gray-600">{d.homeBase ?? "-"}</div>
              </div>
              <Link className="underline text-sm" href={`/drivers/${d.id}/edit`}>Edit</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
