import { NextResponse } from "next/server";

import prisma from "@/server/prisma";

const RECENT_DAYS = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, origin: true, requiredTruck: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const now = new Date();
    const recentThreshold = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);

    const [drivers, units] = await Promise.all([
      prisma.driver.findMany({
        where: {
          active: true,
          status: "Active",
          licenseExpiresAt: { gt: now },
        },
        select: { id: true, name: true, homeBase: true },
      }),
      prisma.unit.findMany({
        where: { active: true },
        select: { id: true, code: true, type: true },
      }),
    ]);

    if (!drivers.length || !units.length) {
      return NextResponse.json({ suggestions: [] });
    }

    const driverIds = drivers.map((driver) => driver.id);
    const recentTrips = driverIds.length
      ? await prisma.trip.findMany({
          where: { driverId: { in: driverIds } },
          orderBy: [{ tripStart: "desc" }],
          distinct: ["driverId"],
          select: { driverId: true, tripStart: true, tripEnd: true },
        })
      : [];

    const recentByDriver = new Map<string, Date>();
    for (const trip of recentTrips) {
      const stamp = trip.tripEnd ?? trip.tripStart;
      if (stamp) {
        recentByDriver.set(trip.driverId!, stamp);
      }
    }

    const originText = order.origin?.toLowerCase() ?? "";
    const requiredType = order.requiredTruck?.toLowerCase() ?? "";

    const chooseUnit = () => {
      if (!units.length) return null;
      if (!requiredType) return units[0];
      const match = units.find((unit) => (unit.type ?? "").toLowerCase() === requiredType);
      return match ?? units[0];
    };

    const suggestions = drivers
      .map((driver) => {
        const chosenUnit = chooseUnit();
        if (!chosenUnit) return null;

        let score = 0;
        const reasons: string[] = [];

        const homeBase = driver.homeBase?.toLowerCase() ?? "";
        if (homeBase && originText.includes(homeBase)) {
          score += 40;
          reasons.push(`Home base matches origin (${driver.homeBase})`);
        }

        if (requiredType && (chosenUnit.type ?? "").toLowerCase() === requiredType) {
          score += 40;
          reasons.push(`Unit type matches required ${order.requiredTruck}`);
        }

        const recent = recentByDriver.get(driver.id);
        if (recent && recent > recentThreshold) {
          score += 20;
          reasons.push("Driver ran a trip in the last 30 days");
        }

        return {
          driverId: driver.id,
          unitId: chosenUnit.id,
          score,
          reasons,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to generate suggestions" }, { status: 500 });
  }
}
