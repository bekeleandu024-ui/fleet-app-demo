"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type UnitInput = {
  id?: string;
  code: string;
  type?: string | null;
  homeBase?: string | null;
  active?: boolean;
};

type Props = {
  mode: "create" | "edit";
  unit?: UnitInput;
};

export default function UnitForm({ mode, unit }: Props) {
  const [code, setCode] = useState(unit?.code ?? "");
  const [unitType, setUnitType] = useState(unit?.type ?? "");
  const [homeBase, setHomeBase] = useState(unit?.homeBase ?? "");
  const [active, setActive] = useState(unit?.active ?? true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const payload = { code, type: unitType, homeBase, active };
      const url = mode === "create" ? "/api/units" : `/api/units/${unit?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        setError(details?.error ?? "Unable to save unit");
        return;
      }
      setMessage(mode === "create" ? "Unit created" : "Unit updated");
      if (mode === "create") {
        setCode("");
        setUnitType("");
        setHomeBase("");
        setActive(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="unit-code">
          Code
        </label>
        <input
          id="unit-code"
          value={code}
          onChange={event => setCode(event.target.value)}
          required
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
          placeholder="Truck or trailer code"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="unit-type">
          Type
        </label>
        <input
          id="unit-type"
          value={unitType ?? ""}
          onChange={event => setUnitType(event.target.value)}
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
          placeholder="Tractor, reefer, etc."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="unit-home">
          Home base
        </label>
        <input
          id="unit-home"
          value={homeBase ?? ""}
          onChange={event => setHomeBase(event.target.value)}
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
          placeholder="Assigned yard"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />
        Active
      </label>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isSubmitting ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </button>
        <Link href="/units" className="text-sm text-slate-600 hover:text-slate-900">
          Back to units
        </Link>
      </div>
    </form>
  );
}
