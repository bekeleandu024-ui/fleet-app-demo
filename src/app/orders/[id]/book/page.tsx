import { notFound } from "next/navigation";

import { format } from "date-fns";

import { prisma } from "@/server/prisma";

function formatWindow(start: Date | null, end: Date | null) {
  if (!start && !end) return "-";
  const toStr = (value: Date | null) => (value ? format(value, "MMM d, yyyy HH:mm") : "?");
  return `${toStr(start)} → ${toStr(end)}`;
}

export default async function BookOrderPage({ params }: { params: { id: string } }) {
  const [order, drivers, units] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        customer: true,
        origin: true,
        destination: true,
        puWindowStart: true,
        puWindowEnd: true,
        delWindowStart: true,
        delWindowEnd: true,
        requiredTruck: true,
        notes: true,
        createdAt: true
      }
    }),
    prisma.driver.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, homeBase: true, active: true }
    }),
    prisma.unit.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, type: true, homeBase: true, active: true }
    })
  ]);

  if (!order) {
    notFound();
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Book order</h1>
        <p className="text-sm text-zinc-400">Assign a driver and equipment for this move.</p>
      </div>
      <div className="flex justify-center">
        <form className="w-full max-w-xl space-y-6 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-lg">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-white">Trip details</h2>
            <p className="text-sm text-zinc-400">Select who is hauling this load and when they should roll.</p>
          </div>
          <div className="space-y-4">
            <label className="flex flex-col gap-2 text-sm" htmlFor="driver">
              <span className="font-medium text-zinc-200">Driver</span>
              <select
                id="driver"
                name="driverId"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  Select driver
                </option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} • {driver.homeBase ?? "-"}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm" htmlFor="unit">
              <span className="font-medium text-zinc-200">Unit</span>
              <select
                id="unit"
                name="unitId"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  Select unit
                </option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} • {unit.type ?? "Unspecified"}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm" htmlFor="dispatch">
                <span className="font-medium text-zinc-200">Dispatch time</span>
                <input
                  id="dispatch"
                  name="dispatchAt"
                  type="datetime-local"
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm" htmlFor="arrival">
                <span className="font-medium text-zinc-200">Planned arrival</span>
                <input
                  id="arrival"
                  name="arrivalAt"
                  type="datetime-local"
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm" htmlFor="instructions">
              <span className="font-medium text-zinc-200">Instructions</span>
              <textarea
                id="instructions"
                name="instructions"
                rows={3}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                placeholder="Notes for the driver"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
            >
              Create trip
            </button>
          </div>
        </form>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-6">
            <h2 className="text-lg font-medium text-white">Order details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-zinc-500">Customer</dt>
                <dd className="text-white">{order.customer}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Lane</dt>
                <dd>{order.origin} → {order.destination}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Pickup window</dt>
                <dd>{formatWindow(order.puWindowStart, order.puWindowEnd)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Delivery window</dt>
                <dd>{formatWindow(order.delWindowStart, order.delWindowEnd)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Required truck</dt>
                <dd>{order.requiredTruck ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Created</dt>
                <dd>{format(order.createdAt, "yyyy-MM-dd")}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs uppercase text-zinc-500">Notes</dt>
                <dd>{order.notes ?? "-"}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-6">
            <h2 className="text-lg font-medium text-white">Drivers</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              {drivers.map((driver) => (
                <li key={driver.id} className="rounded-md border border-zinc-800/80 bg-zinc-950/60 px-3 py-2">
                  <p className="font-medium text-white">{driver.name}</p>
                  <p className="text-xs text-zinc-500">{driver.homeBase ?? "-"} • {driver.active ? "Active" : "Inactive"}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-6">
            <h2 className="text-lg font-medium text-white">Units</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              {units.map((unit) => (
                <li key={unit.id} className="rounded-md border border-zinc-800/80 bg-zinc-950/60 px-3 py-2">
                  <p className="font-medium text-white">{unit.code}</p>
                  <p className="text-xs text-zinc-500">{unit.type ?? "-"} • {unit.homeBase ?? "-"}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
