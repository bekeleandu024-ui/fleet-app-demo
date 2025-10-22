// src/app/api/rates/lookup/route.ts
import { NextResponse } from "next/server";
// Use the import that matches your helper:
import prisma from "@/server/prisma";        // <-- if default export
// or: import { prisma } from "@/src/server/prisma"; // <-- if named export with "@/src"

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || undefined;
  const zone = url.searchParams.get("zone") || undefined;

  // 1) exact match (type+zone) → 2) type only → 3) zone only → 4) default (both null)
  let rate =
    (type && zone && (await prisma.rate.findFirst({ where: { type, zone } }))) ||
    (type && (await prisma.rate.findFirst({ where: { type, zone: null } }))) ||
    (zone && (await prisma.rate.findFirst({ where: { zone, type: null } }))) ||
    (await prisma.rate.findFirst({ where: { type: null, zone: null } }));

  if (!rate) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    resolved: { type: rate.type ?? null, zone: rate.zone ?? null },
    fixedCPM: Number(rate.fixedCPM),
    wageCPM: Number(rate.wageCPM),
    addOnsCPM: Number(rate.addOnsCPM),
    rollingCPM: Number(rate.rollingCPM),
    totalCPM:
      Number(rate.fixedCPM) +
      Number(rate.wageCPM) +
      Number(rate.addOnsCPM) +
      Number(rate.rollingCPM),
  });
}
