"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OcrDropBox, { type OcrResult } from "@/components/ocr-dropbox";
import { parseOcrToOrder, type ParsedOrder } from "@/lib/ocr";

type OrderFormState = {
  customer: string;
  origin: string;
  destination: string;
  requiredTruck: string;
  puWindowStart: string;
  puWindowEnd: string;
  delWindowStart: string;
  delWindowEnd: string;
  notes: string;
};

type FormKey = keyof OrderFormState;

type PreviewEntry = {
  parsedKey: keyof ParsedOrder;
  formKey: FormKey;
  label: string;
  value: string;
  currentValue: string;
  willFill: boolean;
  selected: boolean;
};

const EMPTY_ORDER_FORM: OrderFormState = {
  customer: "",
  origin: "",
  destination: "",
  requiredTruck: "",
  puWindowStart: "",
  puWindowEnd: "",
  delWindowStart: "",
  delWindowEnd: "",
  notes: "",
};

const FIELD_CONFIG: { parsedKey: keyof ParsedOrder; formKey: FormKey; label: string }[] = [
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

export default function NewOrderPage() {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<OrderFormState>(() => ({ ...EMPTY_ORDER_FORM }));
  const [ocrText, setOcrText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedOrder | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [selectedFields, setSelectedFields] = useState<Partial<Record<FormKey, boolean>>>({});
  const [copyFeedback, setCopyFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const copyFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeout.current) {
        clearTimeout(copyFeedbackTimeout.current);
      }
    };
  }, []);

  const buildPreviewEntries = (parsed: ParsedOrder): PreviewEntry[] => {
    return FIELD_CONFIG
      .map(field => {
        const value = parsed[field.parsedKey];
        if (!value) return null;
        const currentValue = form[field.formKey];
        const manualSelection = selectedFields[field.formKey];
        const defaultSelected = manualSelection ?? (!currentValue || currentValue !== value);
        return {
          ...field,
          value,
          currentValue,
          willFill: currentValue !== value,
          selected: defaultSelected,
        };
      })
      .filter((entry): entry is PreviewEntry => entry !== null);
  };

  function handleOcrParsed(result: OcrResult) {
    if (result.error && !result.text) {
      setOcrError(result.error);
      setOcrText("");
      setParsedPreview(null);
      setSelectedFields({});
      setOcrConfidence(null);
      alert(result.error || "Could not read image");
      return;
    }

    const text = result.text ?? "";
    setOcrText(text);
    setOcrError(result.error ?? null);
    setOcrConfidence(typeof result.ocrConfidence === "number" ? result.ocrConfidence : null);
    const parsed = result.parsed ?? (text ? parseOcrToOrder(text) : null);
    setParsedPreview(parsed);

    if (parsed) {
      const nextSelection: Partial<Record<FormKey, boolean>> = {};
      for (const field of FIELD_CONFIG) {
        const value = parsed[field.parsedKey];
        if (!value) continue;
        const currentValue = form[field.formKey];
        nextSelection[field.formKey] = !currentValue || currentValue !== value;
      }
      setSelectedFields(nextSelection);
    } else {
      setSelectedFields({});
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

  function set<K extends FormKey>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function applyParsedOrder() {
    const parsed = parsedPreview ?? (ocrText.trim() ? parseOcrToOrder(ocrText) : null);
    if (!parsed) return;

    const entries = buildPreviewEntries(parsed);
    const toApply = entries.filter(entry => entry.selected && entry.willFill);
    if (toApply.length === 0) {
      alert("Select at least one field to apply to the form.");
      return;
    }

    setParsedPreview(parsed);
    setForm(prev => {
      const next = { ...prev };
      for (const entry of toApply) {
        next[entry.formKey] = entry.value;
      }
      return next;
    });

    setSelectedFields(prev => {
      const next = { ...prev };
      for (const entry of toApply) {
        next[entry.formKey] = false;
      }
      return next;
    });
  }

  function toggleField(formKey: FormKey) {
    setSelectedFields(prev => ({ ...prev, [formKey]: !(prev[formKey] ?? true) }));
  }

  function showCopyFeedback(message: string, tone: "success" | "error") {
    if (copyFeedbackTimeout.current) {
      clearTimeout(copyFeedbackTimeout.current);
    }
    setCopyFeedback({ message, tone });
    copyFeedbackTimeout.current = setTimeout(() => setCopyFeedback(null), 2200);
  }

  async function copyOcrText() {
    if (!ocrText) return;
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(ocrText);
      showCopyFeedback("Copied OCR text", "success");
    } catch (error) {
      console.error("Copy failed", error);
      showCopyFeedback("Unable to copy", "error");
    }
  }

  const hasOcrText = ocrText.trim().length > 0;
  const previewEntries = parsedPreview ? buildPreviewEntries(parsedPreview) : [];
  const readyCount = previewEntries.filter(entry => entry.selected && entry.willFill).length;
  const actionLabel = readyCount > 0 ? `Apply ${readyCount} field${readyCount === 1 ? "" : "s"}` : "Apply fields";

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
              disabled={!hasOcrText || readyCount === 0}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLabel}
            </button>
          }
        />
        {hasOcrText && (
          <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">Parsed from OCR</h2>
                {typeof ocrConfidence === "number" && (
                  <span className="text-xs text-gray-500">
                    Confidence ≈ {Math.round(ocrConfidence)}%
                  </span>
                )}
              </div>
              {previewEntries.length > 0 && (
                <span className="text-xs text-gray-500">
                  {readyCount > 0 ? `${readyCount} field${readyCount === 1 ? "" : "s"} selected` : "Review detected fields"}
                </span>
              )}
            </div>
            {ocrError && <p className="mt-2 text-xs text-red-600">{ocrError}</p>}
            {previewEntries.length > 0 ? (
              <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                {previewEntries.map(entry => (
                  <div
                    key={entry.parsedKey}
                    className={`rounded border p-2 ${
                      entry.selected && entry.willFill
                        ? "border-green-300 bg-green-50"
                        : entry.willFill
                        ? "border-amber-200 bg-amber-50"
                        : "border-gray-200 bg-white/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {entry.label}
                      </div>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600">
                        <input
                          type="checkbox"
                          className="h-3 w-3 rounded border-gray-400 text-green-600 focus:ring-green-500"
                          checked={entry.selected && entry.willFill}
                          disabled={!entry.willFill}
                          onChange={() => toggleField(entry.formKey)}
                        />
                        Apply
                      </label>
                    </div>
                    <div className="mt-1 break-words text-sm text-gray-900">
                      {entry.value}
                    </div>
                    {entry.currentValue && entry.currentValue !== entry.value && (
                      <div className="mt-1 text-xs text-gray-600">
                        Current value: <span className="font-medium text-gray-800">{entry.currentValue}</span>
                      </div>
                    )}
                    <div
                      className={`mt-1 text-xs ${
                        entry.willFill
                          ? entry.selected
                            ? "text-green-700"
                            : "text-amber-600"
                          : "text-gray-500"
                      }`}
                    >
                      {entry.willFill
                        ? entry.selected
                          ? "Will update this field"
                          : "Ignored for now"
                        : "Already matches the form"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No structured order details detected yet.</p>
            )}
            {ocrText && (
              <div className="mt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Raw OCR text
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={copyOcrText}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
                    >
                      Copy text
                    </button>
                    {copyFeedback && (
                      <span
                        className={
                          copyFeedback.tone === "success"
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {copyFeedback.message}
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  value={ocrText}
                  readOnly
                  rows={6}
                  className="mt-2 w-full resize-y rounded border border-gray-200 bg-white/80 p-2 text-xs font-mono text-gray-700"
                />
              </div>
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
