import type { Unit } from "@prisma/client";

import { stripDecimalsDeep } from "@/lib/serialize";

export type UnitDTO = {
  id: string;
  code: string;
  type: string | null;
  homeBase: string | null;
  active: boolean;
};

type MinimalUnit = Pick<Unit, "id" | "code" | "type" | "homeBase" | "active">;

export function mapUnitToDTO(unit: MinimalUnit): UnitDTO {
  const plain = stripDecimalsDeep(unit) as MinimalUnit;

  return {
    id: plain.id,
    code: plain.code,
    type: plain.type ?? null,
    homeBase: plain.homeBase ?? null,
    active: plain.active,
  };
}
