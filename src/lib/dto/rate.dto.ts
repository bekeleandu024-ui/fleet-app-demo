import type { Rate } from "@prisma/client";

import { stripDecimalsDeep, toNum } from "@/lib/serialize";

export type RateDTO = {
  id: string;
  type: string;
  zone: string | null;
  fixedCPM: number;
  wageCPM: number;
  addOnsCPM: number;
  rollingCPM: number;
};

export function mapRateToDTO(rate: Rate): RateDTO {
  const plain = stripDecimalsDeep(rate) as Rate;

  return {
    id: plain.id,
    type: plain.type,
    zone: plain.zone ?? null,
    fixedCPM: toNum(plain.fixedCPM) ?? 0,
    wageCPM: toNum(plain.wageCPM) ?? 0,
    addOnsCPM: toNum(plain.addOnsCPM) ?? 0,
    rollingCPM: toNum(plain.rollingCPM) ?? 0,
  };
}
