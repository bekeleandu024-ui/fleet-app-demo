import prisma from "@/server/prisma";
import { BookTripClient } from "./BookTripClient";
import type { AvailableOrderSummary, DriverOption, UnitOption } from "./types";
import { calcBreakevenCPM, computeUrgency, marginFromRates, suggestRate } from "@/lib/booking";

const TARGET_MARGIN = 0.18;

export const metadata = {
  title: "Book Trip",
};

export default async function BookTripPage() {
  const [orders, drivers, units, referenceRate] = await Promise.all([
    prisma.order.findMany({
      where: { trips: { none: {} } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.driver.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, homeBase: true },
    }),
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, type: true, homeBase: true },
    }),
    prisma.rate.findFirst(),
  ]);

  const costTemplate = referenceRate
    ? {
        fixedCPM: Number(referenceRate.fixedCPM),
        wageCPM: Number(referenceRate.wageCPM),
        addOnsCPM: Number(referenceRate.addOnsCPM),
        rollingCPM: Number(referenceRate.rollingCPM),
      }
    : { fixedCPM: 0, wageCPM: 0, addOnsCPM: 0, rollingCPM: 0 };

  const breakevenDefault = calcBreakevenCPM(costTemplate);

  const availableOrders: AvailableOrderSummary[] = orders.map((order) => {
    const urgency = computeUrgency(order);
    const suggestion = suggestRate({ miles: 0, breakevenCPM: breakevenDefault, targetMargin: TARGET_MARGIN });
    const margin = marginFromRates({ breakevenCPM: breakevenDefault, suggestedCPM: suggestion.cpm }) ?? TARGET_MARGIN;

    return {
      id: order.id,
      customer: order.customer,
      origin: order.origin,
      destination: order.destination,
      puWindowStart: order.puWindowStart ? order.puWindowStart.toISOString() : null,
      puWindowEnd: order.puWindowEnd ? order.puWindowEnd.toISOString() : null,
      delWindowStart: order.delWindowStart ? order.delWindowStart.toISOString() : null,
      delWindowEnd: order.delWindowEnd ? order.delWindowEnd.toISOString() : null,
      requiredTruck: order.requiredTruck ?? null,
      notes: order.notes ?? null,
      createdAt: order.createdAt.toISOString(),
      milesEstimate: null,
      revenueEstimate: null,
      urgency,
      breakevenCPM: breakevenDefault,
      suggestedCPM: suggestion.cpm,
      suggestedTotal: suggestion.total,
      marginAtSuggested: margin,
    };
  });

  const driverOptions: DriverOption[] = drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    homeBase: driver.homeBase ?? null,
  }));

  const unitOptions: UnitOption[] = units.map((unit) => ({
    id: unit.id,
    code: unit.code,
    type: unit.type ?? null,
    homeBase: unit.homeBase ?? null,
  }));

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">Book Trip</h1>
        <p className="text-sm text-slate-400">
          Assign the best driver and equipment to available freight with data-backed targets.
        </p>
      </header>
      <BookTripClient
        orders={availableOrders}
        drivers={driverOptions}
        units={unitOptions}
        targetMargin={TARGET_MARGIN}
      />
    </main>
  );
}
