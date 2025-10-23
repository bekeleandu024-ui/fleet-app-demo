import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { TripStatusUpdate, TripStatus } from "@/lib/schemas";

type TripStatusValue = (typeof TripStatus.Enum)[keyof typeof TripStatus.Enum];

const ALLOWED: Record<TripStatusValue, TripStatusValue[]> = {
  Created: ["Dispatched", "Cancelled"],
  Dispatched: ["InProgress", "Cancelled"],
  InProgress: ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = TripStatusUpdate.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const t = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = parsed.data.status;
  if (!ALLOWED[t.status as keyof typeof ALLOWED]?.includes(next)) {
    return NextResponse.json(
      { error: `Illegal transition: ${t.status} → ${next}` },
      { status: 400 }
    );
  }
  if (next === "Completed" && (!t.tripEnd || Number(t.miles) <= 0)) {
    return NextResponse.json(
      { error: "To complete, set Trip End and Miles > 0" },
      { status: 400 }
    );
  }

  const u = await prisma.trip.update({
    where: { id: t.id },
    data: { status: next },
    select: { id: true, status: true },
  });
  return NextResponse.json({ ok: true, tripId: u.id, status: u.status });
}
