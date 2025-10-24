import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { DriverCreate } from "@/lib/schemas";

export async function GET() {
  const items = await prisma.driver.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = DriverCreate.safeParse({
    ...body,
    active: typeof body.active === "boolean" ? body.active : true,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const d = await prisma.driver.create({ data: parsed.data });
  return NextResponse.json(d, { status: 201 });
}
