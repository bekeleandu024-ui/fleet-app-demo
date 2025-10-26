"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import OcrDropBox, { type OcrResult } from "@/components/ocr-dropbox";
import type { ParsedOrder } from "@/lib/ocr";

const fieldConfigs: Record<keyof ParsedOrder, { label: string; target: keyof OrderFormState }> = {
  customer: { label: "Customer", target: "customer" },
  origin: { label: "Origin", target: "origin" },
  destination: { label: "Destination", target: "destination" },
  requiredTruck: { label: "Required equipment", target: "requiredTruck" },
  puStart: { label: "Pickup start", target: "puWindowStart" },
  puEnd: { label: "Pickup end", target: "puWindowEnd" },
  delStart: { label: "Delivery start", target: "delWindowStart" },
  delEnd: { label: "Delivery end", target: "delWindowEnd" },
  notes: { label: "Notes", target: "notes" },
};

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

type PreviewEntry = {
  key: keyof ParsedOrder;
  label: string;
  parsedValue?: string;
  currentValue: string;
  targetKey: keyof OrderFormState;
};

const initialForm: OrderFormState = {
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

export default function NewOrderPage() {
  const [form, setForm] = useState<OrderFormState>(initialForm);
  const [ocrText, setOcrText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedOrder | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<keyof ParsedOrder>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  const onParsed = useCallback((result: OcrResult) => {
    setError(null);
    if (result.text) setOcrText(result.text);
    if (result.parsed) {
      setParsedPreview(result.parsed);
      setSelectedFields(new Set());
    }
    if (!result.ok && result.error) {
      setError(result.error);
    }
  }, []);

  const previewEntries = useMemo<PreviewEntry[]>(() => {
    if (!parsedPreview) return [];
    return (Object.keys(fieldConfigs) as (keyof ParsedOrder)[]).map(key => {
      const config = fieldConfigs[key];
      return {
        key,
        label: config.label,
        parsedValue: parsedPreview[key] ?? undefined,
        currentValue: form[config.target] ?? "",
        targetKey: config.target,
      };
    });
  }, [parsedPreview, form]);

  const toggleField = useCallback((key: keyof ParsedOrder) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const applySelected = useCallback(() => {
    if (!parsedPreview || selectedFields.size === 0) return;
    setForm(prev => {
      const next = { ...prev };
      selectedFields.forEach(key => {
        const config = fieldConfigs[key];
        if (!config) return;
        const value = parsedPreview[key];
        if (value !== undefined) {
          next[config.target] = value;
        }
      });
      return next;
    });
    setSelectedFields(new Set());
  }, [parsedPreview, selectedFields]);

  const handleChange = useCallback(
    (key: keyof OrderFormState, value: string) => {
      setForm(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setMessage(null);
      setError(null);
      startSubmit(async () => {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ errors: {} }));
          const err =
            payload.errors?.customer?.[0] ||
            payload.errors?.origin?.[0] ||
            payload.errors?.destination?.[0] ||
            "Failed to create order";
          setError(err);
          return;
        }
        setMessage("Order created");
        setForm(initialForm);
      });
    },
    [form]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New order</h1>
        <p className="text-sm text-slate-600">Paste an order screenshot or fill the form manually.</p>
      </div>

      <OcrDropBox
        onParsed={onParsed}
        actions={
          parsedPreview ? (
            <button
              type="button"
              onClick={applySelected}
              disabled={selectedFields.size === 0}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              Apply fields
            </button>
          ) : null
        }
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ocrText && (
        <div>
          <h2 className="text-sm font-medium text-slate-700">OCR text</h2>
          <textarea
            value={ocrText}
            onChange={e => setOcrText(e.target.value)}
            className="mt-2 w-full rounded border border-slate-300 bg-white p-2 text-sm"
            rows={6}
          />
        </div>
      )}

      {parsedPreview && (
        <div className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Parsed fields</h2>
          <p className="mb-3 text-xs text-slate-500">
            Check the fields to copy into the form. Previously applied fields are cleared from this list.
          </p>
          <div className="space-y-2">
            {previewEntries.map(entry => {
              if (!entry.parsedValue) return null;
              const isSelected = selectedFields.has(entry.key);
              const isDifferent = entry.parsedValue !== entry.currentValue;
              return (
                <label
                  key={entry.key}
                  className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={isSelected}
                    onChange={() => toggleField(entry.key)}
                  />
                  <div className="space-y-1">
                    <div className="font-medium text-slate-800">{entry.label}</div>
                    <div className="text-xs text-slate-500">
                      Parsed: <span className="font-mono text-slate-700">{entry.parsedValue}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Current: <span className="font-mono text-slate-700">{entry.currentValue || "(empty)"}</span>
                      {!isDifferent && <span className="ml-2 text-emerald-600">(same)</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Customer"
            required
            value={form.customer}
            onChange={value => handleChange("customer", value)}
          />
          <FormField
            label="Required equipment"
            value={form.requiredTruck}
            onChange={value => handleChange("requiredTruck", value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Origin" required value={form.origin} onChange={value => handleChange("origin", value)} />
          <FormField
            label="Destination"
            required
            value={form.destination}
            onChange={value => handleChange("destination", value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Pickup start"
            type="datetime-local"
            value={form.puWindowStart}
            onChange={value => handleChange("puWindowStart", value)}
          />
          <FormField
            label="Pickup end"
            type="datetime-local"
            value={form.puWindowEnd}
            onChange={value => handleChange("puWindowEnd", value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Delivery start"
            type="datetime-local"
            value={form.delWindowStart}
            onChange={value => handleChange("delWindowStart", value)}
          />
          <FormField
            label="Delivery end"
            type="datetime-local"
            value={form.delWindowEnd}
            onChange={value => handleChange("delWindowEnd", value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => handleChange("notes", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"
            rows={4}
          />
        </div>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Saving…" : "Create order"}
        </button>
      </form>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
};

function FormField({ label, value, onChange, type = "text", required }: FormFieldProps) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        type={type}
        className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"
        required={required}
      />
    </label>
  );
}
