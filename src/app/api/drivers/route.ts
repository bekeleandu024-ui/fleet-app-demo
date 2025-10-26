import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const driverSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  homeBase: z.string().trim().optional(),
  active: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const result = driverSchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid driver", details: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;
  const driver = await prisma.driver.create({
    data: {
      name: data.name,
      homeBase: data.homeBase || null,
      active: data.active,
    },
  });

  return NextResponse.json({ ok: true, driver });
}
