import { recalcTripTotals, type TripTotals } from "@/server/trip-recalc";

function formatNumber(value: number | null | undefined, opts: { digits?: number; suffix?: string } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const digits = opts.digits ?? 2;
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return opts.suffix ? `${formatted}${opts.suffix}` : formatted;
}

function diffTone(diff: number | null | undefined) {
  if (diff === null || diff === undefined || Math.abs(diff) < 0.005) return "text-slate-500";
  return diff > 0 ? "text-emerald-600" : "text-red-600";
}

const fields: { key: keyof TripTotals; label: string; format?: (value: number | null) => string }[] = [
  { key: "miles", label: "Miles", format: value => formatNumber(value, { digits: 0 }) },
  { key: "revenue", label: "Revenue", format: value => formatNumber(value, { digits: 2 }) },
  { key: "fixedCPM", label: "Fixed CPM", format: value => formatNumber(value, { digits: 2 }) },
  { key: "wageCPM", label: "Wage CPM", format: value => formatNumber(value, { digits: 2 }) },
  { key: "addOnsCPM", label: "Add-ons CPM", format: value => formatNumber(value, { digits: 2 }) },
  { key: "rollingCPM", label: "Rolling CPM", format: value => formatNumber(value, { digits: 2 }) },
  { key: "totalCPM", label: "Total CPM", format: value => formatNumber(value, { digits: 2 }) },
  { key: "totalCost", label: "Total cost", format: value => formatNumber(value, { digits: 2 }) },
  { key: "profit", label: "Profit", format: value => formatNumber(value, { digits: 2 }) },
  { key: "marginPct", label: "Margin %", format: value => formatNumber(value, { digits: 2, suffix: "%" }) },
];

export default async function TripRecalcPage({ params }: { params: { id: string } }) {
  const result = await recalcTripTotals(params.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Recalculate trip totals</h1>
        <p className="text-sm text-slate-600">
          Trip {result.trip.id} • Driver {result.trip.driver} • Unit {result.trip.unit || "—"}
        </p>
      </div>
      {result.rateApplied ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Missing CPM values were filled using rate <span className="font-medium">{result.rateApplied.label}</span>.
        </div>
      ) : (
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          CPM values were kept from the original record.
        </div>
      )}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Metric</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Before</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">After</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {fields.map(field => {
              const before = result.before[field.key];
              const after = result.after[field.key];
              const format = field.format ?? (value => formatNumber(value, { digits: 2 }));
              const diff =
                before != null && after != null
                  ? Number((after - before).toFixed(4))
                  : after != null
                  ? after
                  : before != null
                  ? -before
                  : null;
              const diffLabel =
                diff === null || diff === undefined
                  ? "—"
                  : field.key === "marginPct"
                  ? formatNumber(diff, { digits: 2, suffix: "%" })
                  : formatNumber(diff, { digits: 2 });
              return (
                <tr key={field.key}>
                  <td className="px-4 py-2 text-slate-700">{field.label}</td>
                  <td className="px-4 py-2 text-right">{format(before)}</td>
                  <td className="px-4 py-2 text-right">{format(after)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${diffTone(diff)}`}>{diffLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
