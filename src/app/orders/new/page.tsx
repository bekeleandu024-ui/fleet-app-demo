"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OcrDropBox, { type OcrResult } from "@/components/ocr-dropbox";
import { parseOcrToOrder, type ParsedOrder } from "@/lib/ocr";

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
  const [ocrText, setOcrText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedOrder | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const fieldConfig: { parsedKey: keyof ParsedOrder; formKey: keyof typeof form; label: string }[] = [
    { parsedKey: "customer", formKey: "customer", label: "Customer" },
    { parsedKey: "origin", formKey: "origin", label: "Origin" },
    { parsedKey: "destination", formKey: "destination", label: "Destination" },
    { parsedKey: "requiredTruck", formKey: "requiredTruck", label: "Required Truck" },
    { parsedKey: "puStart", formKey: "puWindowStart", label: "PU Window Start" },
    { parsedKey: "puEnd", formKey: "puWindowEnd", label: "PU Window End" },
    { parsedKey: "delStart", formKey: "delWindowStart", label: "DEL Window Start" },
    { parsedKey: "delEnd", formKey: "delWindowEnd", label: "DEL Window End" },
    { parsedKey: "notes", formKey: "notes", label: "Notes" },
  ];

  function handleOcrParsed(result: OcrResult) {
    if (result.error && !result.text) {
      setOcrError(result.error);
      setOcrText("");
      setParsedPreview(null);
      alert(result.error || "Could not read image");
      return;
    }

    const text = result.text ?? "";
    setOcrText(text);
    setOcrError(result.error ?? null);
    setParsedPreview(text ? parseOcrToOrder(text) : null);

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

  function applyParsedOrder() {
    if (!ocrText.trim()) return;
    const parsed = parseOcrToOrder(ocrText);
    setParsedPreview(parsed);

    setForm(prev => {
      let changed = false;
      const next = { ...prev };
      for (const field of fieldConfig) {
        const value = parsed[field.parsedKey];
        if (!value) continue;
        if (!prev[field.formKey]) {
          next[field.formKey] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  const hasOcrText = ocrText.trim().length > 0;
  const previewEntries = parsedPreview
    ? fieldConfig
        .map(field => {
          const value = parsedPreview[field.parsedKey];
          if (!value) return null;
          return {
            ...field,
            value,
            willFill: !form[field.formKey],
          };
        })
        .filter((entry): entry is { parsedKey: keyof ParsedOrder; formKey: keyof typeof form; label: string; value: string; willFill: boolean } =>
          entry !== null
        )
    : [];
  const readyCount = previewEntries.filter(entry => entry.willFill).length;

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">New Order</h1>
      <div className="mb-4">
        <OcrDropBox
          onParsed={handleOcrParsed}
          actions={
            <button
              type="button"
              onClick={applyParsedOrder}
              disabled={!hasOcrText}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to Order Form
            </button>
          }
        />
        {hasOcrText && (
          <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Parsed from OCR</h2>
              {previewEntries.length > 0 && (
                <span className="text-xs text-gray-500">{readyCount} field(s) ready to fill</span>
              )}
            </div>
            {ocrError && <p className="mt-2 text-xs text-red-600">{ocrError}</p>}
            {previewEntries.length > 0 ? (
              <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                {previewEntries.map(entry => (
                  <div key={entry.parsedKey} className="rounded border border-gray-200 bg-white/70 p-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{entry.label}</div>
                    <div className="mt-1 break-words text-sm text-gray-900">{entry.value}</div>
                    <div className={`mt-1 text-xs ${entry.willFill ? "text-green-600" : "text-gray-500"}`}>
                      {entry.willFill ? "Will fill empty field" : "Field already filled"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No structured order details detected yet.</p>
            )}
          </div>
        )}
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
