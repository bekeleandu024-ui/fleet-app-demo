"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  AiRecommendation,
  AvailableOrderSummary,
  BookTripFormSnapshot,
  DriverOption,
  UnitOption,
} from "./types";

const BookTripSchema = z
  .object({
    orderId: z.string().optional(),
    driver: z.string().min(1, "Driver is required"),
    unit: z.string().min(1, "Unit is required"),
    miles: z.coerce.number({ invalid_type_error: "Miles is required" }).positive("Miles must be greater than 0"),
    revenue: z.coerce.number().nonnegative().optional(),
    fixedCPM: z.coerce.number().nonnegative().default(0),
    wageCPM: z.coerce.number().nonnegative().default(0),
    addOnsCPM: z.coerce.number().nonnegative().default(0),
    rollingCPM: z.coerce.number().nonnegative().default(0),
    tripStart: z.coerce.date().optional(),
    tripEnd: z.coerce.date().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tripStart && value.tripEnd) {
      if (value.tripEnd.getTime() < value.tripStart.getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["tripEnd"],
          message: "Trip end must be after trip start",
        });
      }
    }
  });

export type BookTripFormValues = z.infer<typeof BookTripSchema>;

type ResolverResult = {
  values: BookTripFormValues;
  errors: FieldErrors<BookTripFormValues>;
};

function createResolver(schema: typeof BookTripSchema) {
  return async (values: any): Promise<ResolverResult> => {
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      return { values: parsed.data, errors: {} };
    }
    const formErrors: FieldErrors<BookTripFormValues> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof BookTripFormValues | undefined;
      if (!key) continue;
      formErrors[key] = { message: issue.message };
    }
    return { values, errors: formErrors } as ResolverResult;
  };
}

export type BookTripFormHandle = {
  prefillFromOrder: (order: AvailableOrderSummary) => void;
  applyRecommendation: (recommendation: AiRecommendation) => void;
  getSnapshot: () => BookTripFormSnapshot;
  submit: () => void;
};

interface BookTripFormProps {
  drivers: DriverOption[];
  units: UnitOption[];
  availableOrders: AvailableOrderSummary[];
  onAskAi: (payload: { order?: AvailableOrderSummary | null; snapshot: BookTripFormSnapshot }) => void;
}

function createSnapshot(values: BookTripFormValues): BookTripFormSnapshot {
  return {
    orderId: values.orderId,
    driver: values.driver,
    unit: values.unit,
    miles: Number.isFinite(values.miles) ? values.miles : null,
    revenue: values.revenue ?? null,
    fixedCPM: values.fixedCPM ?? null,
    wageCPM: values.wageCPM ?? null,
    addOnsCPM: values.addOnsCPM ?? null,
    rollingCPM: values.rollingCPM ?? null,
    tripStart: values.tripStart ? values.tripStart.toISOString() : null,
    tripEnd: values.tripEnd ? values.tripEnd.toISOString() : null,
  };
}

function findOrderById(orders: AvailableOrderSummary[], id?: string) {
  if (!id) return undefined;
  return orders.find((order) => order.id === id);
}

export const BookTripForm = React.forwardRef<BookTripFormHandle, BookTripFormProps>(
  ({ drivers, units, onAskAi, availableOrders }, ref) => {
    const router = useRouter();
    const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

    const form = useForm<BookTripFormValues>({
      resolver: createResolver(BookTripSchema),
      defaultValues: {
        driver: "",
        unit: "",
        fixedCPM: 0,
        wageCPM: 0,
        addOnsCPM: 0,
        rollingCPM: 0,
      },
    });

    const { register, handleSubmit, formState, setValue, getValues } = form;

    const submitBooking: SubmitHandler<BookTripFormValues> = async (values) => {
      setFeedback(null);
      const payload = {
        orderId: values.orderId || undefined,
        driver: values.driver,
        unit: values.unit,
        miles: values.miles,
        revenue: values.revenue ?? undefined,
        fixedCPM: values.fixedCPM,
        wageCPM: values.wageCPM,
        addOnsCPM: values.addOnsCPM,
        rollingCPM: values.rollingCPM,
        tripStart: values.tripStart ? values.tripStart.toISOString() : undefined,
        tripEnd: values.tripEnd ? values.tripEnd.toISOString() : undefined,
      };

      try {
        const response = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Unable to book trip" }));
          setFeedback({ type: "error", message: error.error ?? "Unable to book trip" });
          return;
        }
        const json = await response.json();
        setFeedback({ type: "success", message: "Trip booked successfully" });
        router.push(`/trips/${json.tripId}`);
      } catch (error) {
        setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to book trip" });
      }
    };

    React.useImperativeHandle(ref, () => ({
      prefillFromOrder: (order) => {
        setValue("orderId", order.id);
        if (order.milesEstimate != null) {
          setValue("miles", order.milesEstimate);
        }
        if (order.revenueEstimate != null) {
          setValue("revenue", order.revenueEstimate);
        }
        if (order.puWindowStart) {
          setValue("tripStart", new Date(order.puWindowStart), { valueAsDate: true });
        }
        if (order.delWindowEnd) {
          setValue("tripEnd", new Date(order.delWindowEnd), { valueAsDate: true });
        }
      },
      applyRecommendation: (recommendation) => {
        if (recommendation.driverId) {
          const match = drivers.find((driver) => driver.id === recommendation.driverId);
          if (match) {
            setValue("driver", match.name);
          }
        }
        if (recommendation.driverName) {
          setValue("driver", recommendation.driverName);
        }
        if (recommendation.unitId) {
          const match = units.find((unit) => unit.id === recommendation.unitId);
          if (match) {
            setValue("unit", match.code);
          }
        }
        if (recommendation.unitCode) {
          setValue("unit", recommendation.unitCode);
        }
        if (recommendation.start) {
          setValue("tripStart", new Date(recommendation.start), { valueAsDate: true });
        }
        if (recommendation.suggestedTotal != null) {
          setValue("revenue", recommendation.suggestedTotal);
        }
      },
      getSnapshot: () => createSnapshot(getValues()),
      submit: () => {
        void handleSubmit(submitBooking)(undefined);
      },
    }));

    const handleAskAiClick = () => {
      const snapshot = createSnapshot(getValues());
      const order = findOrderById(availableOrders, snapshot.orderId);
      onAskAi({ order, snapshot });
    };

    const errors = formState.errors;

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Book Trip</CardTitle>
          <CardDescription>Assign a driver and unit, confirm costs, and book the move.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit(submitBooking)}>
            <input type="hidden" {...register("orderId")} />
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="driver">Driver</Label>
                <Input
                  id="driver"
                  list="drivers-list"
                  autoComplete="off"
                  aria-invalid={errors.driver ? "true" : undefined}
                  {...register("driver")}
                />
                {errors.driver && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.driver.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  list="units-list"
                  autoComplete="off"
                  aria-invalid={errors.unit ? "true" : undefined}
                  {...register("unit")}
                />
                {errors.unit && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.unit.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="miles">Miles</Label>
                <Input
                  id="miles"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  aria-invalid={errors.miles ? "true" : undefined}
                  {...register("miles", { valueAsNumber: true })}
                />
                {errors.miles && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.miles.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="revenue">Revenue</Label>
                <Input
                  id="revenue"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  aria-invalid={errors.revenue ? "true" : undefined}
                  {...register("revenue", { valueAsNumber: true })}
                />
                {errors.revenue && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.revenue.message}
                  </p>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-300">Cost per mile</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fixedCPM">Fixed CPM</Label>
                  <Input
                    id="fixedCPM"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    {...register("fixedCPM", { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="wageCPM">Wage CPM</Label>
                  <Input
                    id="wageCPM"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    {...register("wageCPM", { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="addOnsCPM">Add-ons CPM</Label>
                  <Input
                    id="addOnsCPM"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    {...register("addOnsCPM", { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="rollingCPM">Rolling CPM</Label>
                  <Input
                    id="rollingCPM"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    {...register("rollingCPM", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tripStart">Trip start</Label>
                <Input
                  id="tripStart"
                  type="datetime-local"
                  {...register("tripStart", { valueAsDate: true })}
                />
                {errors.tripStart && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.tripStart.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="tripEnd">Trip end</Label>
                <Input
                  id="tripEnd"
                  type="datetime-local"
                  {...register("tripEnd", { valueAsDate: true })}
                />
                {errors.tripEnd && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.tripEnd.message}
                  </p>
                )}
              </div>
            </section>

            {feedback && (
              <div
                role="status"
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  feedback.type === "success"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/60 bg-red-500/10 text-red-200"
                )}
              >
                {feedback.message}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? "Booking…" : "Book Trip"}
              </Button>
              <Button type="button" variant="secondary" onClick={handleAskAiClick}>
                Ask AI
              </Button>
            </div>
          </form>
          <datalist id="drivers-list">
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.name}>
                {driver.homeBase ? `${driver.name} – ${driver.homeBase}` : driver.name}
              </option>
            ))}
          </datalist>
          <datalist id="units-list">
            {units.map((unit) => (
              <option key={unit.id} value={unit.code}>
                {unit.name
                  ? `${unit.code} – ${unit.name}`
                  : unit.type
                  ? `${unit.code} – ${unit.type}`
                  : unit.code}
              </option>
            ))}
          </datalist>
        </CardContent>
      </Card>
    );
  }
);
BookTripForm.displayName = "BookTripForm";
