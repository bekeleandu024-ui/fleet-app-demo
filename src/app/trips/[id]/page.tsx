import prisma from "@/server/prisma";
import Link from "next/link";

function num(n: any) {
  return n == null ? "-" : Number(n).toFixed(2);
}

export default async function TripDetail({ params }: { params: { id: string } }) {
  const t = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!t) return <main className="p-6">Not found</main>;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trip {t.id}</h1>
        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded border" href={`/trips/${t.id}/edit`}>
            Edit
          </Link>
          <Link className="px-3 py-2 rounded border" href={`/trips/${t.id}/recalc`}>
            Recalc totals
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">Driver / Unit</div>
          <div className="font-medium">
            {t.driver} • {t.unit}
          </div>
          <div className="text-sm mt-1">
            {t.type ?? "(no type)"} • {t.zone ?? "(no zone)"}
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">Status</div>
          <div className="font-medium">{t.status}</div>
        </div>
      </div>

      <div className="border rounded p-3">
        <div className="font-medium mb-2">Costing</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Fixed/Wage/AddOns/Rolling CPM</div>
          <div className="text-right">
            {num(t.fixedCPM)} / {num(t.wageCPM)} / {num(t.addOnsCPM)} / {num(t.rollingCPM)}
          </div>
          <div>Miles • Total CPM</div>
          <div className="text-right">
            {num(t.miles)} • {num(t.totalCPM)}
          </div>
          <div>Total Cost</div>
          <div className="text-right font-semibold">{num(t.totalCost)}</div>
          <div>Revenue • Profit</div>
          <div className="text-right">
            {num(t.revenue)} • {num(t.profit)}
          </div>
          <div>Margin</div>
          <div className="text-right">
            {t.marginPct == null ? "-" : (Number(t.marginPct) * 100).toFixed(1) + "%"}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <StatusButtons id={t.id} status={t.status} hasEnd={!!t.tripEnd} miles={Number(t.miles)} />
      </div>
    </main>
  );
}

function StatusButtons({ id, status }: { id: string; status: string; hasEnd: boolean; miles: number }) {
  "use client";
  async function setStatus(s: string) {
    const res = await fetch(`/api/trips/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    if (res.ok) location.reload();
    else alert(await res.text());
  }
  const Btn = (p: any) => <button className="px-3 py-2 rounded border" {...p} />;

  return (
    <div className="space-x-2">
      {status === "Created" && <Btn onClick={() => setStatus("Dispatched")}>Dispatch</Btn>}
      {status === "Dispatched" && <Btn onClick={() => setStatus("InProgress")}>Start</Btn>}
      {status === "InProgress" && <Btn onClick={() => setStatus("Completed")}>Complete</Btn>}
      {(status === "Created" || status === "Dispatched" || status === "InProgress") && (
        <Btn onClick={() => setStatus("Cancelled")}>Cancel</Btn>
      )}
    </div>
  );
}
