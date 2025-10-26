"use client";

import { useMemo, useState, useTransition } from "react";

type TripForClient = {
  id: string;
  driver: string;
  unit: string;
  miles: number;
  revenue?: number | null;
  fixedCPM?: number | null;
  wageCPM?: number | null;
  addOnsCPM?: number | null;
  rollingCPM?: number | null;
  totalCPM?: number | null;
  totalCost?: number | null;
  profit?: number | null;
  marginPct?: number | null;
  type?: string | null;
  zone?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  driverId?: string | null;
  unitId?: string | null;
  rateId?: string | null;
  tripStart?: string | null;
  tripEnd?: string | null;
};

type Option = { id: string; name?: string; code?: string; label?: string };
type RateOption = Option & {
  fixedCPM: number;
  wageCPM: number;
  addOnsCPM: number;
  rollingCPM: number;
};

type Props = {
  trip: TripForClient;
  drivers: Option[];
  units: Option[];
  types: string[];
  zones: string[];
  rates?: RateOption[];
};

type FormState = {
  driverId: string;
  unitId: string;
  rateId: string;
  driver: string;
  unit: string;
  type: string;
  zone: string;
  status: string;
  miles: string;
  revenue: string;
  fixedCPM: string;
  wageCPM: string;
  addOnsCPM: string;
  rollingCPM: string;
  totalCPM: string;
  totalCost: string;
  profit: string;
  marginPct: string;
};

export default function EditForm({ trip, drivers, units, types, zones, rates }: Props) {
  const [form, setForm] = useState<FormState>(() => ({
    driverId: trip.driverId ?? "",
    unitId: trip.unitId ?? "",
    rateId: trip.rateId ?? "",
    driver: trip.driver ?? "",
    unit: trip.unit ?? "",
    type: trip.type ?? "",
    zone: trip.zone ?? "",
    status: trip.status,
    miles: trip.miles?.toString() ?? "",
    revenue: trip.revenue != null ? trip.revenue.toString() : "",
    fixedCPM: trip.fixedCPM != null ? trip.fixedCPM.toString() : "",
    wageCPM: trip.wageCPM != null ? trip.wageCPM.toString() : "",
    addOnsCPM: trip.addOnsCPM != null ? trip.addOnsCPM.toString() : "",
    rollingCPM: trip.rollingCPM != null ? trip.rollingCPM.toString() : "",
    totalCPM: trip.totalCPM != null ? trip.totalCPM.toString() : "",
    totalCost: trip.totalCost != null ? trip.totalCost.toString() : "",
    profit: trip.profit != null ? trip.profit.toString() : "",
    marginPct: trip.marginPct != null ? trip.marginPct.toString() : "",
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const rateMap = useMemo(() => {
    if (!rates) return new Map<string, RateOption>();
    return new Map(rates.map(rate => [rate.id, rate]));
  }, [rates]);

  function handleFieldChange(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleRateChange(value: string) {
    setForm(prev => {
      const next = { ...prev, rateId: value };
      if (value) {
        const rate = rateMap.get(value);
        if (rate) {
          next.fixedCPM = rate.fixedCPM.toString();
          next.wageCPM = rate.wageCPM.toString();
          next.addOnsCPM = rate.addOnsCPM.toString();
          next.rollingCPM = rate.rollingCPM.toString();
        }
      }
      return next;
    });
  }

  function parseDecimal(value: string) {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseNumber(value: string, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startSaving(async () => {
      const payload = {
        driverId: form.driverId || null,
        unitId: form.unitId || null,
        rateId: form.rateId || null,
        driver: form.driver,
        unit: form.unit,
        type: form.type || null,
        zone: form.zone || null,
        status: form.status,
        miles: parseNumber(form.miles, 0),
        revenue: parseDecimal(form.revenue),
        fixedCPM: parseDecimal(form.fixedCPM),
        wageCPM: parseDecimal(form.wageCPM),
        addOnsCPM: parseDecimal(form.addOnsCPM),
        rollingCPM: parseDecimal(form.rollingCPM),
        totalCPM: parseDecimal(form.totalCPM),
        totalCost: parseDecimal(form.totalCost),
        profit: parseDecimal(form.profit),
        marginPct: parseDecimal(form.marginPct),
      };

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        setError(details?.error ?? "Failed to save trip");
        return;
      }

      setMessage("Trip updated");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit trip</h1>
        <p className="text-sm text-slate-500">Last updated {new Date(trip.updatedAt).toLocaleString()}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Driver"
            options={drivers}
            value={form.driverId}
            onChange={value => handleFieldChange("driverId", value)}
            placeholder="Select driver"
          />
          <SelectField
            label="Unit"
            options={units}
            value={form.unitId}
            onChange={value => handleFieldChange("unitId", value)}
            placeholder="Select unit"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Driver name" value={form.driver} onChange={value => handleFieldChange("driver", value)} />
          <TextField label="Unit code" value={form.unit} onChange={value => handleFieldChange("unit", value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectSimple
            label="Type"
            value={form.type}
            options={types}
            onChange={value => handleFieldChange("type", value)}
          />
          <SelectSimple
            label="Zone"
            value={form.zone}
            options={zones}
            onChange={value => handleFieldChange("zone", value)}
          />
          <TextField label="Status" value={form.status} onChange={value => handleFieldChange("status", value)} />
        </div>
        {rates && rates.length > 0 && (
          <SelectField
            label="Rate"
            options={rates.map(rate => ({ id: rate.id, label: rate.label ?? rate.id }))}
            value={form.rateId}
            onChange={value => handleRateChange(value)}
            placeholder="Select rate"
          />
        )}
        <fieldset className="grid gap-4 md:grid-cols-2">
          <NumberField
            label="Miles"
            value={form.miles}
            onChange={value => handleFieldChange("miles", value)}
          />
          <NumberField
            label="Revenue"
            value={form.revenue}
            onChange={value => handleFieldChange("revenue", value)}
          />
        </fieldset>
        <fieldset className="grid gap-4 md:grid-cols-2">
          <NumberField
            label="Fixed CPM"
            value={form.fixedCPM}
            onChange={value => handleFieldChange("fixedCPM", value)}
          />
          <NumberField
            label="Wage CPM"
            value={form.wageCPM}
            onChange={value => handleFieldChange("wageCPM", value)}
          />
          <NumberField
            label="Add-ons CPM"
            value={form.addOnsCPM}
            onChange={value => handleFieldChange("addOnsCPM", value)}
          />
          <NumberField
            label="Rolling CPM"
            value={form.rollingCPM}
            onChange={value => handleFieldChange("rollingCPM", value)}
          />
        </fieldset>
        <fieldset className="grid gap-4 md:grid-cols-2">
          <NumberField
            label="Total CPM"
            value={form.totalCPM}
            onChange={value => handleFieldChange("totalCPM", value)}
          />
          <NumberField
            label="Total cost"
            value={form.totalCost}
            onChange={value => handleFieldChange("totalCost", value)}
          />
          <NumberField
            label="Profit"
            value={form.profit}
            onChange={value => handleFieldChange("profit", value)}
          />
          <NumberField
            label="Margin %"
            value={form.marginPct}
            onChange={value => handleFieldChange("marginPct", value)}
          />
        </fieldset>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextField({ label, value, onChange }: TextFieldProps) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
      />
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type="number"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
        step="0.01"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function SelectField({ label, options, value, onChange, placeholder }: SelectFieldProps) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">{placeholder ?? "Unassigned"}</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name || option.code || option.label || option.id}
          </option>
        ))}
      </select>
    </label>
  );
}

type SelectSimpleProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function SelectSimple({ label, value, options, onChange }: SelectSimpleProps) {
  const sorted = useMemo(() => Array.from(new Set(options)).sort(), [options]);
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">—</option>
        {sorted.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
