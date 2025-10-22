import prisma from "@/server/prisma";
import TripForm from "./ui-trip-form";

type Props = { params: { id: string } };

export default async function BookTripPage({ params }: Props) {
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return <main className="p-6">Order not found.</main>;
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Book Trip</h1>
      <p className="text-sm text-gray-600 mb-6">
        {order.customer}: {order.origin} → {order.destination}
      </p>
      <TripForm orderId={order.id} />
    </main>
  );
}
