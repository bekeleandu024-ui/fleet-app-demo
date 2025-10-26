import Link from "next/link";

import { format } from "date-fns";

import { prisma } from "@/server/prisma";

function formatWindow(start: Date | null, end: Date | null) {
  if (!start && !end) {
    return "-";
  }

  const formatter = (value: Date | null) => (value ? format(value, "MMM d, yyyy HH:mm") : "?");

  return `${formatter(start)} → ${formatter(end)}`;
}

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      customer: true,
      origin: true,
      destination: true,
      puWindowStart: true,
      puWindowEnd: true,
      delWindowStart: true,
      delWindowEnd: true,
      requiredTruck: true,
      notes: true,
      createdAt: true
    }
  });

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Orders</h1>
          <p className="text-sm text-zinc-400">Most recent customer orders ready to book.</p>
        </div>
        <Link
          href="/orders/new"
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
        >
          Create order
        </Link>
      </header>
      <div className="overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-900/40">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Lane</th>
              <th className="px-4 py-3">Pickup window</th>
              <th className="px-4 py-3">Delivery window</th>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3 font-medium text-white">{order.customer}</td>
                <td className="px-4 py-3">{order.origin} → {order.destination}</td>
                <td className="px-4 py-3">{formatWindow(order.puWindowStart, order.puWindowEnd)}</td>
                <td className="px-4 py-3">{formatWindow(order.delWindowStart, order.delWindowEnd)}</td>
                <td className="px-4 py-3">{order.requiredTruck ?? "-"}</td>
                <td className="px-4 py-3 text-zinc-400">{format(order.createdAt, "yyyy-MM-dd")}</td>
                <td className="px-4 py-3">
                  <Link className="text-emerald-300 hover:text-emerald-200" href={`/orders/${order.id}/book`}>
                    Book
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
