import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { RateSettingUpdate } from "../schema";

type RouteParams = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteParams) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RateSettingUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.rateSetting.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ ...updated, value: Number(updated.value) });
}

export async function DELETE(_: Request, { params }: RouteParams) {
  await prisma.rateSetting.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
