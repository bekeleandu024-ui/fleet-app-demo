import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/src/server/prisma";
import { DriverCreate } from "@/src/lib/schemas";

export async function GET() {
  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = DriverCreate.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const driver = await prisma.driver.create({
      data: {
        name: data.name,
        homeBase: data.homeBase ?? null,
        active: data.active ?? true,
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

    console.error("Failed to create driver", error);
    return NextResponse.json({ error: "Failed to create driver" }, { status: 500 });
  }
}
