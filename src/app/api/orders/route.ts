import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const payloadSchema = z.object({
  customer: z.string().trim().min(1, "Customer is required"),
  origin: z.string().trim().min(1, "Origin is required"),
  destination: z.string().trim().min(1, "Destination is required"),
  puWindowStart: z.string().optional(),
  puWindowEnd: z.string().optional(),
  delWindowStart: z.string().optional(),
  delWindowEnd: z.string().optional(),
  requiredTruck: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parseResult = payloadSchema.safeParse(json);
  if (!parseResult.success) {
    const errors = parseResult.error.flatten().fieldErrors;
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const data = parseResult.data;
  const order = await prisma.order.create({
    data: {
      customer: data.customer,
      origin: data.origin,
      destination: data.destination,
      puWindowStart: data.puWindowStart ? new Date(data.puWindowStart) : undefined,
      puWindowEnd: data.puWindowEnd ? new Date(data.puWindowEnd) : undefined,
      delWindowStart: data.delWindowStart ? new Date(data.delWindowStart) : undefined,
      delWindowEnd: data.delWindowEnd ? new Date(data.delWindowEnd) : undefined,
      requiredTruck: data.requiredTruck?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    },
  });

  return NextResponse.json({ ok: true, order });
}
