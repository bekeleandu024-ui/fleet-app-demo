import { NextResponse } from "next/server";

import prisma from "@/server/prisma";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const rawNumber = typeof payload?.licenseNumber === "string" ? payload.licenseNumber : "";
    const rawJurisdiction = typeof payload?.jurisdiction === "string" ? payload.jurisdiction : "";

    const licenseNumber = rawNumber.trim();
    const jurisdiction = rawJurisdiction.trim();

    if (!licenseNumber || !jurisdiction) {
      return NextResponse.json({ exists: false });
    }

    const match = await prisma.driver.findFirst({
      where: {
        licenseNumber,
        licenseJurisdiction: jurisdiction,
      },
      select: { id: true },
    });

    if (!match) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true, matchId: match.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ exists: false, error: "Unable to check for duplicates" }, { status: 500 });
  }
}
