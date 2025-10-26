import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const updateSchema = z.object({
  driverId: z.string().trim().min(1).nullable().optional(),
  unitId: z.string().trim().min(1).nullable().optional(),
  rateId: z.string().trim().min(1).nullable().optional(),
  driver: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  type: z.string().trim().nullable().optional(),
  zone: z.string().trim().nullable().optional(),
  status: z.string().trim().min(1),
  miles: z.number().finite().min(0),
  revenue: z.number().finite().nullable().optional(),
  fixedCPM: z.number().finite().nullable().optional(),
  wageCPM: z.number().finite().nullable().optional(),
  addOnsCPM: z.number().finite().nullable().optional(),
  rollingCPM: z.number().finite().nullable().optional(),
  totalCPM: z.number().finite().nullable().optional(),
  totalCost: z.number().finite().nullable().optional(),
  profit: z.number().finite().nullable().optional(),
  marginPct: z.number().finite().nullable().optional(),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = params;
  const data = parsed.data;

  await prisma.trip.update({
    where: { id },
    data: {
      driverId: data.driverId ?? null,
      unitId: data.unitId ?? null,
      rateId: data.rateId ?? null,
      driver: data.driver,
      unit: data.unit,
      type: data.type ?? null,
      zone: data.zone ?? null,
      status: data.status,
      miles: data.miles,
      revenue: data.revenue ?? null,
      fixedCPM: data.fixedCPM ?? null,
      wageCPM: data.wageCPM ?? null,
      addOnsCPM: data.addOnsCPM ?? null,
      rollingCPM: data.rollingCPM ?? null,
      totalCPM: data.totalCPM ?? null,
      totalCost: data.totalCost ?? null,
      profit: data.profit ?? null,
      marginPct: data.marginPct ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
