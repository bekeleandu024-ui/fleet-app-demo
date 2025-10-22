// app/api/rates/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

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

export async function POST(req: Request) {
  const body = await req.json();

  const fixedCPM = Number(body.fixedCPM);
  const wageCPM = Number(body.wageCPM);
  const addOnsCPM = Number(body.addOnsCPM);
  const rollingCPM = Number(body.rollingCPM);

  if (
    [fixedCPM, wageCPM, addOnsCPM, rollingCPM].some(
      (value) => !Number.isFinite(value)
    )
  ) {
    return NextResponse.json(
      { error: "All CPM fields are required and must be numbers" },
      { status: 400 }
    );
  }

  const rate = await prisma.rate.create({
    data: {
      type: normalizeOptionalString(body.type),
      zone: normalizeOptionalString(body.zone),
      fixedCPM,
      wageCPM,
      addOnsCPM,
      rollingCPM,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: rate.id });
}
