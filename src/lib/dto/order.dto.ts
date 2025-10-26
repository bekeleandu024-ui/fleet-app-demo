import type { Order } from "@prisma/client";

import { stripDecimalsDeep, toISO } from "@/lib/serialize";

export type OrderDTO = {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  puWindowStart: string | null;
  puWindowEnd: string | null;
  delWindowStart: string | null;
  delWindowEnd: string | null;
  requiredTruck: string | null;
  notes: string | null;
  createdAt: string;
};

export function mapOrderToDTO(order: Order): OrderDTO {
  const plain = stripDecimalsDeep(order) as Order;

  return {
    id: plain.id,
    customer: plain.customer,
    origin: plain.origin,
    destination: plain.destination,
    puWindowStart: toISO(plain.puWindowStart),
    puWindowEnd: toISO(plain.puWindowEnd),
    delWindowStart: toISO(plain.delWindowStart),
    delWindowEnd: toISO(plain.delWindowEnd),
    requiredTruck: plain.requiredTruck ?? null,
    notes: plain.notes ?? null,
    createdAt: toISO(plain.createdAt) ?? new Date().toISOString(),
  };
}
