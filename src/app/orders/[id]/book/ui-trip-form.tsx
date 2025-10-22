"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Driver = {
  id: string;
  name: string;
  homeBase: string | null;
  active: boolean;
};

type Props = {
  orderId: string;
};

export default function TripForm({ orderId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoaded, setDriversLoaded] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [form, setForm] = useState({
    driverId: "",
    unit: "",
    miles: "",
    revenue: "",
    fixedCPM: "",
    wageCPM: "",
    addOnsCPM: "",
    rollingCPM: "",
    tripStart: "",
    tripEnd: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDrivers() {
      try {
        const res = await fetch("/api/drivers");
        if (!res.ok) throw new Error("Failed to load drivers");
        const data: Driver[] = await res.json();
        if (!cancelled) {
          setDrivers(data);
        }
      } catch (error) {
        if (!cancelled) {
          setDriversError("Failed to load drivers. Try again later.");
        }
      } finally {
        if (!cancelled) {
          setDriversLoaded(true);
        }
      }
    }

    loadDrivers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (drivers.length === 0) return;
    setForm((prev) => {
      if (prev.driverId) return prev;
      const preferred = drivers.find((driver) => driver.active) ?? drivers[0];
      return { ...prev, driverId: preferred.id };
    });
  }, [drivers]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedDriver = drivers.find((driver) => driver.id === form.driverId) ?? null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedDriver) {
      alert("Please choose a driver.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        driverId: selectedDriver.id,
        driver: selectedDriver.name,
        unit: form.unit,
        miles: Number(form.miles),
        revenue: form.revenue ? Number(form.revenue) : undefined,
        fixedCPM: form.fixedCPM ? Number(form.fixedCPM) : undefined,
        wageCPM: form.wageCPM ? Number(form.wageCPM) : undefined,
        addOnsCPM: form.addOnsCPM ? Number(form.addOnsCPM) : undefined,
        rollingCPM: form.rollingCPM ? Number(form.rollingCPM) : undefined,
        tripStart: form.tripStart || undefined,
        tripEnd: form.tripEnd || undefined,
      }),
    });
    setLoading(false);

    if (res.ok) {
      router.push("/orders");
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Failed to create trip");
    }
  }

  const input = "w-full border rounded p-2";
  const disableSubmit =
    loading || !!driversError || (driversLoaded && drivers.length === 0);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Driver *</label>
          <select
            className={input}
            value={form.driverId}
            onChange={(e) => set("driverId", e.target.value)}
            disabled={drivers.length === 0}
            required
          >
            {drivers.length === 0 ? (
              <option value="">
                {driversError
                  ? "Unable to load drivers"
                  : driversLoaded
                  ? "No drivers available"
                  : "Loading drivers..."}
              </option>
            ) : (
              <>
                {!form.driverId && (
                  <option value="" disabled>
                    Select a driver
                  </option>
                )}
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                    {driver.active ? "" : " (Inactive)"}
                  </option>
                ))}
              </>
            )}
          </select>
          {driversLoaded && drivers.length === 0 && !driversError && (
            <p className="text-sm text-red-600 mt-2">
              Add a driver before booking a trip.
            </p>
          )}
          {driversError && (
            <p className="text-sm text-red-600 mt-2">{driversError}</p>
          )}
          {selectedDriver?.homeBase && (
            <p className="text-xs text-gray-500 mt-2">
              Home base: {selectedDriver.homeBase}
            </p>
          )}
          {selectedDriver && !selectedDriver.active && (
            <p className="text-xs text-amber-600 mt-2">
              This driver is marked inactive.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm">Unit *</label>
          <input
            className={input}
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="e.g. Truck 214"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Miles *</label>
          <input
            className={input}
            type="number"
            step="0.01"
            value={form.miles}
            onChange={(e) => set("miles", e.target.value)}
            placeholder="e.g. 512"
            required
          />
        </div>
        <div>
          <label className="block text-sm">Revenue (optional)</label>
          <input
            className={input}
            type="number"
            step="0.01"
            value={form.revenue}
            onChange={(e) => set("revenue", e.target.value)}
            placeholder="e.g. 1800"
          />
        </div>
      </div>

      <details className="border rounded p-3">
        <summary className="cursor-pointer">CPM components (optional)</summary>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label className="block text-sm">Fixed CPM</label>
            <input
              className={input}
              type="number"
              step="0.0001"
              value={form.fixedCPM}
              onChange={(e) => set("fixedCPM", e.target.value)}
              placeholder="e.g. 0.32"
            />
          </div>
          <div>
            <label className="block text-sm">Wage CPM</label>
            <input
              className={input}
              type="number"
              step="0.0001"
              value={form.wageCPM}
              onChange={(e) => set("wageCPM", e.target.value)}
              placeholder="e.g. 0.45"
            />
          </div>
          <div>
            <label className="block text-sm">AddOns CPM</label>
            <input
              className={input}
              type="number"
              step="0.0001"
              value={form.addOnsCPM}
              onChange={(e) => set("addOnsCPM", e.target.value)}
              placeholder="e.g. 0.07"
            />
          </div>
          <div>
            <label className="block text-sm">Rolling CPM</label>
            <input
              className={input}
              type="number"
              step="0.0001"
              value={form.rollingCPM}
              onChange={(e) => set("rollingCPM", e.target.value)}
              placeholder="e.g. 0.10"
            />
          </div>
        </div>
      </details>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Trip Start</label>
          <input
            className={input}
            type="datetime-local"
            value={form.tripStart}
            onChange={(e) => set("tripStart", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm">Trip End</label>
          <input
            className={input}
            type="datetime-local"
            value={form.tripEnd}
            onChange={(e) => set("tripEnd", e.target.value)}
          />
        </div>
      </div>

      <button
        disabled={disableSubmit}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
      >
        {loading ? "Booking..." : "Create Trip"}
      </button>
    </form>
  );
}
