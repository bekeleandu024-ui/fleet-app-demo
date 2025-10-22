// src/app/api/rates/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { RateCreate } from "@/lib/schemas";

export async function PATCH(req: Request, { params }: { params: { id: string }}) {
  const body = await req.json();
  const parsed = RateCreate.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const r = await prisma.rate.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(r);
}

export async function DELETE(_: Request, { params }: { params: { id: string }}) {
  await prisma.rate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
