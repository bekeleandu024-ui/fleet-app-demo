import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/src/server/prisma";
import { DriverUpdate } from "@/src/lib/schemas";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(req: Request, { params }: RouteContext) {
  const body = await req.json().catch(() => ({}));
  const parsed = DriverUpdate.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const driver = await prisma.driver.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.homeBase !== undefined
          ? { homeBase: data.homeBase ?? null }
          : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    return NextResponse.json({ ok: true, driver });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          issues: [
            {
              path: ["name"],
              message: "Driver name must be unique",
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
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    console.error("Failed to update driver", error);
    return NextResponse.json({ error: "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    await prisma.driver.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    console.error("Failed to delete driver", error);
    return NextResponse.json({ error: "Failed to delete driver" }, { status: 500 });
  }
}
