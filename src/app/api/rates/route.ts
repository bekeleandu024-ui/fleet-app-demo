// src/app/api/rates/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type")?.trim();
    const zone = searchParams.get("zone")?.trim();

    if (!type || !zone) {
      return NextResponse.json(
        { error: "Query parameters 'type' and 'zone' are required." },
        { status: 400 }
      );
    }

    const rate = await prisma.rate.findFirst({
      where: { type, zone },
      select: {
        fixedCPM: true,
        wageCPM: true,
        addOnsCPM: true,
        rollingCPM: true,
      },
    });

    if (!rate) {
      return NextResponse.json({}, { status: 404 });
    }

    return NextResponse.json({
      fixedCPM: Number(rate.fixedCPM),
      wageCPM: Number(rate.wageCPM),
      addOnsCPM: Number(rate.addOnsCPM),
      rollingCPM: Number(rate.rollingCPM),
    });
  } catch (error) {
    console.error("Failed to fetch rate", error);
    return NextResponse.json(
      { error: "Unable to fetch rate information." },
      { status: 500 }
    );
  }
}
