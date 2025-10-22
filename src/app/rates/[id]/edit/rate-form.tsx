"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RateFormProps = {
  rate: {
    id: string;
    type: string;
    zone: string;
    fixedCPM: string;
    wageCPM: string;
    addOnsCPM: string;
    rollingCPM: string;
  };
};

type RateFormState = RateFormProps["rate"]; // reuse field types

const numberKeys = ["fixedCPM", "wageCPM", "addOnsCPM", "rollingCPM"] as const;

export default function RateEditForm({ rate }: RateFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<RateFormState>(rate);

  const totalCPM = useMemo(
    () =>
      numberKeys.reduce((sum, key) => {
        const value = parseFloat(form[key]);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [form]
  );

  function update<K extends keyof RateFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (numberKeys.some((key) => form[key].trim() === "")) {
      alert("Please provide all CPM values.");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/rates/${rate.id}`, {
      method: "PATCH",
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

    setSaving(false);

    if (res.ok) {
      router.push("/rates");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to update rate.");
    }
  }

  async function onDelete() {
    if (!confirm("Delete this rate?")) return;

    setDeleting(true);
    const res = await fetch(`/api/rates/${rate.id}`, { method: "DELETE" });
    setDeleting(false);

    if (res.ok) {
      router.push("/rates");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to delete rate.");
    }
  }

  return (
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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="px-3 py-2 rounded border border-red-600 text-red-600 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </form>
  );
}
