// src/app/api/events/route.ts
import { NextResponse } from "next/server";
import prisma from "@/server/prisma";

export async function GET() {
  // optional: list latest events
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { trip: true },
  });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const b = await req.json();

  // minimal validation
  if (!b.tripId || !b.type) {
    return NextResponse.json(
      { error: "tripId and type are required" },
      { status: 400 }
    );
  }

  // use provided timestamp if present, else now
  const at = b.at ? new Date(b.at) : new Date();

  const ev = await prisma.event.create({
    data: {
      tripId: b.tripId,
      type: b.type,      // e.g. "TripStarted" | "ArrivedPU" | "LeftPU" | "CrossedBorder" | "ArrivedDEL" | "FinishedDEL"
      at,
      location: b.location ?? null,
      notes: b.notes ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: ev.id });
}
