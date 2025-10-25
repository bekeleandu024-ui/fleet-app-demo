"use client";

import * as React from "react";
import type { EditFormProps, TripDTO } from "./types";

type FormState = {
  driverId: string;
  unitId: string;
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
};

const numberToInput = (value: number | null): string =>
  value == null || Number.isNaN(value) ? "" : String(value);

const isoToInput = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
};

const applyPatchToFormState = (
  patch: Partial<TripDTO>,
  previous: FormState,
): FormState => {
  const next: FormState = { ...previous };

  if (patch.driverId !== undefined) {
    next.driverId = patch.driverId ?? "";
  }

  if (patch.unitId !== undefined) {
    next.unitId = patch.unitId ?? "";
  }

  if (patch.type !== undefined) {
    next.type = patch.type ?? "";
  }

  if (patch.zone !== undefined) {
    next.zone = patch.zone ?? "";
  }

  if (patch.miles !== undefined) {
    next.miles = numberToInput(patch.miles);
  }

  if (patch.revenue !== undefined) {
    next.revenue = numberToInput(patch.revenue);
  }

  if (patch.fixedCPM !== undefined) {
    next.fixedCPM = numberToInput(patch.fixedCPM);
  }

  if (patch.wageCPM !== undefined) {
    next.wageCPM = numberToInput(patch.wageCPM);
  }

  if (patch.addOnsCPM !== undefined) {
    next.addOnsCPM = numberToInput(patch.addOnsCPM);
  }

  if (patch.rollingCPM !== undefined) {
    next.rollingCPM = numberToInput(patch.rollingCPM);
  }

  if (patch.tripStart !== undefined) {
    next.tripStart = isoToInput(patch.tripStart);
  }

  if (patch.tripEnd !== undefined) {
    next.tripEnd = isoToInput(patch.tripEnd);
  }

  return next;
};

const labelClass = "text-sm font-medium text-foreground";
const inputClass =
  "mt-1 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary";

export default function EditForm({
  trip,
  drivers,
  units,
  availableTypes,
  availableZones,
  exposePatch,
}: EditFormProps) {
  const [form, setForm] = React.useState<FormState>({
    driverId: trip.driverId ?? "",
    unitId: trip.unitId ?? "",
    type: trip.type ?? "",
    zone: trip.zone ?? "",
    miles: numberToInput(trip.miles),
    revenue: numberToInput(trip.revenue),
    fixedCPM: numberToInput(trip.fixedCPM),
    wageCPM: numberToInput(trip.wageCPM),
    addOnsCPM: numberToInput(trip.addOnsCPM),
    rollingCPM: numberToInput(trip.rollingCPM),
    tripStart: isoToInput(trip.tripStart),
    tripEnd: isoToInput(trip.tripEnd),
  });
  const [autoFillMessage, setAutoFillMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm({
      driverId: trip.driverId ?? "",
      unitId: trip.unitId ?? "",
      type: trip.type ?? "",
      zone: trip.zone ?? "",
      miles: numberToInput(trip.miles),
      revenue: numberToInput(trip.revenue),
      fixedCPM: numberToInput(trip.fixedCPM),
      wageCPM: numberToInput(trip.wageCPM),
      addOnsCPM: numberToInput(trip.addOnsCPM),
      rollingCPM: numberToInput(trip.rollingCPM),
      tripStart: isoToInput(trip.tripStart),
      tripEnd: isoToInput(trip.tripEnd),
    });
  }, [trip]);

  const applyPatch = React.useCallback(
    (patch: Partial<TripDTO>) => {
      setForm((previous) => applyPatchToFormState(patch, previous));
    },
    [setForm],
  );

  React.useEffect(() => {
    if (exposePatch) {
      exposePatch(applyPatch);
    }
  }, [exposePatch, applyPatch]);

  const driverOptions = React.useMemo(() => {
    const options = [...drivers];
    if (trip.driverId && !options.some((driver) => driver.id === trip.driverId)) {
      options.unshift({
        id: trip.driverId,
        name: trip.driver || "(unknown)",
        homeBase: null,
        active: false,
      });
    }
    return options;
  }, [drivers, trip.driverId, trip.driver]);

  const unitOptions = React.useMemo(() => {
    const options = [...units];
    if (trip.unitId && !options.some((unit) => unit.id === trip.unitId)) {
      options.unshift({
        id: trip.unitId,
        code: trip.unit || "(unknown)",
        type: null,
        homeBase: null,
        active: false,
      });
    }
    return options;
  }, [units, trip.unitId, trip.unit]);

  const typeOptions = React.useMemo(() => {
    const set = new Set(availableTypes);
    if (trip.type) set.add(trip.type);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableTypes, trip.type]);

  const zoneOptions = React.useMemo(() => {
    const set = new Set(availableZones);
    if (trip.zone) set.add(trip.zone);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableZones, trip.zone]);

  const handleChange = (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((previous) => ({ ...previous, [field]: value }));
    };

  const handleAutoFill = () => {
    setAutoFillMessage("Auto-fill from rate service coming soon.");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAutoFillMessage("Changes saved locally. Hook up submit to persist.");
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Driver
          <select className={inputClass} value={form.driverId} onChange={handleChange("driverId")}>
            <option value="">Select driver</option>
            {driverOptions.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Unit
          <select className={inputClass} value={form.unitId} onChange={handleChange("unitId")}>
            <option value="">Select unit</option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Type
          <select className={inputClass} value={form.type} onChange={handleChange("type")}>
            <option value="">Select type</option>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Zone
          <select className={inputClass} value={form.zone} onChange={handleChange("zone")}>
            <option value="">Select zone</option>
            {zoneOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Miles
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.miles}
            onChange={handleChange("miles")}
          />
        </label>

        <label className={labelClass}>
          Revenue ($)
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.revenue}
            onChange={handleChange("revenue")}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Fixed CPM
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.fixedCPM}
            onChange={handleChange("fixedCPM")}
          />
        </label>

        <label className={labelClass}>
          Wage CPM
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.wageCPM}
            onChange={handleChange("wageCPM")}
          />
        </label>

        <label className={labelClass}>
          Add-ons CPM
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.addOnsCPM}
            onChange={handleChange("addOnsCPM")}
          />
        </label>

        <label className={labelClass}>
          Rolling CPM
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.rollingCPM}
            onChange={handleChange("rollingCPM")}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Trip start
          <input
            className={inputClass}
            type="datetime-local"
            value={form.tripStart}
            onChange={handleChange("tripStart")}
          />
        </label>

        <label className={labelClass}>
          Trip end
          <input
            className={inputClass}
            type="datetime-local"
            value={form.tripEnd}
            onChange={handleChange("tripEnd")}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/60"
          onClick={handleAutoFill}
        >
          Auto-fill CPM from rate
        </button>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow"
        >
          Save changes
        </button>
        {autoFillMessage && <span className="text-xs text-muted-foreground">{autoFillMessage}</span>}
      </div>
    </form>
  );
}
