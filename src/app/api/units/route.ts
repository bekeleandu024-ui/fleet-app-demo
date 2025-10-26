import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/src/server/prisma";
import { UnitCreate } from "@/src/lib/schemas";

export async function GET() {
  const units = await prisma.unit.findMany({
    orderBy: { code: "asc" },
  });
  return NextResponse.json(units);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = UnitCreate.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const unit = await prisma.unit.create({
      data: {
        code: data.code,
        type: data.type ?? null,
        homeBase: data.homeBase ?? null,
        active: data.active ?? true,
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

    console.error("Failed to create unit", error);
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}
