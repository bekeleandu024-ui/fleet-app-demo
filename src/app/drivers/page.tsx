import Link from "next/link";

import prisma from "@/server/prisma";

type DriverMetrics = {
  totalTrips: number;
  openTrips: number;
  totalMiles: number;
  totalRevenue: number;
  lastTrip: Date | null;
};

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const preciseNumberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const currencyPreciseFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const toNumber = (value: unknown) => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && "toNumber" in (value as Record<string, unknown>)) {
    try {
      return Number((value as { toNumber: () => number }).toNumber());
    } catch {
      // fall through
    }
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const ensureMetrics = (map: Map<string, DriverMetrics>, id: string) => {
  const existing = map.get(id);
  if (existing) return existing;
  const created: DriverMetrics = {
    totalTrips: 0,
    openTrips: 0,
    totalMiles: 0,
    totalRevenue: 0,
    lastTrip: null,
  };
  map.set(id, created);
  return created;
};

export default async function Drivers() {
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });
  const driverIds = drivers.map((driver) => driver.id);

  const metrics = new Map<string, DriverMetrics>();

  if (driverIds.length) {
    const [tripSummaries, openTripSummaries] = await Promise.all([
      prisma.trip.groupBy({
        by: ["driverId"],
        where: { driverId: { in: driverIds } },
        _count: { _all: true },
        _sum: { miles: true, revenue: true },
        _max: { tripEnd: true, tripStart: true },
      }),
      prisma.trip.groupBy({
        by: ["driverId"],
        where: {
          driverId: { in: driverIds },
          status: { in: ["Dispatched", "InProgress"] },
        },
        _count: { _all: true },
      }),
    ]);

    for (const summary of tripSummaries) {
      if (!summary.driverId) continue;
      const entry = ensureMetrics(metrics, summary.driverId);
      entry.totalTrips = summary._count?._all ?? 0;
      entry.totalMiles = toNumber(summary._sum?.miles);
      entry.totalRevenue = toNumber(summary._sum?.revenue);
      entry.lastTrip = summary._max?.tripEnd ?? summary._max?.tripStart ?? null;
    }

    for (const summary of openTripSummaries) {
      if (!summary.driverId) continue;
      const entry = ensureMetrics(metrics, summary.driverId);
      entry.openTrips = summary._count?._all ?? 0;
    }
  }

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter((driver) => driver.active).length;
  const inactiveDrivers = totalDrivers - activeDrivers;

  const aggregated = drivers.reduce(
    (acc, driver) => {
      const metric = metrics.get(driver.id);
      return {
        openTrips: acc.openTrips + (metric?.openTrips ?? 0),
        totalMiles: acc.totalMiles + (metric?.totalMiles ?? 0),
        totalTrips: acc.totalTrips + (metric?.totalTrips ?? 0),
        driversWithTrips:
          acc.driversWithTrips + ((metric?.totalTrips ?? 0) > 0 ? 1 : 0),
      };
    },
    { openTrips: 0, totalMiles: 0, totalTrips: 0, driversWithTrips: 0 }
  );

  const averageMilesPerDriver =
    aggregated.driversWithTrips > 0
      ? aggregated.totalMiles / aggregated.driversWithTrips
      : 0;

  const averageTripsPerActiveDriver =
    activeDrivers > 0 ? aggregated.totalTrips / activeDrivers : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">Fleet directory</p>
          <h1 className="text-3xl font-semibold">Drivers</h1>
        </div>
        <Link
          href="/drivers/new"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
        >
          + New driver
        </Link>
      </div>

      {totalDrivers === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          <p className="text-lg font-medium">No drivers yet</p>
          <p className="mt-2 text-sm">
            Start by adding your first driver. You will see utilization metrics populate here once trips
            are recorded.
          </p>
          <Link
            href="/drivers/new"
            className="mt-6 inline-block rounded bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create driver
          </Link>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Active drivers</p>
              <p className="mt-2 text-2xl font-semibold">{activeDrivers}</p>
              <p className="text-xs text-gray-500">{inactiveDrivers} inactive</p>
            </article>
            <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Open loads</p>
              <p className="mt-2 text-2xl font-semibold">{aggregated.openTrips}</p>
              <p className="text-xs text-gray-500">Drivers with assignments in progress</p>
            </article>
            <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Avg miles / driver</p>
              <p className="mt-2 text-2xl font-semibold">
                {preciseNumberFormatter.format(averageMilesPerDriver)}
              </p>
              <p className="text-xs text-gray-500">Based on drivers with recorded trips</p>
            </article>
            <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Avg trips / active driver</p>
              <p className="mt-2 text-2xl font-semibold">
                {preciseNumberFormatter.format(averageTripsPerActiveDriver)}
              </p>
              <p className="text-xs text-gray-500">Active drivers only</p>
            </article>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Driver utilization
            </h2>
            <ul className="space-y-4">
              {drivers.map((driver) => {
                const metric = metrics.get(driver.id) ?? {
                  totalTrips: 0,
                  openTrips: 0,
                  totalMiles: 0,
                  totalRevenue: 0,
                  lastTrip: null,
                };

                const averageMiles =
                  metric.totalTrips > 0 ? metric.totalMiles / metric.totalTrips : 0;
                const averageRevenue =
                  metric.totalTrips > 0 ? metric.totalRevenue / metric.totalTrips : 0;

                return (
                  <li
                    key={driver.id}
                    className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold">{driver.name}</h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              driver.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {driver.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Home base: {driver.homeBase ? driver.homeBase : "Not set"}
                        </div>
                        <div className="text-sm text-gray-600">
                          License: {driver.license ? driver.license : "Not captured"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Last trip: {metric.lastTrip ? dateFormatter.format(metric.lastTrip) : "No trips recorded"}
                        </div>
                      </div>
                      <Link
                        className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                        href={`/drivers/${driver.id}/edit`}
                      >
                        Manage
                      </Link>
                    </div>

                    <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Open loads</dt>
                        <dd className="mt-1 text-lg font-semibold">{metric.openTrips}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Lifetime trips</dt>
                        <dd className="mt-1 text-lg font-semibold">{metric.totalTrips}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Total miles</dt>
                        <dd className="mt-1 text-lg font-semibold">
                          {numberFormatter.format(metric.totalMiles)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Total revenue</dt>
                        <dd className="mt-1 text-lg font-semibold">
                          {currencyFormatter.format(metric.totalRevenue)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Avg miles / trip</dt>
                        <dd className="mt-1 text-lg font-semibold">
                          {preciseNumberFormatter.format(averageMiles)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Avg revenue / trip</dt>
                        <dd className="mt-1 text-lg font-semibold">
                          {currencyPreciseFormatter.format(averageRevenue)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
