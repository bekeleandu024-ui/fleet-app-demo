"use server";

import prisma from "./prisma";
import type {
  OrderInsight,
  OrdersAIResponse,
  Recommendation,
  TripOptimization,
  TripsAIResponse,
} from "@/types/ai";

const HOURS_IN_MS = 60 * 60 * 1000;

function diffInHours(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / HOURS_IN_MS;
}

function normalizeText(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? "";
}

function summarizePriority(score: number) {
  if (score >= 4) return "high" as const;
  if (score >= 2) return "medium" as const;
  return "low" as const;
}

function sumRate(rate: {
  fixedCPM: unknown;
  wageCPM: unknown;
  addOnsCPM: unknown;
  rollingCPM: unknown;
}) {
  return (
    Number(rate.fixedCPM ?? 0) +
    Number(rate.wageCPM ?? 0) +
    Number(rate.addOnsCPM ?? 0) +
    Number(rate.rollingCPM ?? 0)
  );
}

interface DriverMatchResult {
  name: string;
  score: number;
  reason: string;
}

interface UnitMatchResult {
  code: string;
  score: number;
  reason: string;
}

function selectDriverMatch(
  drivers: Array<{
    name: string;
    licenseClass: string | null;
    licenseEndorsements: string[];
    homeBase: string | null;
    active: boolean;
  }>,
  origin: string,
  requiredTruck: string | null | undefined,
) {
  const originText = normalizeText(origin);
  const equipment = normalizeText(requiredTruck);

  const matches: DriverMatchResult[] = drivers
    .map((driver) => {
      let score = 0;
      const reasons: string[] = [];
      if (driver.homeBase) {
        const base = normalizeText(driver.homeBase);
        if (base && originText && originText.includes(base.split(",")[0]?.trim() ?? "")) {
          score += 2;
          reasons.push(`Home base aligns with ${origin}`);
        }
      }
      if (equipment && (driver.licenseClass || driver.licenseEndorsements.length)) {
        const license = normalizeText(
          [driver.licenseClass, ...driver.licenseEndorsements].filter(Boolean).join(" ")
        );
        if (license.includes(equipment)) {
          score += 1.5;
          reasons.push(`Licensed for ${requiredTruck}`);
        }
      }
      if (driver.active) {
        score += 1;
      }
      return {
        name: driver.name,
        score,
        reason:
          reasons.length > 0
            ? reasons.join("; ")
            : "Available driver with recent activity",
      } satisfies DriverMatchResult;
    })
    .filter((entry) => entry.score > 0.5)
    .sort((a, b) => b.score - a.score);

  return matches[0];
}

function selectUnitMatch(
  units: Array<{
    code: string;
    type: string | null;
    homeBase: string | null;
    active: boolean;
  }>,
  origin: string,
  requiredTruck: string | null | undefined,
) {
  const originText = normalizeText(origin);
  const equipment = normalizeText(requiredTruck);

  const matches: UnitMatchResult[] = units
    .map((unit) => {
      let score = 0;
      const reasons: string[] = [];
      if (unit.homeBase) {
        const base = normalizeText(unit.homeBase);
        if (base && originText.includes(base.split(",")[0]?.trim() ?? "")) {
          score += 2;
          reasons.push(`Home base ${unit.homeBase} matches pickup region`);
        }
      }
      if (equipment && unit.type) {
        const type = normalizeText(unit.type);
        if (type.includes(equipment)) {
          score += 1.5;
          reasons.push(`${unit.type} fits ${requiredTruck} requirement`);
        }
      }
      if (unit.active) {
        score += 1;
      }
      return {
        code: unit.code,
        score,
        reason:
          reasons.length > 0
            ? reasons.join("; ")
            : "Available unit with matching availability",
      } satisfies UnitMatchResult;
    })
    .filter((entry) => entry.score > 0.5)
    .sort((a, b) => b.score - a.score);

  return matches[0];
}

export async function getOrderInsights(): Promise<OrdersAIResponse> {
  const now = new Date();
  const [orders, rates, rawDrivers, units] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { trips: { select: { id: true } } },
    }),
    prisma.rate.findMany(),
    prisma.driver.findMany({
      where: { active: true },
      select: {
        name: true,
        homeBase: true,
        active: true,
        licenseClass: true,
        licenseEndorsements: true,
      },
    }),
    prisma.unit.findMany({ where: { active: true } }),
  ]);

  const drivers = rawDrivers.map((driver) => ({
    ...driver,
    licenseEndorsements: Array.isArray(driver.licenseEndorsements)
      ? driver.licenseEndorsements.filter((item): item is string => typeof item === "string")
      : [],
  }));

  const results: OrderInsight[] = [];

  for (const order of orders) {
    const assignedTrips = order.trips.length;
    const ageHours = diffInHours(now, order.createdAt);
    const pickupHours = order.puWindowStart
      ? diffInHours(order.puWindowStart, now)
      : null;

    const reasoning: string[] = [];
    let priorityScore = 0;

    if (assignedTrips === 0) {
      priorityScore += 2.5;
      reasoning.push("No trips booked yet");
    }
    if (pickupHours != null) {
      if (pickupHours < 6) {
        priorityScore += 2.5;
        reasoning.push("Pickup window is inside 6 hours");
      } else if (pickupHours < 18) {
        priorityScore += 1.5;
        reasoning.push("Pickup scheduled for today");
      }
      if (pickupHours < 0) {
        priorityScore += 2.5;
        reasoning.push("Pickup window already open");
      }
    }
    if (ageHours > 24) {
      priorityScore += 1.5;
      reasoning.push("Order has been open for more than a day");
    }
    if (order.requiredTruck) {
      priorityScore += 0.5;
      reasoning.push(`${order.requiredTruck} equipment requested`);
    }

    const recommendations: Recommendation[] = [];

    const driverMatch = selectDriverMatch(
      drivers,
      order.origin,
      order.requiredTruck,
    );
    if (driverMatch) {
      recommendations.push({
        title: `Assign ${driverMatch.name}`,
        detail: driverMatch.reason,
      });
    }

    const unitMatch = selectUnitMatch(
      units,
      order.origin,
      order.requiredTruck,
    );
    if (unitMatch) {
      recommendations.push({
        title: `Stage unit ${unitMatch.code}`,
        detail: unitMatch.reason,
      });
    }

    if (rates.length > 0) {
      const zoneText = normalizeText(order.origin) || normalizeText(order.destination);
      const equipment = normalizeText(order.requiredTruck);
      const targetRate = rates
        .map((rate) => {
          let score = 0;
          const rateZone = normalizeText(rate.zone);
          if (rateZone && zoneText && zoneText.includes(rateZone)) {
            score += 1.5;
          }
          const rateType = normalizeText(rate.type);
          if (rateType && equipment && rateType.includes(equipment)) {
            score += 1.5;
          }
          return {
            total: sumRate(rate),
            label: `${rate.type ?? "Std"} • ${rate.zone ?? "Any zone"}`.trim(),
            score,
          };
        })
        .sort((a, b) => b.score - a.score || a.total - b.total)[0];

      if (targetRate) {
        const projectedCostPerMile = Number(targetRate.total.toFixed(2));
        recommendations.push({
          title: "Price check",
          detail: `Target at least $${(projectedCostPerMile + 0.45).toFixed(
            2,
          )} per mile to maintain profit (${targetRate.label}).`,
        });
      }
    }

    const insight: OrderInsight = {
      orderId: order.id,
      customer: order.customer,
      origin: order.origin,
      destination: order.destination,
      summary: `${order.customer} • ${order.origin} → ${order.destination}`,
      priority: summarizePriority(priorityScore),
      priorityScore,
      metrics: {
        ageHours: Number(ageHours.toFixed(1)),
        hoursUntilPickup:
          pickupHours == null ? null : Number(Math.max(pickupHours, -24).toFixed(1)),
        assignedTrips,
      },
      reasoning,
      recommendations,
    };

    results.push(insight);
  }

  const sorted = results
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    insights: sorted,
  };
}

export async function getTripOptimizations(): Promise<TripsAIResponse> {
  const [trips, rates] = await Promise.all([
    prisma.trip.findMany(),
    prisma.rate.findMany(),
  ]);

  const optimizations: TripOptimization[] = [];

  for (const trip of trips) {
    const miles = Number(trip.miles ?? 0);
    const revenue = trip.revenue == null ? null : Number(trip.revenue);
    const totalCost = trip.totalCost == null ? null : Number(trip.totalCost);
    const marginPct = trip.marginPct == null ? null : Number(trip.marginPct);
    const revenuePerMile = miles > 0 && revenue != null ? revenue / miles : null;
    const costPerMile = miles > 0 && totalCost != null ? totalCost / miles : null;
    const tripType = normalizeText(trip.type);
    const tripZone = normalizeText(trip.zone);

    const reasoning: string[] = [];
    const actionItems: Recommendation[] = [];
    let score = 0;

    if (marginPct == null) {
      score += 2;
      reasoning.push("Margin not calculated yet");
      actionItems.push({
        title: "Recalculate costs",
        detail: "Run cost allocation to populate CPM and margin before settlement.",
      });
    } else if (marginPct < 0) {
      score += 4;
      reasoning.push("Trip is underwater");
      actionItems.push({
        title: "Stop loss",
        detail: "Review accessorials or renegotiate customer rate before delivery.",
      });
    } else if (marginPct < 0.12) {
      score += 2.5;
      reasoning.push("Margin below 12% target");
      actionItems.push({
        title: "Margin boost",
        detail: "Check for detention pay or fuel surcharge adjustments to lift profitability.",
      });
    } else {
      reasoning.push("Margin healthy");
    }

    if (revenuePerMile != null && costPerMile != null) {
      const spread = revenuePerMile - costPerMile;
      if (spread < 0.35) {
        score += 1.5;
        reasoning.push("Tight RPM/CPM spread");
        actionItems.push({
          title: "Review lane pricing",
          detail: "Lane paying under market. Compare against routing guide or mini-bid.",
        });
      }
    } else {
      if (revenuePerMile == null) {
        actionItems.push({
          title: "Enter revenue",
          detail: "Add the billing amount so profitability can be tracked.",
        });
      }
      if (costPerMile == null) {
        actionItems.push({
          title: "Confirm CPM",
          detail: "Apply a rate card or fuel plan to estimate operating costs.",
        });
      }
    }

    let projectedGain: TripOptimization["projectedGain"] = undefined;

    if (miles > 0 && rates.length > 0) {
      const currentRateTotal = costPerMile ?? undefined;
      const bestRate = rates
        .map((rate) => {
          const total = sumRate(rate);
          let matchScore = 0;
          const typeText = normalizeText(rate.type);
          const zoneText = normalizeText(rate.zone);
          if (typeText && tripType && tripType.includes(typeText)) {
            matchScore += 1.5;
          }
          if (zoneText && tripZone && tripZone.includes(zoneText)) {
            matchScore += 1.5;
          }
          return { total, matchScore };
        })
        .sort((a, b) => b.matchScore - a.matchScore || a.total - b.total)[0];

      if (bestRate) {
        const estimatedCostPerMile = bestRate.total;
        if (currentRateTotal == null || estimatedCostPerMile < currentRateTotal) {
          const gainPerMile =
            revenuePerMile != null
              ? revenuePerMile - estimatedCostPerMile
              : undefined;
          if (gainPerMile != null) {
            const gain = Number((gainPerMile * miles).toFixed(2));
            if (gain > 0) {
              projectedGain = {
                description: "Switch to best matching rate",
                amount: gain,
              };
              actionItems.push({
                title: "Apply cheaper rate",
                detail: `Selecting the best-fit rate card improves profit by ~$${gain.toFixed(
                  0,
                )}.`,
              });
              score += 1.5;
            }
          }
        }
      }
    }

    const health: TripOptimization["health"] =
      marginPct == null
        ? "watch"
        : marginPct < 0
        ? "intervene"
        : marginPct < 0.12
        ? "watch"
        : "excellent";

    const headline =
      health === "intervene"
        ? "Urgent: Trip losing money"
        : health === "watch"
        ? "Watchlist: Tight margin"
        : "On track";

    optimizations.push({
      tripId: trip.id,
      driver: trip.driver,
      unit: trip.unit,
      status: trip.status,
      marginPct,
      miles,
      revenue,
      totalCost,
      revenuePerMile: revenuePerMile == null ? null : Number(revenuePerMile.toFixed(2)),
      costPerMile: costPerMile == null ? null : Number(costPerMile.toFixed(2)),
      opportunityScore: Number(score.toFixed(1)),
      health,
      headline,
      reasoning,
      actionItems,
      projectedGain,
    });
  }

  const sorted = optimizations
    .filter((item) => item.opportunityScore > 0.5)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    optimizations: sorted,
  };
}
