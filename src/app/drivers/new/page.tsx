"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    homeBase: "",
    active: true,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Name is required.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        homeBase: form.homeBase.trim() ? form.homeBase.trim() : undefined,
        active: form.active,
      }),
    });
    setLoading(false);

    if (res.ok) {
      router.push("/drivers");
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Failed to create driver.");
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">New Driver</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm">Name *</label>
          <input
            className="w-full border rounded p-2"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm">Home Base</label>
          <input
            className="w-full border rounded p-2"
            value={form.homeBase}
            onChange={(e) => set("homeBase", e.target.value)}
            placeholder="e.g. Toronto"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          Active
        </label>

        <button
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? "Saving..." : "Create Driver"}
        </button>
      </form>
    </main>
  );
}
