import prisma from "@/server/prisma";
import Link from "next/link";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link href="/orders/new" className="px-3 py-2 rounded-lg border">
          + New Order
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-gray-600">No orders yet. Create your first one.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{o.customer}</div>
                  <div className="text-sm text-gray-600">
                    {o.origin} → {o.destination}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(o.createdAt).toLocaleString()}
                  </div>
                </div>

                <Link
                  href={`/orders/${o.id}/book`}
                  className="px-3 py-2 rounded-lg border"
                >
                  Book Trip
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
