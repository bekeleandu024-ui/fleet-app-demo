import prisma from "@/lib/prisma";

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default async function RatesPage() {
  const [rates, settings] = await Promise.all([
    prisma.rate.findMany({ orderBy: [{ type: "asc" }, { zone: "asc" }] }),
    prisma.rateSetting.findMany({ orderBy: [{ rateKey: "asc" }, { category: "asc" }] }),
  ]);

  const safeRates = rates.map(rate => ({
    ...rate,
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
    label: [rate.type, rate.zone].filter(Boolean).join(" • "),
  }));

  const safeSettings = settings.map(setting => ({
    ...setting,
    value: Number(setting.value),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Rates</h1>
        <p className="text-sm text-slate-600">Review cents-per-mile rates and supporting settings.</p>
      </div>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-800">Rate table</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Zone</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Fixed CPM</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Wage CPM</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Add-ons CPM</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Rolling CPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {safeRates.map(rate => (
                <tr key={rate.id}>
                  <td className="px-4 py-2">{rate.type || "—"}</td>
                  <td className="px-4 py-2">{rate.zone || "—"}</td>
                  <td className="px-4 py-2 text-right">{rate.fixedCPM.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{rate.wageCPM.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{rate.addOnsCPM.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{rate.rollingCPM.toFixed(2)}</td>
                </tr>
              ))}
              {safeRates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-slate-500">
                    No rates defined yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-800">Rate settings</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Rate key</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Category</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Value</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Unit</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {safeSettings.map(setting => (
                <tr key={setting.id}>
                  <td className="px-4 py-2">{setting.rateKey}</td>
                  <td className="px-4 py-2">{setting.category}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(setting.value)}</td>
                  <td className="px-4 py-2">{setting.unit}</td>
                  <td className="px-4 py-2 text-slate-600">{setting.note || "—"}</td>
                </tr>
              ))}
              {safeSettings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                    No settings recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
