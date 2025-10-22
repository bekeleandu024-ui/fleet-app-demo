import { NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { RateCreate } from "@/lib/schemas";

// GET /api/rates  -> list rates with numeric CPMs + total
export async function GET() {
  const items = await prisma.rate.findMany({
    orderBy: [{ type: "asc" }, { zone: "asc" }],
  });

  return NextResponse.json(
    items.map((r) => ({
      ...r,
      fixedCPM: Number(r.fixedCPM),
      wageCPM: Number(r.wageCPM),
      addOnsCPM: Number(r.addOnsCPM),
      rollingCPM: Number(r.rollingCPM),
      totalCPM:
        Number(r.fixedCPM) +
        Number(r.wageCPM) +
        Number(r.addOnsCPM) +
        Number(r.rollingCPM),
    }))
  );
}

// POST /api/rates -> create a rate (validated)
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = RateCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const r = await prisma.rate.create({ data: parsed.data });
  return NextResponse.json(r, { status: 201 });
}
