import prisma from "@/server/prisma";
import UiTripForm from "./ui-trip-form";

type Props = { params: Promise<{ id: string }> };

export default async function BookTripPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
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
      select: { type: true, zone: true },
    }),
  ]);

  const rateTypes = Array.from(
    new Set(
      rates
        .map((rate) => rate.type)
        .filter((type): type is string => Boolean(type))
    )
  ).sort((a, b) => a.localeCompare(b));

  const rateZones = Array.from(
    new Set(
      rates
        .map((rate) => rate.zone)
        .filter((zone): zone is string => Boolean(zone))
    )
  ).sort((a, b) => a.localeCompare(b));

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Book Trip</h1>
      <p className="text-sm text-gray-600 mb-6">
        {order.customer}: {order.origin} → {order.destination}
      </p>
      <UiTripForm
        orderId={order.id}
        drivers={drivers}
        units={units}
        rateTypes={rateTypes}
        rateZones={rateZones}
      />
    </main>
  );
}
