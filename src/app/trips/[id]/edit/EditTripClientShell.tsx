"use client";

import * as React from "react";
import type { TripDTO } from "./types";
import CostInsights from "./CostInsights";
import EditForm from "./ui-edit-form";
import AiOptimizerPanel from "./AiOptimizerPanel";

type DriverOption = { id: string; name: string };
type UnitOption = { id: string; code: string; name: string | null };
type SimilarTrip = {
  miles: number | null;
  revenue: number | null;
  fixedCPM: number | null;
  wageCPM: number | null;
  addOnsCPM: number | null;
  rollingCPM: number | null;
  totalCPM: number | null;
  totalCost: number | null;
  profit: number | null;
  marginPct: number | null;
  createdAt?: string | null;
};

type Props = {
  trip: TripDTO;
  drivers: DriverOption[];
  units: UnitOption[];
  recentSimilar: SimilarTrip[];
};

export default function EditTripClientShell({
  trip,
  drivers,
  units,
  recentSimilar,
}: Props) {
  const patchFnRef = React.useRef<(patch: Partial<TripDTO>) => void>();

  const registerPatch = React.useCallback((fn: (patch: Partial<TripDTO>) => void) => {
    patchFnRef.current = fn;
  }, []);

  const applyPatchToForm = React.useCallback((patch: Partial<TripDTO>) => {
    patchFnRef.current?.(patch);
  }, []);

  const bench = React.useMemo(() => {
    if (!recentSimilar.length) return undefined;

    const revenueCPM =
      recentSimilar.reduce(
        (sum: number, tripItem) =>
          sum + (Number(tripItem.revenue ?? 0) / Math.max(1, Number(tripItem.miles ?? 0))),
        0,
      ) / recentSimilar.length;

    const totalCPM =
      recentSimilar.reduce((sum: number, tripItem) => sum + Number(tripItem.totalCPM ?? 0), 0) /
      recentSimilar.length;

    const breakevenCPM =
      recentSimilar.reduce(
        (sum: number, tripItem) =>
          sum +
          (Number(tripItem.fixedCPM ?? 0) +
            Number(tripItem.wageCPM ?? 0) +
            Number(tripItem.addOnsCPM ?? 0) +
            Number(tripItem.rollingCPM ?? 0)),
        0,
      ) / recentSimilar.length;

    return { revenueCPM, totalCPM, breakevenCPM };
  }, [recentSimilar]);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <section className="md:col-span-1 rounded-xl border border-border bg-card/60 p-4">
        <CostInsights trip={trip} recentSimilar={recentSimilar} />
      </section>

      <section className="md:col-span-1 md:col-start-2 md:col-end-3 rounded-xl border border-border bg-card/60 p-6">
        <EditForm trip={trip} drivers={drivers} units={units} exposePatch={registerPatch} />
      </section>

      <section className="md:col-span-1 rounded-xl border border-border bg-card/60 p-4">
        <AiOptimizerPanel trip={trip} bench={bench} onApply={applyPatchToForm} />
      </section>
    </div>
  );
}
