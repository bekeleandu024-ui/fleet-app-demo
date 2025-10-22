import prisma from "@/src/server/prisma";
import TripForm from "./ui-trip-form";

type Props = { params: { id: string } };

export default async function BookTripPage({ params }: Props) {
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return <main className="p-6">Order not found.</main>;
  }

  const [drivers, units, rates] = await Promise.all([
    prisma.driver.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.unit.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true },
    }),
    prisma.rate.findMany({
      orderBy: [{ type: "asc" }, { zone: "asc" }],
      select: { type: true, zone: true },
    }),
  ]);

  const rateTypes = Array.from(
    new Set(rates.map((rate) => rate.type).filter((value): value is string => Boolean(value)))
  );
  const rateZones = Array.from(
    new Set(rates.map((rate) => rate.zone).filter((value): value is string => Boolean(value)))
  );

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Book Trip</h1>
        <p className="text-sm text-gray-600">
          {order.customer}: {order.origin} → {order.destination}
        </p>
      </div>
      <TripForm
        orderId={order.id}
        drivers={drivers}
        units={units}
        rateTypes={rateTypes}
        rateZones={rateZones}
      />
    </main>
  );
}
