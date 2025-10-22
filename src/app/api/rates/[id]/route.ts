import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

type RouteContext = { params: { id: string } };

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const existing = await prisma.rate.findUnique({ where: { id: params.id } });

  if (!existing) {
    return NextResponse.json({ error: "Rate not found" }, { status: 404 });
  }

  const body = await req.json();

  const fixedCPM = parseNumber(body.fixedCPM);
  const wageCPM = parseNumber(body.wageCPM);
  const addOnsCPM = parseNumber(body.addOnsCPM);
  const rollingCPM = parseNumber(body.rollingCPM);

  if ([fixedCPM, wageCPM, addOnsCPM, rollingCPM].some((value) => value == null)) {
    return NextResponse.json(
      { error: "All CPM fields are required and must be numbers" },
      { status: 400 }
    );
  }

  await prisma.rate.update({
    where: { id: params.id },
    data: {
      type: normalizeOptionalString(body.type),
      zone: normalizeOptionalString(body.zone),
      fixedCPM,
      wageCPM,
      addOnsCPM,
      rollingCPM,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const existing = await prisma.rate.findUnique({ where: { id: params.id } });

  if (!existing) {
    return NextResponse.json({ error: "Rate not found" }, { status: 404 });
  }

  await prisma.rate.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
