export type InsightPriority = "high" | "medium" | "low";

export interface Recommendation {
  title: string;
  detail: string;
}

export interface OrderInsight {
  orderId: string;
  customer: string;
  origin: string;
  destination: string;
  summary: string;
  priority: InsightPriority;
  priorityScore: number;
  metrics: {
    ageHours: number;
    hoursUntilPickup: number | null;
    assignedTrips: number;
  };
  reasoning: string[];
  recommendations: Recommendation[];
}

export interface OrdersAIResponse {
  generatedAt: string;
  insights: OrderInsight[];
}

export type TripHealth = "excellent" | "watch" | "intervene";

export interface TripOptimization {
  tripId: string;
  driver: string;
  unit: string;
  status: string;
  marginPct: number | null;
  miles: number;
  revenue: number | null;
  totalCost: number | null;
  revenuePerMile: number | null;
  costPerMile: number | null;
  opportunityScore: number;
  health: TripHealth;
  headline: string;
  reasoning: string[];
  actionItems: Recommendation[];
  projectedGain?: {
    description: string;
    amount: number;
  };
}

export interface TripsAIResponse {
  generatedAt: string;
  optimizations: TripOptimization[];
}
