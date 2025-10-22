"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { id: string; name?: string; code?: string };

type Props = {
  orderId: string;
  drivers: Opt[];
  units: Opt[];
  types: string[];
  zones: string[];
};

export default function TripForm({ orderId, drivers, units, types, zones }: Props) {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resolved, setResolved] = useState<{ type: string | null; zone: string | null } | null>(null);

  const [f, setF] = useState({
    driverId: "",
    unitId: "",
    miles: "",
    revenue: "",
    type: "",
    zone: "",
    fixedCPM: "",
    wageCPM: "",
    addOnsCPM: "",
    rollingCPM: "",
    tripStart: "",
    tripEnd: "",
  });

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF(p => ({ ...p, [k]: v }));
  }

  // Auto-fill CPMs when type/zone changes
  useEffect(() => {
    async function load() {
      if (!f.type && !f.zone) return;
      const q = new URLSearchParams({
        ...(f.type ? { type: f.type } : {}),
        ...(f.zone ? { zone: f.zone } : {}),
      });
      const res = await fetch(`/api/rates/lookup?${q.toString()}`);
      const j = await res.json();
      if (j.found) {
        setResolved(j.resolved ?? null);
        setF(p => ({
          ...p,
          fixedCPM: String(j.fixedCPM ?? ""),
          wageCPM: String(j.wageCPM ?? ""),
          addOnsCPM: String(j.addOnsCPM ?? ""),
          rollingCPM: String(j.rollingCPM ?? ""),
        }));
      }
    }
    load();
  }, [f.type, f.zone]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const driver = drivers.find(d => d.id === f.driverId)?.name ?? "";
    const unit = units.find(u => u.id === f.unitId)?.code ?? "";

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        driverId: f.driverId || undefined,
        unitId: f.unitId || undefined,
        driver,
        unit,
        miles: Number(f.miles),
        revenue: f.revenue ? Number(f.revenue) : undefined,
        type: f.type || undefined,
        zone: f.zone || undefined,
        fixedCPM: f.fixedCPM ? Number(f.fixedCPM) : undefined,
        wageCPM: f.wageCPM ? Number(f.wageCPM) : undefined,
        addOnsCPM: f.addOnsCPM ? Number(f.addOnsCPM) : undefined,
        rollingCPM: f.rollingCPM ? Number(f.rollingCPM) : undefined,
        tripStart: f.tripStart || undefined,
        tripEnd: f.tripEnd || undefined,
      }),
    });

    setLoading(false);
    if (res.ok) {
      const j = await res.json();
      r.push(`/trips/${j.tripId}`);
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(j?.issues?.fieldErrors?.miles?.[0] ?? j?.error ?? "Failed to create trip");
    }
  }

  const input = "w-full border rounded p-2";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {err && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {err}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Driver *</label>
          <select className={input} value={f.driverId} onChange={e => set("driverId", e.target.value)}>
            <option value="">Select driver</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Unit *</label>
          <select className={input} value={f.unitId} onChange={e => set("unitId", e.target.value)}>
            <option value="">Select unit</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>
                {u.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Miles *</label>
          <input
            className={input}
            type="number"
            step="0.01"
            value={f.miles}
            onChange={e => set("miles", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm">Revenue (optional)</label>
          <input
            className={input}
            type="number"
            step="0.01"
            value={f.revenue}
            onChange={e => set("revenue", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Type</label>
          <select className={input} value={f.type} onChange={e => set("type", e.target.value)}>
            <option value="">(none)</option>
            {types.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Zone</label>
          <select className={input} value={f.zone} onChange={e => set("zone", e.target.value)}>
            <option value="">(none)</option>
            {zones.map(z => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="border rounded p-3">
        <summary className="cursor-pointer">CPM components</summary>
        <div className="grid grid-cols-2 gap-4 mt-3">
          {(["fixedCPM", "wageCPM", "addOnsCPM", "rollingCPM"] as const).map(k => (
            <div key={k}>
              <label className="block text-sm">{k}</label>
              <input
                className={input}
                type="number"
                step="0.0001"
                value={(f as any)[k]}
                onChange={e => set(k as any, e.target.value)}
              />
            </div>
          ))}
        </div>
        {resolved && (
          <p className="text-xs text-gray-600 mt-2">
            Using rate: Type = {resolved.type ?? "(any)"} | Zone = {resolved.zone ?? "(any)"}
          </p>
        )}
      </details>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Trip Start</label>
          <input
            className={input}
            type="datetime-local"
            value={f.tripStart}
            onChange={e => set("tripStart", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm">Trip End</label>
          <input
            className={input}
            type="datetime-local"
            value={f.tripEnd}
            onChange={e => set("tripEnd", e.target.value)}
          />
        </div>
      </div>

      <button disabled={loading} className="px-4 py-2 rounded bg-black text-white">
        {loading ? "Booking..." : "Create Trip"}
      </button>
    </form>
  );
}
