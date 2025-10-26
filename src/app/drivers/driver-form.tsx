"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type DriverInput = {
  id?: string;
  name: string;
  homeBase?: string | null;
  active?: boolean;
};

type Props = {
  mode: "create" | "edit";
  driver?: DriverInput;
};

export default function DriverForm({ mode, driver }: Props) {
  const [name, setName] = useState(driver?.name ?? "");
  const [homeBase, setHomeBase] = useState(driver?.homeBase ?? "");
  const [active, setActive] = useState(driver?.active ?? true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const payload = { name, homeBase, active };
      const url = mode === "create" ? "/api/drivers" : `/api/drivers/${driver?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        setError(details?.error ?? "Unable to save driver");
        return;
      }

      setMessage(mode === "create" ? "Driver created" : "Driver updated");
      if (mode === "create") {
        setName("");
        setHomeBase("");
        setActive(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="driver-name">
          Name
        </label>
        <input
          id="driver-name"
          value={name}
          onChange={event => setName(event.target.value)}
          required
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
          placeholder="Driver name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="driver-home">
          Home base
        </label>
        <input
          id="driver-home"
          value={homeBase ?? ""}
          onChange={event => setHomeBase(event.target.value)}
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
          placeholder="City or depot"
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
        <Link href="/drivers" className="text-sm text-slate-600 hover:text-slate-900">
          Back to drivers
        </Link>
      </div>
    </form>
  );
}
