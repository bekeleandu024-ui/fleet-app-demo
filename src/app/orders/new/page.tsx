"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OcrDropBox, { type OcrResult } from "@/components/ocr-dropbox";
import type { ParsedOrder } from "@/lib/parse-order";

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

  function applyParsed(result: OcrResult) {
    if (result.error && !result.parsed && !result.text) {
      alert(result.error || "Could not read image");
      return;
    }

    const parsed = (result.parsed ?? {}) as ParsedOrder;
    setForm(prev => {
      const noteParts = prev.notes ? [prev.notes] : [];
      if (parsed.notes) noteParts.push(parsed.notes);

      const next = {
        ...prev,
        customer: parsed.customer ?? prev.customer,
        origin: parsed.origin ?? prev.origin,
        destination: parsed.destination ?? prev.destination,
        requiredTruck: parsed.requiredTruck ?? prev.requiredTruck,
        puWindowStart: mergeDate(prev.puWindowStart, parsed.puWindowStart, "Pickup window start", noteParts),
        puWindowEnd: mergeDate(prev.puWindowEnd, parsed.puWindowEnd, "Pickup window end", noteParts),
        delWindowStart: mergeDate(prev.delWindowStart, parsed.delWindowStart, "Delivery window start", noteParts),
        delWindowEnd: mergeDate(prev.delWindowEnd, parsed.delWindowEnd, "Delivery window end", noteParts),
        notes: noteParts.filter(Boolean).join(" | "),
      };
      return next;
    });

    if (typeof result.ocrConfidence === "number") {
      // eslint-disable-next-line no-console
      console.log("OCR confidence:", result.ocrConfidence);
    }
  }

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

  function mergeDate(prev: string, raw: string | undefined, label: string, notes: string[]) {
    if (!raw) return prev;
    const normalized = toDateTimeLocal(raw);
    if (normalized) return normalized;
    notes.push(`${label}: ${raw}`);
    return prev;
  }

  function toDateTimeLocal(raw?: string) {
    if (!raw) return undefined;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    }
    return undefined;
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">New Order</h1>
      <div className="mb-4">
        <OcrDropBox onParsed={applyParsed} />
      </div>
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
