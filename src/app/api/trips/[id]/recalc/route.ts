import { NextResponse } from "next/server";
import { recalcTripTotals } from "@/server/trip-recalc";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const result = await recalcTripTotals(params.id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}
