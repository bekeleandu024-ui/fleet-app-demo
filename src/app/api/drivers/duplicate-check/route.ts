import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/server/prisma";

const payloadSchema = z.object({
  licenseNumber: z.string().trim().min(1, "licenseNumber is required"),
  jurisdiction: z.string().trim().min(1, "jurisdiction is required"),
});

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { licenseNumber, jurisdiction } = parsed.data;

  const match = await prisma.driver.findFirst({
    where: { licenseNumber, licenseJurisdiction: jurisdiction },
    select: { id: true },
  });

  if (!match) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, matchId: match.id });
}

async function methodNotAllowed() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
