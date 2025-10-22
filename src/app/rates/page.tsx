import prisma from "@/server/prisma";
import Link from "next/link";

export default async function RatesPage() {
  const rates = await prisma.rate.findMany({
    orderBy: [{ type: "asc" }, { zone: "asc" }],
  });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Rates</h1>
        <Link href="/rates/new" className="px-3 py-2 rounded-lg border">
          + New Rate
        </Link>
      </div>

      {rates.length === 0 ? (
        <p className="text-gray-600">No rates yet. Create your first one.</p>
      ) : (
        <ul className="space-y-3">
          {rates.map((rate) => {
            const totalCpm =
              Number(rate.fixedCPM) +
              Number(rate.wageCPM) +
              Number(rate.addOnsCPM) +
              Number(rate.rollingCPM);

            return (
              <li key={rate.id} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      {rate.type ?? "Uncategorized"}
                      {rate.zone ? ` — ${rate.zone}` : ""}
                    </div>
                    <div className="text-sm text-gray-600">
                      Fixed: {rate.fixedCPM.toString()} | Wage: {rate.wageCPM.toString()} | Add-ons: {rate.addOnsCPM.toString()} | Rolling: {rate.rollingCPM.toString()}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-sm text-gray-500">Total CPM</div>
                    <div className="text-lg font-semibold">{totalCpm.toFixed(2)}</div>
                    <Link
                      href={`/rates/${rate.id}/edit`}
                      className="inline-block px-3 py-2 rounded-lg border text-sm"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
