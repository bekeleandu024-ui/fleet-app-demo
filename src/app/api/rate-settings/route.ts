import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { RateSettingCreate } from "./schema";

export async function GET() {
  const settings = await prisma.rateSetting.findMany({
    orderBy: [{ rateKey: "asc" }, { category: "asc" }],
  });

  return NextResponse.json(
    settings.map((item) => ({
      ...item,
      value: Number(item.value),
    }))
  );
}

export async function POST(request: Request) {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RateSettingCreate.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await prisma.rateSetting.create({ data: parsed.data });
  return NextResponse.json({ ...created, value: Number(created.value) }, { status: 201 });
}
