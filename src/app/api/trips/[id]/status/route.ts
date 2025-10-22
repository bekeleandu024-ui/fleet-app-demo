// src/app/api/trips/[id]/status/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/server/prisma";
import { isTripStatus, TRIP_STATUSES } from "@/lib/trip-statuses";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status =
    typeof body === "object" && body !== null && "status" in body
      ? (body as { status?: unknown }).status
      : undefined;

  if (typeof status !== "string") {
    return NextResponse.json(
      { error: "status must be provided as a string" },
      { status: 400 }
    );
  }

  const nextStatus = status.trim();
  if (!isTripStatus(nextStatus)) {
    return NextResponse.json(
      { error: "status must be one of: " + TRIP_STATUSES.join(", ") },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.trip.update({
      where: { id: params.id },
      data: { status: nextStatus },
      select: { id: true, status: true },
    });

    return NextResponse.json({ ok: true, trip: updated });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    console.error("Failed to update trip status", error);
    return NextResponse.json(
      { error: "Failed to update trip status" },
      { status: 500 }
    );
  }
}
