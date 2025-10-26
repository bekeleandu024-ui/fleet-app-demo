import { Decimal } from "@prisma/client/runtime/library";

declare const DecimalCtor: typeof Decimal & { isDecimal?: (value: unknown) => boolean };
const DecimalClass: typeof DecimalCtor = Decimal as typeof DecimalCtor;

const isDecimal = (value: unknown): value is Decimal => {
  if (!value) return false;
  if (value instanceof Decimal) return true;
  return typeof DecimalClass.isDecimal === "function" ? DecimalClass.isDecimal(value) : false;
};

export function toNum(input: any): number | null {
  if (input == null) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === "bigint") {
    return Number(input);
  }
  if (isDecimal(input)) {
    try {
      return input.toNumber();
    } catch {
      return null;
    }
  }
  if (typeof input === "string") {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof input === "object") {
    const candidate = (input as { toNumber?: () => unknown }).toNumber;
    if (typeof candidate === "function") {
      try {
        const value = candidate.call(input);
        return toNum(value);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function stripDecimalsDeep<T>(value: T): T {
  if (isDecimal(value)) {
    return (toNum(value) as unknown) as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return (value.map((item) => stripDecimalsDeep(item)) as unknown) as T;
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
