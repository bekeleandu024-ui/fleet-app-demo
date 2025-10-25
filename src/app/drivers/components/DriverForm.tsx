"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { createDriverAction, updateDriverAction } from "../actions";
import { DRIVER_FORM_ID } from "./DangerZone";

type PlainDriver = {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  homeBase?: string | null;
  licenseNumber: string;
  licenseJurisdiction: string;
  licenseClass: string;
  licenseEndorsements: string[];
  licenseExpiresAt: string;
  medicalExpiresAt?: string | null;
  drugTestDate?: string | null;
  mvrDate?: string | null;
  payType?: "Hourly" | "CPM" | null;
  rate?: number | null;
  cpm?: number | null;
  deductionsProfileId?: string | null;
  status: "Active" | "Inactive";
  inactiveReason?: string | null;
  inactiveAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DriverFormProps = {
  mode: "create" | "edit";
  initial: PlainDriver;
  terminals: string[];
  onSaved?: (id: string) => void;
};

type DriverFormValues = {
  name: string;
  phone: string;
  email: string;
  homeBaseSelect: string;
  homeBaseOther: string;
  licenseNumber: string;
  licenseJurisdiction: string;
  licenseClass: string;
  licenseExpiresAt: string;
  medicalExpiresAt: string;
  drugTestDate: string;
  mvrDate: string;
  payType: "Hourly" | "CPM" | "";
  rate: string;
  cpm: string;
  deductionsProfileId: string;
  status: "Active" | "Inactive";
  inactiveReason: string;
  inactiveAt: string;
  emailCopy?: string;
};

type DuplicateState = { exists: boolean; id?: string } | null;

type ToastState = { message: string; tone: "success" | "error" } | null;

const phonePattern = /^(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})$/;
const endorsementOptions = ["Tanker", "HazMat", "Doubles / Triples", "Passenger"];
const deductionsProfiles = [
  { label: "Select profile", value: "" },
  { label: "Standard company", value: "company-standard" },
  { label: "Lease operator", value: "lease-operator" },
  { label: "Owner operator", value: "owner-operator" },
];

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "DR";
}

function buildDefaultValues(initial: PlainDriver, terminals: string[]): DriverFormValues {
  const trimmedHomeBase = initial.homeBase ?? "";
  const inTerminals = trimmedHomeBase && terminals.includes(trimmedHomeBase);
  return {
    name: initial.name ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
    homeBaseSelect: inTerminals ? trimmedHomeBase : trimmedHomeBase ? "__other__" : "",
    homeBaseOther: inTerminals ? "" : trimmedHomeBase,
    licenseNumber: initial.licenseNumber ?? "",
    licenseJurisdiction: initial.licenseJurisdiction ?? "",
    licenseClass: initial.licenseClass ?? "",
    licenseExpiresAt: toDateInputValue(initial.licenseExpiresAt),
    medicalExpiresAt: toDateInputValue(initial.medicalExpiresAt ?? null),
    drugTestDate: toDateInputValue(initial.drugTestDate ?? null),
    mvrDate: toDateInputValue(initial.mvrDate ?? null),
    payType: initial.payType ?? "",
    rate: initial.rate != null ? String(initial.rate) : "",
    cpm: initial.cpm != null ? String(initial.cpm) : "",
    deductionsProfileId: initial.deductionsProfileId ?? "",
    status: initial.status,
    inactiveReason: initial.inactiveReason ?? "",
    inactiveAt: toDateInputValue(initial.inactiveAt ?? null),
  };
}

export default function DriverForm({ mode, initial, terminals, onSaved }: DriverFormProps) {
  const router = useRouter();
  const [baseline, setBaseline] = useState<PlainDriver>(initial);
  const [endorsements, setEndorsements] = useState<string[]>(initial.licenseEndorsements ?? []);
  const [duplicate, setDuplicate] = useState<DuplicateState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const defaults = useMemo(() => buildDefaultValues(baseline, terminals), [baseline, terminals]);

  useEffect(() => {
    setBaseline(initial);
    setEndorsements(initial.licenseEndorsements ?? []);
  }, [initial]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isValid, submitCount },
  } = useForm<DriverFormValues>({
    mode: "onChange",
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const status = watch("status");
  const payType = watch("payType");
  const licenseNumber = watch("licenseNumber");
  const licenseJurisdiction = watch("licenseJurisdiction");
  const homeBaseSelect = watch("homeBaseSelect");
  const homeBaseOther = watch("homeBaseOther");
  const name = watch("name");

  const payTypeRegister = register("payType");
  const statusRegister = register("status");
  const homeBaseSelectRegister = register("homeBaseSelect");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (!licenseNumber.trim() || !licenseJurisdiction.trim()) {
      setDuplicate(null);
      return;
    }

    const abort = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/drivers/duplicate-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abort.signal,
          body: JSON.stringify({ licenseNumber: licenseNumber.trim(), jurisdiction: licenseJurisdiction.trim() }),
        });
        if (!res.ok) {
          setDuplicate(null);
          return;
        }
        const data = (await res.json()) as { exists: boolean; matchId?: string };
        if (!data.exists || (data.matchId && data.matchId === initial.id)) {
          setDuplicate(null);
        } else {
          setDuplicate({ exists: true, id: data.matchId });
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setDuplicate(null);
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, [initial.id, licenseJurisdiction, licenseNumber]);

  const errorCount = useMemo(() => Object.keys(errors).length, [errors]);

  const onSubmit = useCallback(
    handleSubmit(async (_, event) => {
      if (!formRef.current) return;
      const formData = new FormData(formRef.current);
      formData.delete("licenseEndorsements");
      endorsements.forEach((endorsement) => formData.append("licenseEndorsements", endorsement));

      const homeBaseValue = homeBaseSelect === "__other__" ? homeBaseOther.trim() : homeBaseSelect;
      formData.set("homeBase", homeBaseValue);

      startTransition(async () => {
        const result =
          mode === "create"
            ? await createDriverAction(formData)
            : await updateDriverAction(initial.id ?? "", formData);

        if (!result.ok) {
          setToast({ message: result.error, tone: "error" });
          return;
        }

        const isoFromForm = (key: string): string | null => {
          const raw = formData.get(key)?.toString().trim();
          if (!raw) return null;
          return new Date(`${raw}T00:00:00Z`).toISOString();
        };

        const toNumberOrNull = (key: string): number | null => {
          const raw = formData.get(key)?.toString().trim();
          if (!raw) return null;
          const parsed = Number(raw);
          return Number.isFinite(parsed) ? parsed : null;
        };

        const savedDriver: PlainDriver = {
          ...baseline,
          id: mode === "create" && "id" in result ? result.id : baseline.id ?? initial.id,
          name: formData.get("name")?.toString() ?? baseline.name,
          phone: formData.get("phone")?.toString() || null,
          email: formData.get("email")?.toString() || null,
          homeBase: homeBaseValue || null,
          licenseNumber: formData.get("licenseNumber")?.toString() ?? baseline.licenseNumber,
          licenseJurisdiction: formData.get("licenseJurisdiction")?.toString() ?? baseline.licenseJurisdiction,
          licenseClass: formData.get("licenseClass")?.toString() ?? baseline.licenseClass,
          licenseEndorsements: [...endorsements],
          licenseExpiresAt: isoFromForm("licenseExpiresAt") ?? baseline.licenseExpiresAt,
          medicalExpiresAt: isoFromForm("medicalExpiresAt"),
          drugTestDate: isoFromForm("drugTestDate"),
          mvrDate: isoFromForm("mvrDate"),
          payType: payType ? (payType as "Hourly" | "CPM") : null,
          rate: toNumberOrNull("rate"),
          cpm: toNumberOrNull("cpm"),
          deductionsProfileId: formData.get("deductionsProfileId")?.toString() || null,
          status,
          inactiveReason:
            status === "Inactive" ? formData.get("inactiveReason")?.toString() || "" : null,
          inactiveAt: status === "Inactive" ? isoFromForm("inactiveAt") : null,
          createdAt: baseline.createdAt,
          updatedAt: baseline.updatedAt,
        };

        setBaseline(savedDriver);
        setEndorsements([...savedDriver.licenseEndorsements]);
        setDuplicate(null);
        setToast({ message: mode === "create" ? "Driver created" : "Changes saved", tone: "success" });
        router.refresh();
        if (mode === "create" && "id" in result) {
          onSaved?.(result.id);
        } else if (savedDriver.id) {
          onSaved?.(savedDriver.id);
        }
      });
    }),
    [baseline, endorsements, handleSubmit, homeBaseOther, homeBaseSelect, initial, mode, onSaved, payType, router, status, terminals]
  );

  const toggleEndorsement = (value: string) => {
    setEndorsements((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const baselineEndorsementsKey = useMemo(
    () => [...(baseline.licenseEndorsements ?? [])].sort().join("|"),
    [baseline.licenseEndorsements]
  );
  const currentEndorsementsKey = useMemo(() => [...endorsements].sort().join("|"), [endorsements]);
  const dirty = isDirty || currentEndorsementsKey !== baselineEndorsementsKey;
  const canSubmit = dirty && isValid && !isPending;
  const avatarInitials = initialsFromName(name);

  return (
    <form
      id={DRIVER_FORM_ID}
      ref={formRef}
      className="space-y-6"
      onSubmit={onSubmit}
      noValidate
    >
      <input type="hidden" {...payTypeRegister} />
      <input type="hidden" {...statusRegister} />
      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {avatarInitials}
          </div>
          <div>
            <h2 className="text-lg font-semibold">Driver details</h2>
            <p className="text-sm text-muted-foreground">As shown on license.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <input
              id="name"
              aria-describedby="name-help"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("name", { required: "Name is required", minLength: { value: 1, message: "Name is required" } })}
            />
            <p id="name-help" className="mt-1 text-xs text-muted-foreground">
              Enter the driver's full legal name.
            </p>
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Avatar initials</label>
            <input
              className="mt-1 h-10 w-full cursor-not-allowed rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground"
              value={avatarInitials}
              readOnly
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              Phone
            </label>
            <input
              id="phone"
              aria-describedby="phone-help"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("phone", {
                validate: (value) => {
                  if (!value) return true;
                  return phonePattern.test(value) || "Phone must be valid";
                },
              })}
            />
            <p id="phone-help" className="mt-1 text-xs text-muted-foreground">
              Format: (555) 555-1212
            </p>
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              aria-describedby="email-help"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("email", {
                validate: (value) => {
                  if (!value) return true;
                  return /.+@.+\..+/.test(value) || "Email must be valid";
                },
              })}
            />
            <p id="email-help" className="mt-1 text-xs text-muted-foreground">Where to send dispatch updates.</p>
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="homeBase" className="text-sm font-medium text-foreground">
            Home base
          </label>
          <select
            id="homeBase"
            aria-describedby="homebase-help"
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={homeBaseSelect}
            onChange={(event) => {
              homeBaseSelectRegister.onChange(event);
              const value = event.target.value;
              if (value !== "__other__") {
                setValue("homeBaseOther", "", { shouldDirty: true });
              }
            }}
            onBlur={homeBaseSelectRegister.onBlur}
            name={homeBaseSelectRegister.name}
            ref={homeBaseSelectRegister.ref}
          >
            <option value="">Select terminal</option>
            {terminals.map((terminal) => (
              <option key={terminal} value={terminal}>
                {terminal}
              </option>
            ))}
            <option value="__other__">Other…</option>
          </select>
          <p id="homebase-help" className="mt-1 text-xs text-muted-foreground">
            Dispatch location for this driver.
          </p>
          {homeBaseSelect === "__other__" && (
            <div className="mt-2">
              <label htmlFor="homeBaseOther" className="text-xs font-medium text-muted-foreground">
                Custom home base
              </label>
              <input
                id="homeBaseOther"
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                {...register("homeBaseOther")}
              />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm" id="license">
        <header className="mb-4">
          <h3 className="text-lg font-semibold">License</h3>
          <p className="text-sm text-muted-foreground">Jurisdiction = state/province on the license.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="licenseNumber" className="text-sm font-medium text-foreground">
              Number
            </label>
            <input
              id="licenseNumber"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("licenseNumber", { required: "License number required" })}
            />
            {errors.licenseNumber && <p className="mt-1 text-xs text-destructive">{errors.licenseNumber.message}</p>}
          </div>
          <div>
            <label htmlFor="licenseJurisdiction" className="text-sm font-medium text-foreground">
              Jurisdiction
            </label>
            <input
              id="licenseJurisdiction"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("licenseJurisdiction", { required: "Jurisdiction required" })}
            />
            {errors.licenseJurisdiction && (
              <p className="mt-1 text-xs text-destructive">{errors.licenseJurisdiction.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="licenseClass" className="text-sm font-medium text-foreground">
              Class
            </label>
            <input
              id="licenseClass"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("licenseClass", { required: "Class required" })}
            />
            {errors.licenseClass && <p className="mt-1 text-xs text-destructive">{errors.licenseClass.message}</p>}
          </div>
          <div>
            <label htmlFor="licenseExpiresAt" className="text-sm font-medium text-foreground">
              Expires
            </label>
            <input
              id="licenseExpiresAt"
              type="date"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("licenseExpiresAt", {
                required: status === "Active" ? "Active drivers need an expiry" : false,
              })}
            />
            {errors.licenseExpiresAt && (
              <p className="mt-1 text-xs text-destructive">{errors.licenseExpiresAt.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-foreground">Endorsements</p>
          <p className="text-xs text-muted-foreground">Select all that apply.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {endorsementOptions.map((option) => {
              const checked = endorsements.includes(option);
              return (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEndorsement(option)}
                    className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </div>

        {duplicate?.exists && duplicate.id && (
          <div className="mt-4 rounded-md border border-amber-500/50 bg-amber-100/40 p-3 text-sm text-amber-900">
            A driver already uses this license. <Link href={`/drivers/${duplicate.id}`} className="font-semibold underline">View record</Link>.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm" id="compliance">
        <header className="mb-4">
          <h3 className="text-lg font-semibold">Compliance</h3>
          <p className="text-sm text-muted-foreground">Medical: Expiry date from medical examiner’s certificate.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="medicalExpiresAt" className="text-sm font-medium text-foreground">
              Medical expires
            </label>
            <input
              id="medicalExpiresAt"
              type="date"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("medicalExpiresAt")}
            />
          </div>
          <div>
            <label htmlFor="drugTestDate" className="text-sm font-medium text-foreground">
              Last drug test
            </label>
            <input
              id="drugTestDate"
              type="date"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("drugTestDate")}
            />
          </div>
          <div>
            <label htmlFor="mvrDate" className="text-sm font-medium text-foreground">
              Last MVR
            </label>
            <input
              id="mvrDate"
              type="date"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("mvrDate")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm" id="payroll">
        <header className="mb-4">
          <h3 className="text-lg font-semibold">Payroll</h3>
        </header>
        <div className="flex flex-wrap gap-3">
          {["Hourly", "CPM"].map((option) => (
            <label key={option} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
              <input
                type="radio"
                value={option}
                checked={payType === option}
                onChange={(event) =>
                  setValue("payType", event.target.value as DriverFormValues["payType"], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              {option}
            </label>
          ))}
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() =>
              setValue("payType", "", {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            Clear
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="rate" className="text-sm font-medium text-foreground">
              Hourly rate
            </label>
            <input
              id="rate"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("rate", {
                validate: (value) => {
                  if (!value) return payType === "Hourly" ? "Required" : true;
                  const num = Number(value);
                  if (Number.isNaN(num) || num < 0) return "Must be ≥ 0";
                  return true;
                },
              })}
            />
            {errors.rate && <p className="mt-1 text-xs text-destructive">{errors.rate.message}</p>}
          </div>
          <div>
            <label htmlFor="cpm" className="text-sm font-medium text-foreground">
              CPM
            </label>
            <input
              id="cpm"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("cpm", {
                validate: (value) => {
                  if (!value) return payType === "CPM" ? "Required" : true;
                  const num = Number(value);
                  if (Number.isNaN(num) || num < 0) return "Must be ≥ 0";
                  return true;
                },
              })}
            />
            {errors.cpm && <p className="mt-1 text-xs text-destructive">{errors.cpm.message}</p>}
          </div>
          <div>
            <label htmlFor="deductionsProfileId" className="text-sm font-medium text-foreground">
              Deductions profile
            </label>
            <select
              id="deductionsProfileId"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              {...register("deductionsProfileId")}
            >
              {deductionsProfiles.map((profile) => (
                <option key={profile.value} value={profile.value}>
                  {profile.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm" id="status">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Status</h3>
            <p className="text-sm text-muted-foreground">Toggle between Active and Inactive.</p>
          </div>
          <div className="flex items-center gap-2">
            {["Active", "Inactive"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setValue("status", option as "Active" | "Inactive", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  status === option
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </header>

        {status === "Inactive" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inactiveReason" className="text-sm font-medium text-foreground">
                Reason
              </label>
              <textarea
                id="inactiveReason"
                aria-describedby="inactive-help"
                className="mt-1 min-h-[90px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                {...register("inactiveReason", {
                  validate: (value) => {
                    if (status !== "Inactive") return true;
                    return value.trim().length > 0 || "Reason required";
                  },
                })}
              />
              <p id="inactive-help" className="mt-1 text-xs text-muted-foreground">
                Tell your team why the driver is offline.
              </p>
              {errors.inactiveReason && <p className="mt-1 text-xs text-destructive">{errors.inactiveReason.message}</p>}
            </div>
            <div>
              <label htmlFor="inactiveAt" className="text-sm font-medium text-foreground">
                Inactive date
              </label>
              <input
                id="inactiveAt"
                type="date"
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                {...register("inactiveAt", {
                  validate: (value) => {
                    if (status !== "Inactive") return true;
                    return value ? true : "Date required";
                  },
                })}
              />
              {errors.inactiveAt && <p className="mt-1 text-xs text-destructive">{errors.inactiveAt.message}</p>}
            </div>
          </div>
        )}
      </section>

      {Array.from({ length: endorsements.length }).map((_, index) => (
        <input key={`${endorsements[index]}-${index}`} type="hidden" name="licenseEndorsements" value={endorsements[index]} />
      ))}

      {errorCount > 0 && submitCount > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Please fix {errorCount} field{errorCount === 1 ? "" : "s"}.
        </div>
      )}

      <footer className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-8 border-t border-border bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving…" : mode === "create" ? "Create driver" : "Save changes"}
          </button>
        </div>
      </footer>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`rounded-md px-4 py-2 text-sm font-medium shadow-lg ${
              toast.tone === "success"
                ? "bg-emerald-500 text-white"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </form>
  );
}
