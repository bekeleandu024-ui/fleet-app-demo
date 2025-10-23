"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const [rateMatch, setRateMatch] = useState<{
    type: string | null;
    zone: string | null;
    found: boolean;
  } | null>(null);

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
    rateId: "",
  });

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "driverId" || k === "unitId" || k === "type" || k === "zone") {
        next.rateId = "";
      }
      return next;
    });
  }

  const selectedDriverName = useMemo(
    () => drivers.find((d) => d.id === f.driverId)?.name ?? "",
    [drivers, f.driverId]
  );
  const selectedUnitCode = useMemo(
    () => units.find((u) => u.id === f.unitId)?.code ?? "",
    [units, f.unitId]
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchRates() {
      try {
        const payload: Record<string, string> = { orderId };
        if (selectedDriverName.trim()) payload.driver = selectedDriverName.trim();
        if (selectedUnitCode.trim()) payload.unit = selectedUnitCode.trim();
        if (f.type.trim()) payload.type = f.type.trim();
        if (f.zone.trim()) payload.zone = f.zone.trim();

        const res = await fetch("/api/rates/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (!cancelled) {
            setRateMatch(null);
            setF((prev) => ({ ...prev, rateId: "" }));
          }
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const nextMatch = {
          type: typeof data.type === "string" ? data.type : null,
          zone: typeof data.zone === "string" ? data.zone : null,
          found: Boolean(data.found),
        } as const;
        setRateMatch(
          nextMatch.type || nextMatch.zone || nextMatch.found ? nextMatch : null
        );

        setF((prev) => {
          const next = { ...prev };

          if (!prev.type && typeof data.type === "string" && data.type) {
            next.type = data.type;
          }
          if (!prev.zone && typeof data.zone === "string" && data.zone) {
            next.zone = data.zone;
          }

          if (data.found) {
            next.fixedCPM = data.fixedCPM != null ? String(data.fixedCPM) : "";
            next.wageCPM = data.wageCPM != null ? String(data.wageCPM) : "";
            next.addOnsCPM = data.addOnsCPM != null ? String(data.addOnsCPM) : "";
            next.rollingCPM =
              data.rollingCPM != null ? String(data.rollingCPM) : "";
            next.rateId = typeof data.rateId === "string" ? data.rateId : "";
          } else {
            next.rateId = "";
          }

          return next;
        });
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
        console.error("Failed to look up rate", error);
        if (!cancelled) {
          setRateMatch(null);
          setF((prev) => ({ ...prev, rateId: "" }));
        }
      }
    }

    fetchRates();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [orderId, selectedDriverName, selectedUnitCode, f.type, f.zone]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);

    const driver = selectedDriverName;
    const unit = selectedUnitCode;

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        driverId: f.driverId || undefined,
        unitId: f.unitId || undefined,
        driver, unit,
        miles: Number(f.miles),
        revenue: f.revenue ? Number(f.revenue) : undefined,
        type: f.type || undefined, zone: f.zone || undefined,
        fixedCPM: f.fixedCPM ? Number(f.fixedCPM) : undefined,
        wageCPM: f.wageCPM ? Number(f.wageCPM) : undefined,
        addOnsCPM: f.addOnsCPM ? Number(f.addOnsCPM) : undefined,
        rollingCPM: f.rollingCPM ? Number(f.rollingCPM) : undefined,
        tripStart: f.tripStart || undefined,
        tripEnd: f.tripEnd || undefined,
        rateId: f.rateId || undefined,
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
      {err && <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Driver *</label>
          <select className={input} value={f.driverId} onChange={e=>set("driverId", e.target.value)}>
            <option value="">Select driver</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Unit *</label>
          <select className={input} value={f.unitId} onChange={e=>set("unitId", e.target.value)}>
            <option value="">Select unit</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.code}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Miles *</label>
          <input className={input} type="number" step="0.01" value={f.miles} onChange={e=>set("miles", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Revenue (optional)</label>
          <input className={input} type="number" step="0.01" value={f.revenue} onChange={e=>set("revenue", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Type</label>
          <select className={input} value={f.type} onChange={e=>set("type", e.target.value)}>
            <option value="">(none)</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Zone</label>
          <select className={input} value={f.zone} onChange={e=>set("zone", e.target.value)}>
            <option value="">(none)</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </div>

      <details className="border rounded p-3">
        <summary className="cursor-pointer">CPM components</summary>
        <div className="grid grid-cols-2 gap-4 mt-3">
          {(["fixedCPM","wageCPM","addOnsCPM","rollingCPM"] as const).map(k => (
            <div key={k}>
              <label className="block text-sm">{k}</label>
              <input className={input} type="number" step="0.0001" value={(f as any)[k]} onChange={e=>set(k as any, e.target.value)} />
            </div>
          ))}
        </div>
        {rateMatch && (
          <p
            className={`text-xs mt-2 ${
              rateMatch.found ? "text-gray-600" : "text-amber-600"
            }`}
          >
            {rateMatch.found
              ? `Using rate: Type = ${rateMatch.type ?? "(any)"} | Zone = ${
                  rateMatch.zone ?? "(any)"
                }`
              : `No matching rate found${
                  rateMatch.type || rateMatch.zone
                    ? ` (suggested Type = ${rateMatch.type ?? "(any)"}, Zone = ${
                        rateMatch.zone ?? "(any)"
                      })`
                    : ""
                }`}
          </p>
        )}
      </details>

      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm">Trip Start</label>
          <input className={input} type="datetime-local" value={f.tripStart} onChange={e=>set("tripStart", e.target.value)} /></div>
        <div><label className="block text-sm">Trip End</label>
          <input className={input} type="datetime-local" value={f.tripEnd} onChange={e=>set("tripEnd", e.target.value)} /></div>
      </div>

      <button disabled={loading} className="px-4 py-2 rounded bg-black text-white">
        {loading ? "Booking..." : "Create Trip"}
      </button>
    </form>
  );
}
