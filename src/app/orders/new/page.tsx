"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewOrderPage() {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    origin: "",
    destination: "",
    requiredTruck: "",
    puWindowStart: "",
    puWindowEnd: "",
    delWindowStart: "",
    delWindowEnd: "",
    notes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) r.push("/orders");
    else alert("Please fill customer, origin, destination.");
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">New Order</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm">Customer *</label>
          <input className="w-full border rounded p-2" value={form.customer} onChange={e=>set("customer", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Origin *</label>
            <input className="w-full border rounded p-2" value={form.origin} onChange={e=>set("origin", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Destination *</label>
            <input className="w-full border rounded p-2" value={form.destination} onChange={e=>set("destination", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm">Required Truck</label>
          <input className="w-full border rounded p-2" value={form.requiredTruck} onChange={e=>set("requiredTruck", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">PU Window Start (optional)</label>
            <input type="datetime-local" className="w-full border rounded p-2"
              value={form.puWindowStart} onChange={e=>set("puWindowStart", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">PU Window End</label>
            <input type="datetime-local" className="w-full border rounded p-2"
              value={form.puWindowEnd} onChange={e=>set("puWindowEnd", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">DEL Window Start</label>
            <input type="datetime-local" className="w-full border rounded p-2"
              value={form.delWindowStart} onChange={e=>set("delWindowStart", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">DEL Window End</label>
            <input type="datetime-local" className="w-full border rounded p-2"
              value={form.delWindowEnd} onChange={e=>set("delWindowEnd", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm">Notes</label>
          <textarea className="w-full border rounded p-2" rows={3}
            value={form.notes} onChange={e=>set("notes", e.target.value)} />
        </div>

        <button disabled={loading} className="px-4 py-2 rounded bg-black text-white">
          {loading ? "Saving..." : "Create Order"}
        </button>
      </form>
    </main>
  );
}
