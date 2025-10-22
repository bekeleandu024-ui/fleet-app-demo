import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/server/prisma";

export async function GET() {
  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name =
    typeof (body as { name?: unknown })?.name === "string"
      ? (body as { name?: string }).name.trim()
      : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const rawHomeBase = (body as { homeBase?: unknown })?.homeBase;
  const homeBase =
    typeof rawHomeBase === "string" && rawHomeBase.trim().length > 0
      ? rawHomeBase.trim()
      : null;

  const rawActive = (body as { active?: unknown })?.active;
  const active = typeof rawActive === "boolean" ? rawActive : true;

  try {
    const driver = await prisma.driver.create({
      data: {
        name,
        homeBase,
        active,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: driver.id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Driver name must be unique" },
        { status: 400 }
      );
    }

    console.error("Failed to create driver", error);
    return NextResponse.json(
      { error: "Failed to create driver" },
      { status: 500 }
    );
  }
}
