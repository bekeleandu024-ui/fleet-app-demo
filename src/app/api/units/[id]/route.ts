import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/src/server/prisma";
import { UnitUpdate } from "@/src/lib/schemas";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(req: Request, { params }: RouteContext) {
  const body = await req.json().catch(() => ({}));
  const parsed = UnitUpdate.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const unit = await prisma.unit.update({
      where: { id: params.id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.type !== undefined ? { type: data.type ?? null } : {}),
        ...(data.homeBase !== undefined
          ? { homeBase: data.homeBase ?? null }
          : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    return NextResponse.json({ ok: true, unit });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          issues: [
            {
              path: ["code"],
              message: "Unit code must be unique",
            },
          ],
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    console.error("Failed to update unit", error);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    await prisma.unit.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    console.error("Failed to delete unit", error);
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}
