"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type DriverOption = {
  id: string;
  name: string;
};

export type UnitOption = {
  id: string;
  code: string;
};

type TripFormProps = {
  orderId: string;
  drivers: DriverOption[];
  units: UnitOption[];
  rateTypes: string[];
  rateZones: string[];
};

type Issue = {
  path?: (string | number)[];
  message: string;
};

type FormValues = {
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

const inputClass = "w-full rounded border px-3 py-2";

export default function TripForm({
  orderId,
  drivers,
  units,
  rateTypes,
  rateZones,
}: TripFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>({
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  const driverMap = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);
  const unitMap = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units]);

  const handleChange = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!values.rateType || !values.rateZone) return;

    const controller = new AbortController();
    setRateLoading(true);

    const url = new URL("/api/rates", window.location.origin);
    url.searchParams.set("type", values.rateType);
    url.searchParams.set("zone", values.rateZone);

    fetch(url.toString(), { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json?.found) {
          setValues((prev) => ({
            ...prev,
            fixedCPM: json.fixedCPM != null ? String(json.fixedCPM) : "",
            wageCPM: json.wageCPM != null ? String(json.wageCPM) : "",
            addOnsCPM: json.addOnsCPM != null ? String(json.addOnsCPM) : "",
            rollingCPM: json.rollingCPM != null ? String(json.rollingCPM) : "",
          }));
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to load rate", error);
        }
      })
      .finally(() => {
        setRateLoading(false);
      });

    return () => controller.abort();
  }, [values.rateType, values.rateZone]);

  const handleIssues = (issues?: Issue[]) => {
    if (!issues) {
      setFieldErrors({});
      setFormError(null);
      return;
    }

    const nextErrors: Record<string, string> = {};
    const general: string[] = [];

    for (const issue of issues) {
      const first = issue.path?.[0];
      if (typeof first === "string") {
        const key = first === "driver" || first === "driverId" ? "driverId" : first === "unit" || first === "unitId" ? "unitId" : first;
        nextErrors[key] = issue.message;
      } else {
        general.push(issue.message);
      }
    }

    setFieldErrors(nextErrors);
    setFormError(general.length ? general[0] : null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFormError(null);
    setFieldErrors({});

    const driver = driverMap.get(values.driverId);
    const unit = unitMap.get(values.unitId);

    if (!driver || !unit) {
      setFieldErrors({
        ...(driver ? {} : { driverId: "Select a driver" }),
        ...(unit ? {} : { unitId: "Select a unit" }),
      });
      setFormError("Please select a driver and unit.");
      setLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      orderId,
      driverId: driver.id,
      driver: driver.name,
      unitId: unit.id,
      unit: unit.code,
      miles: values.miles ? Number(values.miles) : undefined,
      revenue: values.revenue !== "" ? Number(values.revenue) : undefined,
      fixedCPM: values.fixedCPM !== "" ? Number(values.fixedCPM) : undefined,
      wageCPM: values.wageCPM !== "" ? Number(values.wageCPM) : undefined,
      addOnsCPM: values.addOnsCPM !== "" ? Number(values.addOnsCPM) : undefined,
      rollingCPM: values.rollingCPM !== "" ? Number(values.rollingCPM) : undefined,
      tripStart: values.tripStart || undefined,
      tripEnd: values.tripEnd || undefined,
    };

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        handleIssues(json.issues);
        setFormError(json.error ?? json.message ?? "Failed to create trip");
        return;
      }

      if (json?.tripId) {
        router.push(`/trips/${json.tripId}`);
        router.refresh();
      } else {
        router.push("/trips");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to submit trip", error);
      setFormError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputProps = {
    className: inputClass,
    disabled: loading,
  } as const;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Driver *</label>
          <select
            className={inputClass}
            value={values.driverId}
            onChange={(event) => handleChange("driverId", event.target.value)}
            required
            disabled={loading || drivers.length === 0}
          >
            <option value="" disabled>
              Select driver
            </option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
          {fieldErrors.driverId && <p className="text-sm text-red-600">{fieldErrors.driverId}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Unit *</label>
          <select
            className={inputClass}
            value={values.unitId}
            onChange={(event) => handleChange("unitId", event.target.value)}
            required
            disabled={loading || units.length === 0}
          >
            <option value="" disabled>
              Select unit
            </option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code}
              </option>
            ))}
          </select>
          {fieldErrors.unitId && <p className="text-sm text-red-600">{fieldErrors.unitId}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Miles *</label>
          <input
            {...inputProps}
            type="number"
          step="0.01"
          value={values.miles}
          onChange={(event) => handleChange("miles", event.target.value)}
          placeholder="e.g. 512"
          required
          min="0.01"
        />
          {fieldErrors.miles && <p className="text-sm text-red-600">{fieldErrors.miles}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Revenue</label>
          <input
            {...inputProps}
            type="number"
            step="0.01"
            value={values.revenue}
            onChange={(event) => handleChange("revenue", event.target.value)}
            placeholder="e.g. 1800"
            min="0"
          />
          {fieldErrors.revenue && <p className="text-sm text-red-600">{fieldErrors.revenue}</p>}
        </div>
      </div>

      <details className="rounded border p-3">
        <summary className="cursor-pointer font-medium">CPM components</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Rate type</label>
            <select
              className={inputClass}
              value={values.rateType}
              onChange={(event) => handleChange("rateType", event.target.value)}
              disabled={loading}
            >
              <option value="">Select type</option>
              {rateTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Rate zone</label>
            <select
              className={inputClass}
              value={values.rateZone}
              onChange={(event) => handleChange("rateZone", event.target.value)}
              disabled={loading}
            >
              <option value="">Select zone</option>
              {rateZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Fixed CPM</label>
            <input
              {...inputProps}
              type="number"
              step="0.0001"
              value={values.fixedCPM}
              onChange={(event) => handleChange("fixedCPM", event.target.value)}
              min="0"
            />
            {fieldErrors.fixedCPM && <p className="text-sm text-red-600">{fieldErrors.fixedCPM}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Wage CPM</label>
            <input
              {...inputProps}
              type="number"
              step="0.0001"
              value={values.wageCPM}
              onChange={(event) => handleChange("wageCPM", event.target.value)}
              min="0"
            />
            {fieldErrors.wageCPM && <p className="text-sm text-red-600">{fieldErrors.wageCPM}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Add-ons CPM</label>
            <input
              {...inputProps}
              type="number"
              step="0.0001"
              value={values.addOnsCPM}
              onChange={(event) => handleChange("addOnsCPM", event.target.value)}
              min="0"
            />
            {fieldErrors.addOnsCPM && <p className="text-sm text-red-600">{fieldErrors.addOnsCPM}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Rolling CPM</label>
            <input
              {...inputProps}
              type="number"
              step="0.0001"
              value={values.rollingCPM}
              onChange={(event) => handleChange("rollingCPM", event.target.value)}
              min="0"
            />
            {fieldErrors.rollingCPM && <p className="text-sm text-red-600">{fieldErrors.rollingCPM}</p>}
          </div>
          {rateLoading && (
            <p className="text-sm text-gray-500 sm:col-span-2">
              Loading rate defaults…
            </p>
          )}
        </div>
      </details>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Trip start</label>
          <input
            {...inputProps}
            type="datetime-local"
            value={values.tripStart}
            onChange={(event) => handleChange("tripStart", event.target.value)}
          />
          {fieldErrors.tripStart && <p className="text-sm text-red-600">{fieldErrors.tripStart}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Trip end</label>
          <input
            {...inputProps}
            type="datetime-local"
            value={values.tripEnd}
            onChange={(event) => handleChange("tripEnd", event.target.value)}
          />
          {fieldErrors.tripEnd && <p className="text-sm text-red-600">{fieldErrors.tripEnd}</p>}
        </div>
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {loading ? "Booking..." : "Create Trip"}
      </button>
    </form>
  );
}
