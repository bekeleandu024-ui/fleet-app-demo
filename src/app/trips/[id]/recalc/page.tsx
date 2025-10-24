import Link from "next/link";
import { notFound } from "next/navigation";
import { recalcTripTotals } from "@/server/trip-recalc";

const decimalFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatDecimal(value: number | null | undefined) {
  return value == null ? "—" : decimalFormatter.format(value);
}

function formatPercent(value: number | null | undefined) {
  return value == null ? "—" : `${percentFormatter.format(value * 100)}%`;
}

function formatDiff(after: number | null, before: number | null, asPercent = false) {
  if (after == null || before == null) return "—";
  const delta = after - before;
  if (Math.abs(delta) < 0.0005) return asPercent ? "0.0%" : "0.00";
  if (asPercent) {
    return `${percentFormatter.format(delta * 100)}%`;
  }
  return decimalFormatter.format(delta);
}

function diffTone(after: number | null, before: number | null) {
  if (after == null || before == null) return "text-gray-500";
  const delta = after - before;
  if (Math.abs(delta) < 0.0005) return "text-gray-500";
  return delta > 0 ? "text-emerald-600" : "text-rose-600";
}

export default async function TripRecalcPage({ params }: { params: { id: string } }) {
  const result = await recalcTripTotals(params.id);
  if (!result) notFound();

  const { trip, before, after, rateApplied } = result;
  const cpmKeys: (keyof typeof before)[] = ["fixedCPM", "wageCPM", "addOnsCPM", "rollingCPM"];
  const hadMissingBefore = cpmKeys.some((key) => before[key] == null);
  const stillMissingAfter = cpmKeys.some((key) => after[key] == null);

  const rateLabelParts = rateApplied
    ? [rateApplied.type, rateApplied.zone].filter(Boolean)
    : [];
  const rateLabel = rateLabelParts.length ? rateLabelParts.join(" • ") : "default";

  const rateMessage = rateApplied
    ? `Missing CPM values were filled using the ${rateLabel} rate.`
    : hadMissingBefore && stillMissingAfter
    ? "No matching rate defaults were found, so CPM values remain blank."
    : "All CPM values were already set; recalculation used the stored numbers.";

  const metrics: { key: keyof typeof before; label: string; isPercent?: boolean }[] = [
    { key: "fixedCPM", label: "Fixed CPM" },
    { key: "wageCPM", label: "Wage CPM" },
    { key: "addOnsCPM", label: "Add-ons CPM" },
    { key: "rollingCPM", label: "Rolling CPM" },
    { key: "totalCPM", label: "Total CPM" },
    { key: "totalCost", label: "Total Cost" },
    { key: "profit", label: "Profit" },
    { key: "marginPct", label: "Margin %", isPercent: true },
  ];

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recalculated totals</h1>
          <p className="mt-1 text-sm text-gray-500">Trip {trip.id}</p>
        </div>
        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded border" href={`/trips/${trip.id}`}>
            View trip
          </Link>
          <Link className="px-3 py-2 rounded border" href={`/trips/${trip.id}/edit`}>
            Edit trip
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Driver / Unit</div>
          <div className="font-medium">
            {trip.driver} • {trip.unit}
          </div>
          <div className="mt-3 text-sm text-gray-500">Classification</div>
          <div className="text-sm">
            {trip.type ?? "(no type)"} • {trip.zone ?? "(no zone)"}
          </div>
        </div>
        <div className="border rounded p-4 space-y-3">
          <div>
            <div className="text-sm text-gray-500">Miles</div>
            <div className="font-medium">{formatDecimal(trip.miles)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Revenue</div>
            <div className="font-medium">{formatDecimal(trip.revenue)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <div className="font-medium">{trip.status}</div>
          </div>
        </div>
      </div>

      <div className="border rounded p-4">
        <div className="font-medium">What changed</div>
        <p className="mt-1 text-sm text-gray-600">{rateMessage}</p>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Metric</th>
              <th className="px-4 py-2 text-right font-semibold">Before</th>
              <th className="px-4 py-2 text-right font-semibold">After</th>
              <th className="px-4 py-2 text-right font-semibold">Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {metrics.map(({ key, label, isPercent }) => {
              const beforeValue = before[key];
              const afterValue = after[key];
              const formatter = isPercent ? formatPercent : formatDecimal;
              const diff = formatDiff(afterValue, beforeValue, Boolean(isPercent));
              const tone = diffTone(afterValue, beforeValue);

              return (
                <tr key={key} className="transition-colors hover:bg-slate-100">
                  <td className="px-4 py-2 text-gray-800">{label}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatter(beforeValue)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatter(afterValue)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${tone}`}>{diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
