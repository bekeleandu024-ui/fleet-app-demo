"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const numberFields = ["fixedCPM", "wageCPM", "addOnsCPM", "rollingCPM"] as const;

type FormState = {
  type: string;
  zone: string;
  fixedCPM: string;
  wageCPM: string;
  addOnsCPM: string;
  rollingCPM: string;
};

export default function NewRatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    type: "",
    zone: "",
    fixedCPM: "",
    wageCPM: "",
    addOnsCPM: "",
    rollingCPM: "",
  });

  const totalCPM = useMemo(
    () =>
      numberFields.reduce((sum, key) => {
        const value = parseFloat(form[key]);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [form]
  );

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (numberFields.some((key) => form[key].trim() === "")) {
      alert("Please provide all CPM values.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type.trim() || null,
        zone: form.zone.trim() || null,
        fixedCPM: parseFloat(form.fixedCPM),
        wageCPM: parseFloat(form.wageCPM),
        addOnsCPM: parseFloat(form.addOnsCPM),
        rollingCPM: parseFloat(form.rollingCPM),
      }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/rates");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to create rate.");
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Rate</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Type</label>
            <input
              className="w-full border rounded p-2"
              value={form.type}
              onChange={(event) => update("type", event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Zone</label>
            <input
              className="w-full border rounded p-2"
              value={form.zone}
              onChange={(event) => update("zone", event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Fixed CPM *</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded p-2"
              value={form.fixedCPM}
              onChange={(event) => update("fixedCPM", event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Wage CPM *</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded p-2"
              value={form.wageCPM}
              onChange={(event) => update("wageCPM", event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Add-ons CPM *</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded p-2"
              value={form.addOnsCPM}
              onChange={(event) => update("addOnsCPM", event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Rolling CPM *</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded p-2"
              value={form.rollingCPM}
              onChange={(event) => update("rollingCPM", event.target.value)}
            />
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Total CPM: <span className="font-semibold">{totalCPM.toFixed(2)}</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? "Saving..." : "Create Rate"}
        </button>
      </form>
    </main>
  );
}
