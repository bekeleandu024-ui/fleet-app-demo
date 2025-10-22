"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DriverFormValues = {
  name: string;
  homeBase: string;
  active: boolean;
};

type DriverFormProps = {
  mode: "create" | "edit";
  driverId?: string;
  initialValues?: {
    name: string;
    homeBase?: string | null;
    active: boolean;
  };
};

type Issue = {
  path?: (string | number)[];
  message: string;
};

const inputClass = "w-full rounded border px-3 py-2";

export default function DriverForm({ mode, driverId, initialValues }: DriverFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<DriverFormValues>({
    name: initialValues?.name ?? "",
    homeBase: initialValues?.homeBase ?? "",
    active: initialValues?.active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submitLabel = mode === "create" ? "Create Driver" : "Save Changes";

  const handleChange = <K extends keyof DriverFormValues>(key: K, value: DriverFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const applyIssues = (issues?: Issue[]) => {
    if (!issues) {
      setFieldErrors({});
      setFormError(null);
      return;
    }

    const nextFieldErrors: Record<string, string> = {};
    const general: string[] = [];

    for (const issue of issues) {
      const first = issue.path?.[0];
      if (typeof first === "string") {
        nextFieldErrors[first] = issue.message;
      } else {
        general.push(issue.message);
      }
    }

    setFieldErrors(nextFieldErrors);
    setFormError(general.length ? general[0] : null);
  };

  const request = async (input: RequestInfo, init: RequestInit) => {
    setLoading(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await fetch(input, init);
      if (res.ok) {
        return { ok: true, json: await res.json().catch(() => ({})) } as const;
      }

      const json = await res.json().catch(() => ({}));
      applyIssues(json.issues);
      setFormError(json.error ?? json.message ?? "Request failed");
      return { ok: false } as const;
    } catch (error) {
      console.error(error);
      setFormError("Network error. Please try again.");
      return { ok: false } as const;
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: values.name,
      homeBase: values.homeBase.trim() ? values.homeBase.trim() : undefined,
      active: values.active,
    };

    const method = mode === "create" ? "POST" : "PATCH";
    const url = mode === "create" ? "/api/drivers" : `/api/drivers/${driverId}`;

    const result = await request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (result?.ok) {
      router.push("/drivers");
      router.refresh();
    }
  };

  const onDelete = async () => {
    if (!driverId) return;
    if (!confirm("Delete this driver?")) return;

    const result = await request(`/api/drivers/${driverId}`, { method: "DELETE" });
    if (result?.ok) {
      router.push("/drivers");
      router.refresh();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          className={inputClass}
          value={values.name}
          onChange={(event) => handleChange("name", event.target.value)}
          required
        />
        {fieldErrors.name && <p className="text-sm text-red-600">{fieldErrors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Home base</label>
        <input
          className={inputClass}
          value={values.homeBase}
          onChange={(event) => handleChange("homeBase", event.target.value)}
          placeholder="e.g. Toronto"
        />
        {fieldErrors.homeBase && (
          <p className="text-sm text-red-600">{fieldErrors.homeBase}</p>
        )}
      </div>

      <label className="inline-flex items-center space-x-2">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(event) => handleChange("active", event.target.checked)}
        />
        <span>Active</span>
      </label>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Saving..." : submitLabel}
        </button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="rounded border border-red-500 px-4 py-2 text-red-600 disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
