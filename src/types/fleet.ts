export type FleetTruckStatus = "available" | "assigned" | "in-transit" | "inactive";

export type FleetTruckMarker = {
  id: string;
  label: string;
  code: string;
  status: FleetTruckStatus;
  city: string | null;
  driver: string | null;
  lat: number;
  lng: number;
  notes: string | null;
  lastEvent: string | null;
};

export type FleetSnapshot = {
  generatedAt: string;
  markerOrder: string[];
  trucksById: Record<string, FleetTruckMarker>;
};
