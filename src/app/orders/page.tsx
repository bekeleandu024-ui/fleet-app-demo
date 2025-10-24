import prisma from "@/server/prisma";
import Link from "next/link";
import AIOrdersAssistant from "./ai-orders-assistant";

function formatDateTime(value?: Date | null) {
  if (!value) return null;
  return value.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatWindow(start?: Date | null, end?: Date | null) {
  const startText = formatDateTime(start);
  const endText = formatDateTime(end);

  if (startText && endText) return `${startText} – ${endText}`;
  if (startText) return startText;
  if (endText) return endText;
  return "Not scheduled";
}

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { trips: true },
      },
    },
  });

  return (
    <main className="max-w-3xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link href="/orders/new" className="rounded-lg border px-3 py-2">
          + New Order
        </Link>
      </div>

      <AIOrdersAssistant />

      {orders.length === 0 ? (
        <p className="text-gray-600">No orders yet. Create your first one.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const pickupWindow = formatWindow(o.puWindowStart, o.puWindowEnd);
            const deliveryWindow = formatWindow(o.delWindowStart, o.delWindowEnd);
            const createdAt = formatDateTime(o.createdAt);
            const notes = typeof o.notes === "string" ? o.notes.trim() : "";
            const hasNotes = notes.length > 0;

            return (
              <li key={o.id} className="p-4 rounded-lg border">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-lg">{o.customer}</div>
                        {o.requiredTruck && (
                          <span className="text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">
                            {o.requiredTruck}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {o.origin} → {o.destination}
                      </div>
                    </div>

                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs uppercase text-gray-500">Pickup window</dt>
                        <dd className="mt-1 text-gray-600">{pickupWindow}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase text-gray-500">Delivery window</dt>
                        <dd className="mt-1 text-gray-600">{deliveryWindow}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase text-gray-500">Trips</dt>
                        <dd className="mt-1 text-gray-600">
                          {o._count.trips > 0
                            ? `${o._count.trips} ${o._count.trips === 1 ? "trip" : "trips"} assigned`
                            : "No trips yet"}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {createdAt && <span>Created {createdAt}</span>}
                    </div>

                    {hasNotes && (
                      <p className="text-sm text-gray-600 border-l-2 border-gray-200 pl-3">
                        {notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/orders/${o.id}/book`}
                      className="px-3 py-2 rounded-lg border"
                    >
                      Book Trip
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
