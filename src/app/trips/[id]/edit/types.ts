export type TripDTO = {
  id: string;
  orderId: string | null;
  driver: string;
  unit: string;
  type: string | null;
  zone: string | null;
  tripStart: string | null;
  tripEnd: string | null;
  weekStart: string | null;
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
  status: string | null;
  driverId: string | null;
  unitId: string | null;
  rateId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DriverLite = {
  id: string;
  name: string;
  homeBase?: string | null;
  active: boolean;
};

export type UnitLite = {
  id: string;
  code: string;
  type?: string | null;
  homeBase?: string | null;
  active: boolean;
};

export type SimilarTripSummary = {
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
  createdAt: string;
};

export type EditFormProps = {
  trip: TripDTO;
  drivers: DriverLite[];
  units: UnitLite[];
  availableTypes: string[];
  availableZones: string[];
  exposePatch?: (fn: (patch: Partial<TripDTO>) => void) => void;
};

export type CostInsightsProps = {
  trip: TripDTO;
  recentSimilar: SimilarTripSummary[];
};

export type OptimizerBenchmarks = {
  revenueCPM?: number;
  totalCPM?: number;
  breakevenCPM?: number;
};

export type AiOptimizerProps = {
  trip: TripDTO;
  bench?: OptimizerBenchmarks;
  onApply?: (patch: Partial<TripDTO>) => void;
};
