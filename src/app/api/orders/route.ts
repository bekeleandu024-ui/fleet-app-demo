// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import prisma from "@/server/prisma";

// Get all orders (sorted by latest)
export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

// Create a new order
export async function POST(req: Request) {
  const body = await req.json();

  // Basic validation
  if (!body.customer || !body.origin || !body.destination) {
    return NextResponse.json(
      { error: "customer, origin, and destination are required" },
      { status: 400 }
    );
  }

  // Insert into the database
  const order = await prisma.order.create({
    data: {
      customer: body.customer,
      origin: body.origin,
      destination: body.destination,
      puWindowStart: body.puWindowStart ? new Date(body.puWindowStart) : null,
      puWindowEnd: body.puWindowEnd ? new Date(body.puWindowEnd) : null,
      delWindowStart: body.delWindowStart
        ? new Date(body.delWindowStart)
        : null,
      delWindowEnd: body.delWindowEnd ? new Date(body.delWindowEnd) : null,
      requiredTruck: body.requiredTruck ?? null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: order.id });
}
