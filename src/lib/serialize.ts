import { Decimal } from "@prisma/client/runtime/library";

export type Primitive = string | number | boolean | null | undefined | Date;

// Converts Prisma Decimals anywhere in an object/array graph to numbers.
export function stripDecimalsDeep<T>(value: T): T {
  if (value instanceof Decimal) return (value.toNumber() as unknown) as T;
  if (value instanceof Date) return (value as unknown) as T;
  if (Array.isArray(value)) return (value.map(stripDecimalsDeep) as unknown) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripDecimalsDeep(v as unknown);
    }
    return (out as unknown) as T;
  }
  return value;
}

export function toNum(v: unknown, def: number | null = null): number | null {
  if (v == null) return def;
  if (v instanceof Decimal) return v.toNumber();
  if (typeof v === "number") return v;
  const n = Number(v as any);
  return Number.isFinite(n) ? n : def;
}
