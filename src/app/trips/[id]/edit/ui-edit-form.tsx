"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EditForm({ trip, drivers, units, types, zones }:
 { trip: any, drivers: {id:string;name:string}[], units:{id:string;code:string}[], types:string[], zones:string[] }) {
  const r = useRouter();
  const [f, setF] = useState({
    driverId: trip.driverId ?? "",
    unitId: trip.unitId ?? "",
    driver: trip.driver ?? "",
    unit: trip.unit ?? "",
    type: trip.type ?? "",
    zone: trip.zone ?? "",
    miles: String(trip.miles ?? ""),
    revenue: trip.revenue == null ? "" : String(trip.revenue),
    fixedCPM: trip.fixedCPM == null ? "" : String(trip.fixedCPM),
    wageCPM: trip.wageCPM == null ? "" : String(trip.wageCPM),
    addOnsCPM: trip.addOnsCPM == null ? "" : String(trip.addOnsCPM),
    rollingCPM: trip.rollingCPM == null ? "" : String(trip.rollingCPM),
    tripStart: trip.tripStart ? new Date(trip.tripStart).toISOString().slice(0,16) : "",
    tripEnd:   trip.tripEnd ?   new Date(trip.tripEnd).toISOString().slice(0,16) : "",
  });

  function s<K extends keyof typeof f>(k: K, v: string) { setF(p => ({ ...p, [k]: v })); }
  const input = "w-full border rounded p-2";

  async function autofill() {
    const q = new URLSearchParams({ ...(f.type?{type:f.type}:{}), ...(f.zone?{zone:f.zone}:{}) });
    const res = await fetch(`/api/rates/lookup?${q.toString()}`);
    const j = await res.json();
    if (j.found) setF(p => ({ ...p,
      fixedCPM: String(j.fixedCPM ?? ""),
      wageCPM:  String(j.wageCPM ?? ""),
      addOnsCPM:String(j.addOnsCPM ?? ""),
      rollingCPM:String(j.rollingCPM ?? ""),
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      driverId: f.driverId || null,
      unitId: f.unitId || null,
      driver: drivers.find(d => d.id===f.driverId)?.name ?? f.driver,
      unit:   units.find(u => u.id===f.unitId)?.code ?? f.unit,
      type: f.type || null, zone: f.zone || null,
      miles: Number(f.miles),
      revenue: f.revenue === "" ? null : Number(f.revenue),
      fixedCPM: f.fixedCPM === "" ? null : Number(f.fixedCPM),
      wageCPM:  f.wageCPM  === "" ? null : Number(f.wageCPM),
      addOnsCPM:f.addOnsCPM=== "" ? null : Number(f.addOnsCPM),
      rollingCPM:f.rollingCPM=== "" ? null : Number(f.rollingCPM),
      tripStart: f.tripStart || null,
      tripEnd:   f.tripEnd   || null,
    };
    const res = await fetch(`/api/trips/${trip.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
    if (res.ok) r.push(`/trips/${trip.id}`); else alert(await res.text());
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Edit Trip</h1>

      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Driver</label>
            <select className={input} value={f.driverId} onChange={e=>s("driverId", e.target.value)}>
              <option value="">(keep)</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm">Unit</label>
            <select className={input} value={f.unitId} onChange={e=>s("unitId", e.target.value)}>
              <option value="">(keep)</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.code}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Type</label>
            <select className={input} value={f.type} onChange={e=>s("type", e.target.value)}>
              <option value="">(none)</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm">Zone</label>
            <select className={input} value={f.zone} onChange={e=>s("zone", e.target.value)}>
              <option value="">(none)</option>
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>

        <button type="button" onClick={autofill} className="px-3 py-2 rounded border">
          Auto-fill CPM from rate
        </button>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm">Miles *</label>
            <input className={input} type="number" step="0.01" value={f.miles} onChange={e=>s("miles", e.target.value)} />
          </div>
          <div><label className="block text-sm">Revenue</label>
            <input className={input} type="number" step="0.01" value={f.revenue} onChange={e=>s("revenue", e.target.value)} />
          </div>
        </div>

        {(["fixedCPM","wageCPM","addOnsCPM","rollingCPM"] as const).map(k=>(
          <div key={k}><label className="block text-sm">{k}</label>
            <input className={input} type="number" step="0.0001" value={(f as any)[k]} onChange={e=>s(k as any, e.target.value)} />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm">Trip Start</label>
            <input className={input} type="datetime-local" value={f.tripStart} onChange={e=>s("tripStart", e.target.value)} />
          </div>
          <div><label className="block text-sm">Trip End</label>
            <input className={input} type="datetime-local" value={f.tripEnd} onChange={e=>s("tripEnd", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-black text-white">Save</button>
          <button type="button"
            onClick={async()=>{ await fetch(`/api/trips/${trip.id}/recalc`, { method:"POST" }); location.reload(); }}
            className="px-4 py-2 rounded border">
            Recalculate totals
          </button>
        </div>
      </form>
    </main>
  );
}
