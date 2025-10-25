"use client";

import * as React from "react";
import CostInsights from "./CostInsights";
import EditForm from "./ui-edit-form";
import AiOptimizerPanel from "./AiOptimizerPanel";
import type {
  TripDTO,
  DriverLite,
  UnitLite,
  SimilarTripSummary,
  OptimizerBenchmarks,
} from "./types";

const gridClass =
  "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]";

const cardClass = "rounded-xl border border-border bg-card/60 p-4";

const formCardClass = "rounded-xl border border-border bg-card/60 p-6";

type Props = {
  trip: TripDTO;
  drivers: DriverLite[];
  units: UnitLite[];
  availableTypes: string[];
  availableZones: string[];
  recentSimilar: SimilarTripSummary[];
};

type PatchFn = (patch: Partial<TripDTO>) => void;

const computeBenchmarks = (recentSimilar: SimilarTripSummary[]): OptimizerBenchmarks | undefined => {
  if (!recentSimilar.length) return undefined;

  const validMiles = recentSimilar.filter((item) => (item.miles ?? 0) > 0);
  const revenueCPM = validMiles.length
    ? validMiles.reduce((sum, trip) => sum + (trip.revenue ?? 0) / (trip.miles ?? 1), 0) / validMiles.length
    : null;

  const totalCPM =
    recentSimilar.reduce((sum, trip) => sum + (trip.totalCPM ?? 0), 0) / recentSimilar.length;

  const breakevenCPM =
    recentSimilar.reduce(
      (sum, trip) =>
        sum +
        (trip.fixedCPM ?? 0) +
        (trip.wageCPM ?? 0) +
        (trip.addOnsCPM ?? 0) +
        (trip.rollingCPM ?? 0),
      0,
    ) / recentSimilar.length;

  return {
    revenueCPM: revenueCPM != null && Number.isFinite(revenueCPM) ? revenueCPM : undefined,
    totalCPM: Number.isFinite(totalCPM) ? totalCPM : undefined,
    breakevenCPM: Number.isFinite(breakevenCPM) ? breakevenCPM : undefined,
  };
};

export default function EditTripClientShell({
  trip,
  drivers,
  units,
  availableTypes,
  availableZones,
  recentSimilar,
}: Props) {
  const patchFnRef = React.useRef<PatchFn | null>(null);

  const registerPatch = React.useCallback((fn: PatchFn) => {
    patchFnRef.current = fn;
  }, []);

  const applyPatchToForm = React.useCallback((patch: Partial<TripDTO>) => {
    patchFnRef.current?.(patch);
  }, []);

  const bench = React.useMemo(() => computeBenchmarks(recentSimilar), [recentSimilar]);

  return (
    <div className={gridClass}>
      <section className={cardClass}>
        <CostInsights trip={trip} recentSimilar={recentSimilar} />
      </section>

      <section className={formCardClass}>
        <EditForm
          trip={trip}
          drivers={drivers}
          units={units}
          availableTypes={availableTypes}
          availableZones={availableZones}
          exposePatch={registerPatch}
        />
      </section>

      <section className={cardClass}>
        <AiOptimizerPanel trip={trip} bench={bench} onApply={applyPatchToForm} />
      </section>
    </div>
  );
}
