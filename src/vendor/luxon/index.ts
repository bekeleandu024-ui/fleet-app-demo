export type DateTimeOptions = {
  zone?: string;
  setZone?: boolean;
};

export type DateTimeObject = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
};

function zonedTimeToUtc(object: Required<DateTimeObject>, timeZone?: string): Date {
  const date = new Date(Date.UTC(object.year, object.month - 1, object.day, object.hour, object.minute, object.second));
  if (!timeZone) {
    return date;
  }

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = dtf.formatToParts(date);
  const lookup: Record<string, number> = {};
  for (const part of parts) {
    if (part.type === "year" || part.type === "month" || part.type === "day" || part.type === "hour" || part.type === "minute" || part.type === "second") {
      lookup[part.type] = Number(part.value);
    }
  }

  if (!lookup.year || !lookup.month || !lookup.day) {
    return date;
  }

  const asUtc = Date.UTC(
    lookup.year,
    (lookup.month ?? 1) - 1,
    lookup.day ?? 1,
    lookup.hour ?? 0,
    lookup.minute ?? 0,
    lookup.second ?? 0,
  );

  const diff = asUtc - date.getTime();
  return new Date(date.getTime() - diff);
}

function normalizeIso(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("T")) return trimmed;
  return trimmed.replace(/\s+/, "T");
}

function parseIsoComponents(iso: string): Required<DateTimeObject> | null {
  const match = iso
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? "0"),
    minute: Number(match[5] ?? "0"),
    second: Number(match[6] ?? "0"),
  };
}

export class DateTime {
  private constructor(private readonly date: Date, private readonly zone?: string, private readonly valid: boolean = true) {}

  static fromISO(text: string, options: DateTimeOptions = {}): DateTime {
    if (!text) return new DateTime(new Date(NaN), options.zone, false);
    const iso = normalizeIso(text);
    const parsed = parseIsoComponents(iso);
    if (parsed) {
      const date = zonedTimeToUtc(parsed, options.setZone ? options.zone : undefined);
      return new DateTime(date, options.zone, true);
    }
    const jsDate = new Date(iso);
    if (Number.isNaN(jsDate.getTime())) {
      return new DateTime(new Date(NaN), options.zone, false);
    }
    return new DateTime(jsDate, options.zone, true);
  }

  static fromJSDate(date: Date, options: DateTimeOptions = {}): DateTime {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return new DateTime(new Date(NaN), options.zone, false);
    }
    return new DateTime(new Date(date.getTime()), options.zone, true);
  }

  static fromObject(object: DateTimeObject, options: DateTimeOptions = {}): DateTime {
    if (!object.year || !object.month || !object.day) {
      return new DateTime(new Date(NaN), options.zone, false);
    }
    const partial: Required<DateTimeObject> = {
      year: object.year,
      month: object.month,
      day: object.day,
      hour: object.hour ?? 0,
      minute: object.minute ?? 0,
      second: object.second ?? 0,
    };
    const date = zonedTimeToUtc(partial, options.zone);
    return new DateTime(date, options.zone, true);
  }

  setZone(zone: string | undefined): DateTime {
    if (!zone || !this.valid) return new DateTime(this.date, zone, this.valid);
    const iso = this.toISO();
    if (!iso) return new DateTime(new Date(NaN), zone, false);
    return DateTime.fromISO(iso, { setZone: true, zone });
  }

  toISO(): string | null {
    if (!this.valid) return null;
    return this.date.toISOString();
  }

  toJSDate(): Date {
    return new Date(this.date.getTime());
  }

  toFormat(format: string, options: { timeZone?: string } = {}): string {
    if (!this.valid) return "Invalid";
    const timeZone = options.timeZone ?? this.zone;
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: format.includes("yyyy") ? "numeric" : undefined,
      month: format.includes("LLL") ? "short" : format.includes("MM") ? "2-digit" : undefined,
      day: format.includes("dd") ? "2-digit" : undefined,
      hour: format.match(/HH|hh/) ? "2-digit" : undefined,
      minute: format.includes("mm") ? "2-digit" : undefined,
      hour12: false,
    });
    return formatter.format(this.date);
  }

  get isValid(): boolean {
    return this.valid && !Number.isNaN(this.date.getTime());
  }
}

export const Settings = {
  defaultZone: "UTC",
};
