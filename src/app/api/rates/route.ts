// src/app/api/rates/route.ts
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/server/prisma";

import { RateCreate, serializeRate } from "./schema";

function normalizeFilter(value: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = normalizeFilter(url.searchParams.get("type"));
  const zone = normalizeFilter(url.searchParams.get("zone"));

  const where: Prisma.RateWhereInput = {};
  if (type) where.type = type;
  if (zone) where.zone = zone;

  const rates = await prisma.rate.findMany({
    where,
    orderBy: [{ type: "asc" }, { zone: "asc" }],
  });

  return NextResponse.json(rates.map(serializeRate));
}

export async function POST(req: Request) {
  const payload = await req.json();
  const parsed = RateCreate.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const rate = await prisma.rate.create({
    data: {
      type: data.type ?? null,
      zone: data.zone ?? null,
      fixedCPM: data.fixedCPM,
      wageCPM: data.wageCPM,
      addOnsCPM: data.addOnsCPM,
      rollingCPM: data.rollingCPM,
    },
  });

  return NextResponse.json(serializeRate(rate), { status: 201 });
}
