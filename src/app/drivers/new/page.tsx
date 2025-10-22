"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewDriver() {
  const r = useRouter();
  const [f, setF] = useState({ name: "", homeBase: "", active: true });
  const [err, setErr] = useState<string | null>(null);
  const input = "w-full border rounded p-2";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    if (res.ok) r.push("/drivers");
    else {
      const j = await res.json().catch(() => ({}));
      setErr(j?.issues?.fieldErrors?.name?.[0] ?? j?.error ?? "Failed");
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-3">New Driver</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        {err && <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}
        <div>
          <label className="block text-sm">Name *</label>
          <input className={input} value={f.name} onChange={e=>setF(p=>({...p, name: e.target.value}))} />
        </div>
        <div>
          <label className="block text-sm">Home Base</label>
          <input className={input} value={f.homeBase} onChange={e=>setF(p=>({...p, homeBase: e.target.value}))} />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.active} onChange={e=>setF(p=>({...p, active: e.target.checked}))} />
          Active
        </label>
        <button className="px-4 py-2 rounded bg-black text-white">Create</button>
      </form>
    </main>
  );
}
