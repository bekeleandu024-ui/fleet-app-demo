"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export type DriverOption = { id: string; name: string };
export type UnitOption = { id: string; code: string };

type TripFormProps = {
  orderId: string;
  drivers: DriverOption[];
  units: UnitOption[];
  rateTypes: string[];
  rateZones: string[];
};

type FormState = {
  driverId: string;
  unitId: string;
  rateType: string;
  rateZone: string;
  miles: string;
  revenue: string;
  fixedCPM: string;
  wageCPM: string;
  addOnsCPM: string;
  rollingCPM: string;
  tripStart: string;
  tripEnd: string;
};

type RateFeedback = {
  tone: "info" | "success" | "error";
  message: string;
};

const inputClass = "w-full border rounded p-2";

export default function UiTripForm({
  orderId,
  drivers,
  units,
  rateTypes,
  rateZones,
}: TripFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    driverId: "",
    unitId: "",
    rateType: "",
    rateZone: "",
    miles: "",
    revenue: "",
    fixedCPM: "",
    wageCPM: "",
    addOnsCPM: "",
    rollingCPM: "",
    tripStart: "",
    tripEnd: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateFeedback, setRateFeedback] = useState<RateFeedback | null>(null);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  useEffect(() => {
    if (!form.rateType || !form.rateZone) {
      setRateFeedback(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function lookupRate() {
      try {
        setRateFeedback({ tone: "info", message: "Looking up rate..." });
        const params = new URLSearchParams({
          type: form.rateType,
          zone: form.rateZone,
        });
        const res = await fetch(`/api/rates?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const data = await res.json();
        if (cancelled) return;

        if (!data?.found) {
          setRateFeedback({
            tone: "error",
            message: "No rate found for the selected type and zone. Enter CPM values manually.",
          });
          return;
        }

        setRateFeedback({ tone: "success", message: "Rate loaded from lookup." });
        setForm((prev) => ({
          ...prev,
          fixedCPM:
            data.fixedCPM != null ? data.fixedCPM.toString() : prev.fixedCPM,
          wageCPM:
            data.wageCPM != null ? data.wageCPM.toString() : prev.wageCPM,
          addOnsCPM:
            data.addOnsCPM != null ? data.addOnsCPM.toString() : prev.addOnsCPM,
          rollingCPM:
            data.rollingCPM != null ? data.rollingCPM.toString() : prev.rollingCPM,
        }));
      } catch (err) {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setRateFeedback({
          tone: "error",
          message:
            err instanceof Error
              ? `Unable to load rate. Enter CPM values manually (${err.message}).`
              : "Unable to load rate. Enter CPM values manually.",
        });
      }
    }

    lookupRate();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [form.rateType, form.rateZone]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const driver = drivers.find((d) => d.id === form.driverId);
    if (!driver) {
      setError("Please select a driver.");
      return;
    }

    const unit = units.find((u) => u.id === form.unitId);
    if (!unit) {
      setError("Please select a unit.");
      return;
    }

    const miles = Number(form.miles);
    if (!Number.isFinite(miles) || miles <= 0) {
      setError("Miles must be a positive number.");
      return;
    }

    const revenue = form.revenue ? Number(form.revenue) : undefined;
    if (form.revenue && !Number.isFinite(revenue!)) {
      setError("Revenue must be a valid number.");
      return;
    }

    const fixedCPM = form.fixedCPM ? Number(form.fixedCPM) : undefined;
    if (form.fixedCPM && !Number.isFinite(fixedCPM!)) {
      setError("Fixed CPM must be a valid number.");
      return;
    }

    const wageCPM = form.wageCPM ? Number(form.wageCPM) : undefined;
    if (form.wageCPM && !Number.isFinite(wageCPM!)) {
      setError("Wage CPM must be a valid number.");
      return;
    }

    const addOnsCPM = form.addOnsCPM ? Number(form.addOnsCPM) : undefined;
    if (form.addOnsCPM && !Number.isFinite(addOnsCPM!)) {
      setError("Add-ons CPM must be a valid number.");
      return;
    }

    const rollingCPM = form.rollingCPM ? Number(form.rollingCPM) : undefined;
    if (form.rollingCPM && !Number.isFinite(rollingCPM!)) {
      setError("Rolling CPM must be a valid number.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          driver: driver.name,
          driverId: driver.id,
          unit: unit.code,
          unitId: unit.id,
          rateType: form.rateType || undefined,
          rateZone: form.rateZone || undefined,
          miles,
          revenue,
          fixedCPM,
          wageCPM,
          addOnsCPM,
          rollingCPM,
          tripStart: form.tripStart || undefined,
          tripEnd: form.tripEnd || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create trip.");
      }

      const payload = await response.json();
      if (payload?.tripId) {
        router.push(`/trips/${payload.tripId}`);
      } else {
        router.push("/trips");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create trip. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderFeedback = (feedback: RateFeedback | null) => {
    if (!feedback) return null;
    const toneClass =
      feedback.tone === "success"
        ? "text-green-600"
        : feedback.tone === "error"
        ? "text-red-600"
        : "text-gray-600";
    return <p className={`text-sm ${toneClass}`}>{feedback.message}</p>;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Driver *</label>
          <select
            className={inputClass}
            value={form.driverId}
            onChange={(event) => updateForm("driverId", event.target.value)}
            required
          >
            <option value="">Select a driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Unit *</label>
          <select
            className={inputClass}
            value={form.unitId}
            onChange={(event) => updateForm("unitId", event.target.value)}
            required
          >
            <option value="">Select a unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Rate Type</label>
          <select
            className={inputClass}
            value={form.rateType}
            onChange={(event) => updateForm("rateType", event.target.value)}
          >
            <option value="">Select a rate type</option>
            {rateTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Rate Zone</label>
          <select
            className={inputClass}
            value={form.rateZone}
            onChange={(event) => updateForm("rateZone", event.target.value)}
          >
            <option value="">Select a rate zone</option>
            {rateZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
      </div>
      {renderFeedback(rateFeedback)}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Miles *</label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.1"
            value={form.miles}
            onChange={(event) => updateForm("miles", event.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Revenue</label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.revenue}
            onChange={(event) => updateForm("revenue", event.target.value)}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">CPM Breakdown</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Fixed CPM</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.0001"
              value={form.fixedCPM}
              onChange={(event) => updateForm("fixedCPM", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Wage CPM</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.0001"
              value={form.wageCPM}
              onChange={(event) => updateForm("wageCPM", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Add-ons CPM</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.0001"
              value={form.addOnsCPM}
              onChange={(event) => updateForm("addOnsCPM", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Rolling CPM</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.0001"
              value={form.rollingCPM}
              onChange={(event) => updateForm("rollingCPM", event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Trip Start</label>
          <input
            className={inputClass}
            type="datetime-local"
            value={form.tripStart}
            onChange={(event) => updateForm("tripStart", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Trip End</label>
          <input
            className={inputClass}
            type="datetime-local"
            value={form.tripEnd}
            onChange={(event) => updateForm("tripEnd", event.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {submitting ? "Booking..." : "Create Trip"}
      </button>
    </form>
  );
}
