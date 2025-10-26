import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const unitSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  type: z.string().trim().optional(),
  homeBase: z.string().trim().optional(),
  active: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const result = unitSchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid unit", details: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;
  const unit = await prisma.unit.create({
    data: {
      code: data.code,
      type: data.type || null,
      homeBase: data.homeBase || null,
      active: data.active,
    },
  });

  return NextResponse.json({ ok: true, unit });
}
