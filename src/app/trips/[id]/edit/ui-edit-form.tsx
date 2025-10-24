"use client";

import type { Prisma, Trip } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type DriverOption = { id: string; name: string };
type UnitOption = { id: string; code: string };

type TripFormState = {
  driverId: string;
  unitId: string;
  driver: string;
  unit: string;
  type: string;
  zone: string;
  miles: string;
  revenue: string;
  fixedCPM: string;
  wageCPM: string;
  addOnsCPM: string;
  rollingCPM: string;
  tripStart: string;
  tripEnd: string;
  rateId: string;
};

type CpmField = "fixedCPM" | "wageCPM" | "addOnsCPM" | "rollingCPM";

const cpmFields: CpmField[] = ["fixedCPM", "wageCPM", "addOnsCPM", "rollingCPM"];
const inputClassName = "w-full border rounded p-2";

const decimalToString = (value: Prisma.Decimal | null | undefined): string =>
  value == null ? "" : value.toString();

const dateToLocalInputValue = (value: Date | string | null | undefined): string => {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
};

type RateLookupResponse = {
  found?: boolean;
  type?: string | null;
  zone?: string | null;
  fixedCPM?: number | string | null;
  wageCPM?: number | string | null;
  addOnsCPM?: number | string | null;
  rollingCPM?: number | string | null;
  rateId?: string | null;
};

function isRateLookupResponse(value: unknown): value is RateLookupResponse {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  if ("found" in record && typeof record.found !== "boolean") {
    return false;
  }

  const stringKeys: Array<keyof RateLookupResponse> = ["type", "zone", "rateId"];
  for (const key of stringKeys) {
    const field = record[key];
    if (field != null && typeof field !== "string") {
      return false;
    }
  }

  const numericKeys: Array<keyof RateLookupResponse> = [
    "fixedCPM",
    "wageCPM",
    "addOnsCPM",
    "rollingCPM",
  ];

  for (const key of numericKeys) {
    const field = record[key];
    if (field != null && typeof field !== "number" && typeof field !== "string") {
      return false;
    }
  }

  return true;
}

const formatLookupValue = (value: number | string | null | undefined): string =>
  value == null ? "" : String(value);

const displayOrAny = (value: string | null | undefined): string =>
  value && value.trim().length > 0 ? value : "(any)";

const parseNullableNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

interface EditFormProps {
  trip: Trip;
  drivers: DriverOption[];
  units: UnitOption[];
  types: string[];
  zones: string[];
}

export default function EditForm({ trip, drivers, units, types, zones }: EditFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<TripFormState>({
    driverId: trip.driverId ?? "",
    unitId: trip.unitId ?? "",
    driver: trip.driver ?? "",
    unit: trip.unit ?? "",
    type: trip.type ?? "",
    zone: trip.zone ?? "",
    miles: decimalToString(trip.miles),
    revenue: decimalToString(trip.revenue),
    fixedCPM: decimalToString(trip.fixedCPM),
    wageCPM: decimalToString(trip.wageCPM),
    addOnsCPM: decimalToString(trip.addOnsCPM),
    rollingCPM: decimalToString(trip.rollingCPM),
    tripStart: dateToLocalInputValue(trip.tripStart),
    tripEnd: dateToLocalInputValue(trip.tripEnd),
    rateId: trip.rateId ?? "",
  });
  const [autofilling, setAutofilling] = useState(false);
  const [autofillMessage, setAutofillMessage] = useState<string | null>(null);
  const [autofillError, setAutofillError] = useState<string | null>(null);

  const updateForm = <Key extends keyof TripFormState>(key: Key, value: string) => {
    setForm((previous) => {
      const next = { ...previous, [key]: value };

      if (key === "driverId" || key === "unitId" || key === "type" || key === "zone") {
        next.rateId = "";
      }

      return next;
    });
  };

  const resolveDriverName = () =>
    form.driverId ? drivers.find(({ id }) => id === form.driverId)?.name ?? "" : form.driver;

  const resolveUnitCode = () =>
    form.unitId ? units.find(({ id }) => id === form.unitId)?.code ?? "" : form.unit;

  const handleAutofill = async () => {
    setAutofilling(true);
    setAutofillMessage(null);
    setAutofillError(null);

    const payload: Record<string, string> = {};
    if (trip.orderId) {
      payload.orderId = trip.orderId;
    }

    const driverName = resolveDriverName().trim();
    if (driverName) {
      payload.driver = driverName;
    }

    const unitCode = resolveUnitCode().trim();
    if (unitCode) {
      payload.unit = unitCode;
    }

    if (form.type.trim()) {
      payload.type = form.type.trim();
    }

    if (form.zone.trim()) {
      payload.zone = form.zone.trim();
    }

    try {
      const response = await fetch("/api/rates/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setAutofillError("Failed to look up rate.");
        return;
      }

      const json: unknown = await response.json();

      if (!isRateLookupResponse(json)) {
        setAutofillError("Unexpected response when looking up rate.");
        return;
      }

      setForm((previous) => {
        const next = { ...previous };

        if (!previous.type && json.type) {
          next.type = json.type;
        }

        if (!previous.zone && json.zone) {
          next.zone = json.zone;
        }

        if (json.found) {
          next.fixedCPM = formatLookupValue(json.fixedCPM);
          next.wageCPM = formatLookupValue(json.wageCPM);
          next.addOnsCPM = formatLookupValue(json.addOnsCPM);
          next.rollingCPM = formatLookupValue(json.rollingCPM);
          next.rateId = json.rateId ?? "";
        } else {
          next.rateId = "";
        }

        return next;
      });

      if (json.found) {
        setAutofillMessage(
          `Using rate: Type = ${displayOrAny(json.type ?? null)} | Zone = ${displayOrAny(
            json.zone ?? null,
          )}`,
        );
      } else {
        setAutofillMessage(
          `No matching rate found (suggested Type = ${displayOrAny(json.type ?? null)}, Zone = ${displayOrAny(
            json.zone ?? null,
          )}).`,
        );
      }
    } catch (error) {
      console.error("Failed to look up rate", error);
      setAutofillError("Failed to look up rate.");
    } finally {
      setAutofilling(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const miles = parseNullableNumber(form.miles);
    if (miles === null) {
      alert("Miles is required and must be a number.");
      return;
    }

    const body = {
      driverId: form.driverId || null,
      unitId: form.unitId || null,
      driver: resolveDriverName() || form.driver,
      unit: resolveUnitCode() || form.unit,
      type: form.type || null,
      zone: form.zone || null,
      miles,
      revenue: parseNullableNumber(form.revenue),
      fixedCPM: parseNullableNumber(form.fixedCPM),
      wageCPM: parseNullableNumber(form.wageCPM),
      addOnsCPM: parseNullableNumber(form.addOnsCPM),
      rollingCPM: parseNullableNumber(form.rollingCPM),
      tripStart: form.tripStart || null,
      tripEnd: form.tripEnd || null,
      rateId: form.rateId || null,
    };

    try {
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        alert(await response.text());
        return;
      }

      router.push(`/trips/${trip.id}`);
    } catch (error) {
      console.error("Failed to save trip", error);
      alert("Failed to save trip.");
    }
  };

  const handleRecalculate = async () => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/recalc`, { method: "POST" });

      if (!response.ok) {
        alert("Failed to recalculate totals.");
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error("Failed to recalculate totals", error);
      alert("Failed to recalculate totals.");
    }
  };

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Edit Trip</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Driver</label>
            <select
              className={inputClassName}
              value={form.driverId}
              onChange={(event) => updateForm("driverId", event.target.value)}
            >
              <option value="">(keep)</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm">Unit</label>
            <select
              className={inputClassName}
              value={form.unitId}
              onChange={(event) => updateForm("unitId", event.target.value)}
            >
              <option value="">(keep)</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Type</label>
            <select
              className={inputClassName}
              value={form.type}
              onChange={(event) => updateForm("type", event.target.value)}
            >
              <option value="">(none)</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm">Zone</label>
            <select
              className={inputClassName}
              value={form.zone}
              onChange={(event) => updateForm("zone", event.target.value)}
            >
              <option value="">(none)</option>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleAutofill}
            className="px-3 py-2 rounded border"
            disabled={autofilling}
          >
            {autofilling ? "Looking up..." : "Auto-fill CPM from rate"}
          </button>
          {autofillMessage && <p className="text-xs text-gray-600">{autofillMessage}</p>}
          {autofillError && <p className="text-xs text-red-600">{autofillError}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Miles *</label>
            <input
              className={inputClassName}
              type="number"
              step="0.01"
              value={form.miles}
              onChange={(event) => updateForm("miles", event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Revenue</label>
            <input
              className={inputClassName}
              type="number"
              step="0.01"
              value={form.revenue}
              onChange={(event) => updateForm("revenue", event.target.value)}
            />
          </div>
        </div>

        {cpmFields.map((field) => (
          <div key={field}>
            <label className="block text-sm">{field}</label>
            <input
              className={inputClassName}
              type="number"
              step="0.0001"
              value={form[field]}
              onChange={(event) => updateForm(field, event.target.value)}
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Trip Start</label>
            <input
              className={inputClassName}
              type="datetime-local"
              value={form.tripStart}
              onChange={(event) => updateForm("tripStart", event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Trip End</label>
            <input
              className={inputClassName}
              type="datetime-local"
              value={form.tripEnd}
              onChange={(event) => updateForm("tripEnd", event.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 rounded bg-black text-white">
            Save
          </button>
          <button
            type="button"
            onClick={handleRecalculate}
            className="px-4 py-2 rounded border"
          >
            Recalculate totals
          </button>
        </div>
      </form>
    </main>
  );
}
