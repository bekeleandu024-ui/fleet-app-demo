import prisma from "@/server/prisma"; // if your helper exports { prisma }, change to: import { prisma } from "@/server/prisma";
import TripForm from "./ui-trip-form";

export default async function BookTripPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return <main className="p-6">Order not found.</main>;

  const drivers = await prisma.driver.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const units = await prisma.unit.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true },
  });

  const types = (await prisma.rate.findMany({ distinct: ["type"], select: { type: true } }))
    .map(r => r.type)
    .filter(Boolean) as string[];

  const zones = (await prisma.rate.findMany({ distinct: ["zone"], select: { zone: true } }))
    .map(r => r.zone)
    .filter(Boolean) as string[];

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Book Trip</h1>
      <p className="text-sm text-gray-600 mb-6">
        {order.customer}: {order.origin} → {order.destination}
      </p>
      <TripForm
        orderId={order.id}
        drivers={drivers}
        units={units}
        types={types}
        zones={zones}
      />
    </main>
  );
}
