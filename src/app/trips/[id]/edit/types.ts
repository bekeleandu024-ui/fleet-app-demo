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

  availableTypes?: string[];
  availableZones?: string[];
};
