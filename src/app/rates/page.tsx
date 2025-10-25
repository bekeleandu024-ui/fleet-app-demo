import prisma from "@/server/prisma";
import Link from "next/link";
import RateSettingsTable from "./rate-settings-table";

export const runtime = "nodejs";

function formatCurrency(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "—";
}

export default async function RatesPage() {
  const [rates, settings] = await Promise.all([
    prisma.rate.findMany({
      orderBy: [{ type: "asc" }, { zone: "asc" }],
    }),
    prisma.rateSetting.findMany({
      orderBy: [{ rateKey: "asc" }, { category: "asc" }],
    }),
  ]);

  const rateTemplates = rates.map((rate) => {
    const fixed = Number(rate.fixedCPM);
    const wage = Number(rate.wageCPM);
    const addOns = Number(rate.addOnsCPM);
    const rolling = Number(rate.rollingCPM);
    const total = fixed + wage + addOns + rolling;

    return {
      id: rate.id,
      type: rate.type ?? "Uncategorized",
      zone: rate.zone ?? "Unzoned",
      fixed,
      wage,
      addOns,
      rolling,
      total,
    };
  });

  const totals = rateTemplates.map((item) => item.total);
  const rateCount = rateTemplates.length;
  const averageTotal = totals.length
    ? totals.reduce((sum, value) => sum + value, 0) / totals.length
    : null;
  const highestTotal = totals.length ? Math.max(...totals) : null;
  const lowestTotal = totals.length ? Math.min(...totals) : null;

  const rateSettingsForClient = settings.map((item) => ({
    ...item,
    value: Number(item.value),
    updatedAt: item.updatedAt.toISOString(),
  }));

  const summaryCards = [
    { label: "Rate templates", value: rateCount.toString() },
    {
      label: "Average total CPM",
      value: averageTotal == null ? "—" : formatCurrency(averageTotal),
    },
    {
      label: "Highest total CPM",
      value: highestTotal == null ? "—" : formatCurrency(highestTotal),
    },
    {
      label: "Lowest total CPM",
      value: lowestTotal == null ? "—" : formatCurrency(lowestTotal),
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-10 p-6">
      <div className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Rates</h1>
          <p className="max-w-xl text-sm text-gray-600">
            Review mileage templates and the operational rate table used by your pricing model.
          </p>
        </div>
        <Link
          href="/rates/new"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium shadow-sm transition hover:border-black hover:text-black"
        >
          + New rate or entry
        </Link>
      </div>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="text-xs uppercase tracking-wide text-gray-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold">{card.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Trip rate defaults</h2>
            <p className="text-sm text-gray-600">
              These templates set the CPM breakdown that populates new trips.
            </p>
          </div>
          <Link
            href="/rates/new"
            className="inline-flex items-center justify-center rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:border-black hover:text-black"
          >
            + Add template
          </Link>
        </div>

        {rateTemplates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
            No trip rate templates yet. Create your first one to standardize cost calculations.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Zone
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Fixed CPM
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Wage CPM
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Add-ons CPM
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Rolling CPM
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Total CPM
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {rateTemplates.map((rate) => (
                  <tr key={rate.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{rate.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{rate.zone}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                      {formatCurrency(rate.fixed)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                      {formatCurrency(rate.wage)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                      {formatCurrency(rate.addOns)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                      {formatCurrency(rate.rolling)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                      {formatCurrency(rate.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Link
                        href={`/rates/${rate.id}/edit`}
                        className="inline-flex items-center justify-center rounded border border-gray-300 px-3 py-1 text-sm font-medium hover:border-black hover:text-black"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t bg-gray-50 px-4 py-2 text-right text-xs text-gray-500">
              Values shown in CPM (cost per mile).
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Operational rate table</h2>
            <p className="text-sm text-gray-600">
              This table powers costing formulas for accessorials, fuel, and other adjustments.
            </p>
          </div>
          <Link
            href="/rates/new#rate-setting"
            className="inline-flex items-center justify-center rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:border-black hover:text-black"
          >
            + Add rate entry
          </Link>
        </div>

        {rateSettingsForClient.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
            No rate table entries yet. Use the form above to add operational cost references.
          </div>
        ) : (
          <RateSettingsTable items={rateSettingsForClient} />
        )}
      </section>
    </main>
  );
}
