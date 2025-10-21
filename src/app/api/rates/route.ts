// app/api/rates/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

// GET /api/rates?type=Company&zone=Ontario
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? undefined;
  const zone = url.searchParams.get("zone") ?? undefined;

  const rate = await prisma.rate.findFirst({
    where: { ...(type ? { type } : {}), ...(zone ? { zone } : {}) }
  });

  if (!rate) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM)
  });
}
