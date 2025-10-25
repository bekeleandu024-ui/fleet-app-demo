"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OcrDropzone from "./OcrDropzone";
import type { PartialOrderFields } from "@/lib/ocr/types";

const EMPTY_FORM = {
  customer: "",
  origin: "",
  destination: "",
  puWindowStart: "",
  puWindowEnd: "",
  delWindowStart: "",
  delWindowEnd: "",
  requiredTruck: "",
  notes: "",
};

type FormKey = keyof typeof EMPTY_FORM;

type FormState = typeof EMPTY_FORM;

function isoToInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key: FormKey, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = (values: PartialOrderFields) => {
    setForm(prev => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(values) as [FormKey, unknown][]) {
        if (key === "puWindowStart" || key === "puWindowEnd" || key === "delWindowStart" || key === "delWindowEnd") {
          next[key] = isoToInputValue((value as string | null) ?? null);
          continue;
        }
        if (value === null || value === undefined) {
          next[key] = "";
        } else {
          next[key] = String(value);
        }
      }
      return next;
    });
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        router.push("/orders");
      } else {
        alert("Please fill customer, origin, and destination.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New Order</h1>
        <p className="mt-1 text-sm text-slate-600">
          Import details from an order screenshot or fill in manually.
        </p>
      </div>

      <OcrDropzone onApply={handleApply} />

      <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Customer *</span>
            <input
              required
              value={form.customer}
              onChange={event => updateField("customer", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Origin *</span>
            <input
              required
              value={form.origin}
              onChange={event => updateField("origin", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Destination *</span>
            <input
              required
              value={form.destination}
              onChange={event => updateField("destination", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Required Truck</span>
            <input
              value={form.requiredTruck}
              onChange={event => updateField("requiredTruck", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-sm font-medium text-slate-700">PU Window Start</span>
            <input
              type="datetime-local"
              value={form.puWindowStart}
              onChange={event => updateField("puWindowStart", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">PU Window End</span>
            <input
              type="datetime-local"
              value={form.puWindowEnd}
              onChange={event => updateField("puWindowEnd", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">DEL Window Start</span>
            <input
              type="datetime-local"
              value={form.delWindowStart}
              onChange={event => updateField("delWindowStart", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">DEL Window End</span>
            <input
              type="datetime-local"
              value={form.delWindowEnd}
              onChange={event => updateField("delWindowEnd", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>

        <label>
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={event => updateField("notes", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Saving..." : "Create Order"}
        </button>
      </form>
    </main>
  );
}
