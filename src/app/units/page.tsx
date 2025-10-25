import Link from "next/link";

import prisma from "@/server/prisma";

type UnitMetrics = {
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

const ensureMetrics = (map: Map<string, UnitMetrics>, id: string) => {
  const existing = map.get(id);
  if (existing) return existing;
  const created: UnitMetrics = {
    totalTrips: 0,
    openTrips: 0,
    totalMiles: 0,
    totalRevenue: 0,
    lastTrip: null,
  };
  map.set(id, created);
  return created;
};

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({ orderBy: { code: "asc" } });
  const unitIds = units.map((unit) => unit.id);

  const metrics = new Map<string, UnitMetrics>();

  if (unitIds.length) {
    const [tripSummaries, openTripSummaries] = await Promise.all([
      prisma.trip.groupBy({
        by: ["unitId"],
        where: { unitId: { in: unitIds } },
        _count: { _all: true },
        _sum: { miles: true, revenue: true },
        _max: { tripEnd: true, tripStart: true },
      }),
      prisma.trip.groupBy({
        by: ["unitId"],
        where: {
          unitId: { in: unitIds },
          status: { in: ["Dispatched", "InProgress"] },
        },
        _count: { _all: true },
      }),
    ]);

    for (const summary of tripSummaries) {
      if (!summary.unitId) continue;
      const entry = ensureMetrics(metrics, summary.unitId);
      entry.totalTrips = summary._count?._all ?? 0;
      entry.totalMiles = toNumber(summary._sum?.miles);
      entry.totalRevenue = toNumber(summary._sum?.revenue);
      entry.lastTrip = summary._max?.tripEnd ?? summary._max?.tripStart ?? null;
    }

    for (const summary of openTripSummaries) {
      if (!summary.unitId) continue;
      const entry = ensureMetrics(metrics, summary.unitId);
      entry.openTrips = summary._count?._all ?? 0;
    }
  }

  const totalUnits = units.length;
  const activeUnits = units.filter((unit) => unit.active).length;
  const inactiveUnits = totalUnits - activeUnits;

  const aggregated = units.reduce(
    (acc, unit) => {
      const metric = metrics.get(unit.id);
      return {
        openTrips: acc.openTrips + (metric?.openTrips ?? 0),
        totalMiles: acc.totalMiles + (metric?.totalMiles ?? 0),
        totalTrips: acc.totalTrips + (metric?.totalTrips ?? 0),
        unitsWithTrips: acc.unitsWithTrips + ((metric?.totalTrips ?? 0) > 0 ? 1 : 0),
        activeUnitsWithTrips:
          acc.activeUnitsWithTrips + (unit.active && (metric?.openTrips ?? 0) > 0 ? 1 : 0),
      };
    },
    { openTrips: 0, totalMiles: 0, totalTrips: 0, unitsWithTrips: 0, activeUnitsWithTrips: 0 }
  );

  const averageMilesPerUnit =
    aggregated.unitsWithTrips > 0 ? aggregated.totalMiles / aggregated.unitsWithTrips : 0;

  const averageTripsPerActiveUnit =
    activeUnits > 0 ? aggregated.totalTrips / activeUnits : 0;

  const runningUnits = aggregated.activeUnitsWithTrips;

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">Fleet directory</p>
          <h1 className="text-3xl font-semibold">Units</h1>
        </div>
        <Link
          href="/units/new"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white/90 px-4 py-2 text-sm font-medium shadow-sm transition hover:border-gray-400 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100 dark:shadow-none dark:hover:border-emerald-400 dark:hover:bg-slate-800"
        >
          + New unit
        </Link>
      </div>

      {totalUnits === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white/90 p-8 text-center text-gray-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
          <p className="text-lg font-medium">No units yet</p>
          <p className="mt-2 text-sm">
            Start by adding your first unit. Utilization metrics will populate once trips are recorded.
          </p>
          <Link
            href="/units/new"
            className="mt-6 inline-block rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            Create unit
          </Link>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-lg border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60 dark:shadow-none">
              <p className="text-xs uppercase tracking-wide text-gray-500">Active units</p>
              <p className="mt-2 text-2xl font-semibold">{activeUnits}</p>
              <p className="text-xs text-gray-500">{inactiveUnits} inactive • {runningUnits} running loads now</p>
            </article>
            <article className="rounded-lg border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60 dark:shadow-none">
              <p className="text-xs uppercase tracking-wide text-gray-500">Open assignments</p>
              <p className="mt-2 text-2xl font-semibold">{aggregated.openTrips}</p>
              <p className="text-xs text-gray-500">Loads currently dispatched or underway</p>
            </article>
            <article className="rounded-lg border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60 dark:shadow-none">
              <p className="text-xs uppercase tracking-wide text-gray-500">Avg miles / utilized unit</p>
              <p className="mt-2 text-2xl font-semibold">
                {preciseNumberFormatter.format(averageMilesPerUnit)}
              </p>
              <p className="text-xs text-gray-500">Based on units with recorded trips</p>
            </article>
            <article className="rounded-lg border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60 dark:shadow-none">
              <p className="text-xs uppercase tracking-wide text-gray-500">Avg trips / active unit</p>
              <p className="mt-2 text-2xl font-semibold">
                {preciseNumberFormatter.format(averageTripsPerActiveUnit)}
              </p>
              <p className="text-xs text-gray-500">Active units only</p>
            </article>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Unit utilization
            </h2>
            <ul className="space-y-4">
              {units.map((unit) => {
                const metric = metrics.get(unit.id) ?? {
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
                    key={unit.id}
                    className="rounded-lg border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60 dark:shadow-none"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <div>
                            <h3 className="text-xl font-semibold">{unit.code}</h3>
                            <p className="text-sm text-gray-500">{unit.name}</p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              unit.active
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                                : "bg-gray-200 text-gray-700 dark:bg-slate-700/60 dark:text-slate-200"
                            }`}
                          >
                            {unit.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Type: {unit.type ? unit.type : "Not set"}
                        </div>
                        <div className="text-sm text-gray-600">
                          Home base: {unit.homeBase ? unit.homeBase : "Not set"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Last trip: {metric.lastTrip ? dateFormatter.format(metric.lastTrip) : "No trips recorded"}
                        </div>
                      </div>
                      <Link
                        className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-600 dark:text-slate-100 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
                        href={`/units/${unit.id}/edit`}
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
