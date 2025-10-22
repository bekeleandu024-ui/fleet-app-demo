import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/server/prisma";

type RateMatchStrategy =
  | "type-and-zone"
  | "type-default-zone"
  | "type-any-zone"
  | "zone-default-type"
  | "zone-any-type"
  | "global-default"
  | "any";

type LookupPlan = {
  type?: string | null;
  zone?: string | null;
  strategy: RateMatchStrategy;
};

function buildWhere({ type, zone }: LookupPlan): Prisma.RateWhereInput {
  const where: Prisma.RateWhereInput = {};

  if (type !== undefined) {
    where.type = type;
  }

  if (zone !== undefined) {
    where.zone = zone;
  }

  return where;
}

function sanitize(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function createPlans(type?: string, zone?: string): LookupPlan[] {
  const plans: LookupPlan[] = [];

  if (type && zone) {
    plans.push(
      { type, zone, strategy: "type-and-zone" },
      { type, zone: null, strategy: "type-default-zone" },
      { type, strategy: "type-any-zone" },
      { type: null, zone, strategy: "zone-default-type" },
      { zone, strategy: "zone-any-type" },
      { type: null, zone: null, strategy: "global-default" },
      { strategy: "any" }
    );
  } else if (type) {
    plans.push(
      { type, strategy: "type-any-zone" },
      { type, zone: null, strategy: "type-default-zone" },
      { type: null, zone: null, strategy: "global-default" },
      { strategy: "any" }
    );
  } else if (zone) {
    plans.push(
      { zone, strategy: "zone-any-type" },
      { type: null, zone, strategy: "zone-default-type" },
      { type: null, zone: null, strategy: "global-default" },
      { strategy: "any" }
    );
  } else {
    plans.push({ type: null, zone: null, strategy: "global-default" }, { strategy: "any" });
  }

  const seen = new Set<string>();
  const uniquePlans: LookupPlan[] = [];

  for (const plan of plans) {
    const key = `${plan.type ?? "__undefined__"}|${plan.zone ?? "__undefined__"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniquePlans.push(plan);
  }

  return uniquePlans;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = sanitize(url.searchParams.get("type"));
  const zone = sanitize(url.searchParams.get("zone"));

  const plans = createPlans(type, zone);

  for (const plan of plans) {
    const rate = await prisma.rate.findFirst({ where: buildWhere(plan) });
    if (!rate) continue;

    return NextResponse.json({
      found: true,
      strategy: plan.strategy,
      rate: {
        id: rate.id,
        type: rate.type,
        zone: rate.zone,
        fixedCPM: Number(rate.fixedCPM),
        wageCPM: Number(rate.wageCPM),
        addOnsCPM: Number(rate.addOnsCPM),
        rollingCPM: Number(rate.rollingCPM),
      },
    });
  }

  return NextResponse.json({ found: false });
}
