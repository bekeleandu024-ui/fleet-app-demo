export type AvailableOrderSummary = {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  puWindowStart: string | null;
  puWindowEnd: string | null;
  delWindowStart: string | null;
  delWindowEnd: string | null;
  requiredTruck: string | null;
  notes: string | null;
  createdAt: string;
  milesEstimate: number | null;
  revenueEstimate: number | null;
  urgency: { score: number; label: string };
  breakevenCPM: number | null;
  suggestedCPM: number | null;
  suggestedTotal: number | null;
  marginAtSuggested: number | null;
};

export type DriverOption = {
  id: string;
  name: string;
  homeBase: string | null;
};

export type UnitOption = {
  id: string;
  code: string;
  name: string | null;
  type: string | null;
  homeBase: string | null;
};

export type BookTripFormSnapshot = {
  orderId?: string;
  driver: string;
  unit: string;
  miles: number | null;
  revenue: number | null;
  fixedCPM: number | null;
  wageCPM: number | null;
  addOnsCPM: number | null;
  rollingCPM: number | null;
  tripStart?: string | null;
  tripEnd?: string | null;
};

export type AiRecommendation = {
  driverId?: string | null;
  driverName?: string | null;
  unitId?: string | null;
  unitCode?: string | null;
  start?: string | null;
  suggestedCPM?: number | null;
  suggestedTotal?: number | null;
  expectedMarginPct?: number | null;
  rationale?: string | null;
  fallback?: boolean;
};
