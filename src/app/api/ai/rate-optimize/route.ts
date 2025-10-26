import { NextResponse } from "next/server";

import { mapRateToDTO } from "@/lib/dto/rate.dto";
import { toNum } from "@/lib/serialize";
import prisma from "@/server/prisma";

type AccessorialInput = { ruleKey?: unknown; value?: unknown };

type RequestBody = {
  miles?: unknown;
  zone?: unknown;
  type?: unknown;
  accessorials?: AccessorialInput[];
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as RequestBody;

    const milesNum = toNum(payload.miles);
    if (milesNum == null || milesNum < 0) {
      return NextResponse.json({ error: "miles must be a non-negative number" }, { status: 400 });
    }

    const zone = toStringOrNull(payload.zone);
    const type = toStringOrNull(payload.type);

    const rate = await prisma.rate.findFirst({
      where: {
        ...(zone ? { zone } : {}),
        ...(type ? { type } : {}),
      },
    });

    if (!rate) {
      return NextResponse.json({ error: "No matching rate found" }, { status: 404 });
    }

    const dto = mapRateToDTO(rate);
    const suggestedCPM = dto.fixedCPM + dto.wageCPM + dto.addOnsCPM + dto.rollingCPM;

    const accessorialTotal = (payload.accessorials ?? []).reduce((sum, item) => {
      const amount = toNum(item?.value);
      if (amount == null) return sum;
      return sum + amount;
    }, 0);

    const suggestedRevenue = suggestedCPM * milesNum + accessorialTotal;

    const breakdown = {
      fixedCPM: dto.fixedCPM,
      wageCPM: dto.wageCPM,
      addOnsCPM: dto.addOnsCPM,
      rollingCPM: dto.rollingCPM,
      accessorials: accessorialTotal,
    };

    return NextResponse.json({ suggestedCPM, suggestedRevenue, breakdown });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to compute rate suggestion" }, { status: 500 });
  }
}
