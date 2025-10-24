import prisma from "@/server/prisma";
import TripForm from "./ui-trip-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookTripPage({ params }: PageProps) {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return <main className="p-6">Order not found.</main>;

  const [drivers, units, typesResult, zonesResult] = await Promise.all([
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
    prisma.rate.findMany({ distinct: ["type"], select: { type: true } }),
    prisma.rate.findMany({ distinct: ["zone"], select: { zone: true } }),
  ]);

  const types = typesResult.map((r) => r.type).filter(Boolean) as string[];
  const zones = zonesResult.map((r) => r.zone).filter(Boolean) as string[];

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
