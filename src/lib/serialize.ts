import { Decimal } from "@prisma/client/runtime/library";

type PlainObject = Record<string, unknown>;

type Serializable = PlainObject | unknown[] | Decimal | null | string | number | boolean | Date | undefined;

export function toNum(value: Decimal | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Decimal) {
    return Number(value.toString());
  }

  return Number(value);
}

export function stripDecimalsDeep<T extends Serializable>(input: T): unknown {
  if (input instanceof Decimal) {
    return toNum(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => stripDecimalsDeep(item));
  }

  if (input instanceof Date) {
    return input.toISOString();
  }

  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as PlainObject).map(([key, value]) => [key, stripDecimalsDeep(value as Serializable)])
    );
  }

  return input;
}
