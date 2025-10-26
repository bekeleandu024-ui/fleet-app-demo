"use client";

import { useActionState } from "react";

import { createOrderAction } from "../actions";

type FormState = {
  error: string | null;
};

const initialState: FormState = {
  error: null
};

export default function NewOrderPage() {
  const [state, formAction, isPending] = useActionState(async (_prev: FormState, formData: FormData) => {
    const result = await createOrderAction(formData);
    if (result?.error) {
      return { error: result.error };
    }
    return { error: null };
  }, initialState);

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Create order</h1>
        <p className="text-sm text-zinc-400">Capture the essential details to book a load.</p>
      </div>
      <form action={formAction} className="space-y-6 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-6">
        <div className="grid grid-cols-1 gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-200">Customer *</span>
            <input
              name="customer"
              required
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              placeholder="Acme Foods"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-200">Origin *</span>
            <input
              name="origin"
              required
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              placeholder="Guelph, ON"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-200">Destination *</span>
            <input
              name="destination"
              required
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              placeholder="Montreal, QC"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-200">Pickup window start</span>
            <input
              type="datetime-local"
              name="puWindowStart"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-200">Pickup window end</span>
            <input
              type="datetime-local"
              name="puWindowEnd"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-200">Delivery window start</span>
            <input
              type="datetime-local"
              name="delWindowStart"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-200">Delivery window end</span>
            <input
              type="datetime-local"
              name="delWindowEnd"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-zinc-200">Required truck</span>
          <input
            name="requiredTruck"
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            placeholder="Reefer"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-zinc-200">Notes</span>
          <textarea
            name="notes"
            rows={4}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            placeholder="Additional handling instructions"
          />
        </label>
        {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save order"}
          </button>
        </div>
      </form>
    </section>
  );
}
