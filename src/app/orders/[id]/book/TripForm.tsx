"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TripForm({ orderId }: { orderId: string }) {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    driver: "",
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
  const [rateStatus, setRateStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [rateInfo, setRateInfo] = useState<{
    found: boolean;
    type: string | null;
    zone: string | null;
    rateId?: string | null;
  } | null>(null);
  const [rateMessage, setRateMessage] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }

  useEffect(() => {
    const driver = f.driver.trim();
    const unit = f.unit.trim();

    if (!driver || !unit) {
      setRateStatus("idle");
      setRateInfo(null);
      setRateMessage(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setRateStatus("loading");
        setRateMessage(null);

        const res = await fetch("/api/rates/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            driver,
            unit,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Lookup failed with status ${res.status}`);
        }

        const data: {
          found?: boolean;
          type?: string | null;
          zone?: string | null;
          rateId?: string | null;
          fixedCPM?: number;
          wageCPM?: number;
          addOnsCPM?: number;
          rollingCPM?: number;
        } = await res.json();

        setRateStatus(data?.found ? "success" : "idle");
        setRateInfo({
          found: Boolean(data?.found),
          type: data?.type ?? null,
          zone: data?.zone ?? null,
          rateId: data?.rateId ?? null,
        });

        if (data?.found) {
          setF((prev) => ({
            ...prev,
            fixedCPM:
              data.fixedCPM !== undefined && data.fixedCPM !== null
                ? String(data.fixedCPM)
                : "",
            wageCPM:
              data.wageCPM !== undefined && data.wageCPM !== null
                ? String(data.wageCPM)
                : "",
            addOnsCPM:
              data.addOnsCPM !== undefined && data.addOnsCPM !== null
                ? String(data.addOnsCPM)
                : "",
            rollingCPM:
              data.rollingCPM !== undefined && data.rollingCPM !== null
                ? String(data.rollingCPM)
                : "",
          }));
        } else {
          setRateMessage("No matching rate found for this trip.");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setRateStatus("error");
        setRateInfo(null);
        setRateMessage("Unable to lookup rate information.");
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [f.driver, f.unit, orderId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        driver: f.driver,
        unit: f.unit,
        miles: Number(f.miles),
        revenue: f.revenue ? Number(f.revenue) : undefined,
        fixedCPM: f.fixedCPM ? Number(f.fixedCPM) : undefined,
        wageCPM: f.wageCPM ? Number(f.wageCPM) : undefined,
        addOnsCPM: f.addOnsCPM ? Number(f.addOnsCPM) : undefined,
        rollingCPM: f.rollingCPM ? Number(f.rollingCPM) : undefined,
        tripStart: f.tripStart || undefined,
        tripEnd: f.tripEnd || undefined,
        type: rateInfo?.type ?? undefined,
        zone: rateInfo?.zone ?? undefined,
      }),
    });
    setLoading(false);

    if (res.ok) r.push("/orders");
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Failed to create trip");
    }
  }

  const input = "w-full border rounded p-2";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Required */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Driver *</label>
          <input
            className={input}
            value={f.driver}
            onChange={(e) => set("driver", e.target.value)}
            placeholder="e.g. Jane Doe"
            required
          />
        </div>
        <div>
          <label className="block text-sm">Unit *</label>
          <input
            className={input}
            value={f.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="e.g. Truck 214"
            required
          />
        </div>
      </div>

      {rateStatus === "loading" && (
        <div className="text-sm text-gray-500">Looking up rate...</div>
      )}
      {rateStatus === "error" && rateMessage && (
        <div className="text-sm text-red-600">{rateMessage}</div>
      )}
      {rateInfo && (
        <div className="border rounded p-3 bg-gray-50 text-sm space-y-1">
          <div className="font-medium text-gray-700">Rate match</div>
          <div>
            <span className="font-semibold">Type:</span>{" "}
            {rateInfo.type ?? "Unknown"}
          </div>
          <div>
            <span className="font-semibold">Zone:</span>{" "}
            {rateInfo.zone ?? "Unknown"}
          </div>
          {!rateInfo.found && rateMessage && (
            <div className="text-xs text-orange-600">{rateMessage}</div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Miles *</label>
          <input
            className={input}
            type="number"
            step="0.01"
            value={f.miles}
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
            value={f.revenue}
            onChange={(e) => set("revenue", e.target.value)}
            placeholder="e.g. 1800"
          />
        </div>
      </div>

      {/* Optional CPM breakdown */}
      <details className="border rounded p-3">
        <summary className="cursor-pointer">CPM components (optional)</summary>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label className="block text-sm">Fixed CPM</label>
            <input
              className={input}
              type="number"
              step="0.0001"
              value={f.fixedCPM}
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
              value={f.wageCPM}
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
              value={f.addOnsCPM}
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
              value={f.rollingCPM}
              onChange={(e) => set("rollingCPM", e.target.value)}
              placeholder="e.g. 0.10"
            />
          </div>
        </div>
      </details>

      {/* Optional dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Trip Start</label>
          <input
            className={input}
            type="datetime-local"
            value={f.tripStart}
            onChange={(e) => set("tripStart", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm">Trip End</label>
          <input
            className={input}
            type="datetime-local"
            value={f.tripEnd}
            onChange={(e) => set("tripEnd", e.target.value)}
          />
        </div>
      </div>

      <button disabled={loading} className="px-4 py-2 rounded bg-black text-white">
        {loading ? "Booking..." : "Create Trip"}
      </button>
    </form>
  );
}