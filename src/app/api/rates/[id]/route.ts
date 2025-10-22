// src/app/api/rates/[id]/route.ts
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/server/prisma";

import { RateCreate, type RateCreateInput, serializeRate } from "../schema";

type RouteContext = { params: { id: string } };

function toUpdateData(data: Partial<RateCreateInput>): Prisma.RateUpdateInput {
  const update: Prisma.RateUpdateInput = {};

  if (data.type !== undefined) update.type = data.type ?? null;
  if (data.zone !== undefined) update.zone = data.zone ?? null;
  if (data.fixedCPM !== undefined) update.fixedCPM = data.fixedCPM;
  if (data.wageCPM !== undefined) update.wageCPM = data.wageCPM;
  if (data.addOnsCPM !== undefined) update.addOnsCPM = data.addOnsCPM;
  if (data.rollingCPM !== undefined) update.rollingCPM = data.rollingCPM;

  return update;
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = context.params;
  const payload = await req.json();
  const parsed = RateCreate.partial().safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateData = toUpdateData(parsed.data);

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No fields provided for update" },
      { status: 400 }
    );
  }

  try {
    const rate = await prisma.rate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(serializeRate(rate));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update rate" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = context.params;

  try {
    await prisma.rate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete rate" },
      { status: 500 }
    );
  }
}
