import { Decimal } from "@prisma/client/runtime/library";

export function stripDecimalsDeep<T>(value: T): T {
  if (value instanceof Decimal) {
    return (value.toNumber() as unknown) as T;
  }

  if (Array.isArray(value)) {
    return (value.map((item) => stripDecimalsDeep(item)) as unknown) as T;
  }

  if (value instanceof Date) {
    return (value as unknown) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      stripDecimalsDeep(val),
    ]);
    return (Object.fromEntries(entries) as unknown) as T;
  }

  return value;
}

export function toISO(input: Date | string | null | undefined): string | null {
  if (!input) return null;

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function toNum(value: unknown, fallback: number | null = null): number | null {
  if (value == null) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (value instanceof Decimal) return value.toNumber();
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && "toNumber" in (value as Record<string, unknown>)) {
    try {
      return Number((value as { toNumber: () => number }).toNumber());
    } catch {
      // ignore and fall through
    }
  }
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : fallback;
}
