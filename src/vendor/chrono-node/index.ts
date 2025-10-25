export type ParsedComponents = {
  date(): Date;
};

export type ParsedResult = {
  text: string;
  index: number;
  start?: ParsedComponents;
  end?: ParsedComponents;
};

export type ParseOptions = {
  timezone?: string;
  forwardDate?: boolean;
};

const DATE_RE = /(\d{4})[\/-](\d{2})[\/-](\d{2})/;
const TIME_RE = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;

function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, timeZone?: string) {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (!timeZone) return date;
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
  const asUtc = Date.UTC(
    lookup.year ?? year,
    (lookup.month ?? month) - 1,
    lookup.day ?? day,
    lookup.hour ?? hour,
    lookup.minute ?? minute,
    lookup.second ?? second,
  );
  const diff = asUtc - date.getTime();
  return new Date(date.getTime() - diff);
}

function parseTimeSegment(segment: string) {
  const match = segment.match(TIME_RE);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

function parseDate(text: string, fallback: { year: number; month: number; day: number } | null) {
  const match = text.match(DATE_RE);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }
  return fallback;
}

function createComponents(date: Date): ParsedComponents {
  return {
    date: () => new Date(date.getTime()),
  };
}

function parseRange(text: string, options: ParseOptions, fallbackDate: { year: number; month: number; day: number } | null) {
  const rangeRegex = /(?:(\d{4}[\/-]\d{2}[\/-]\d{2})\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to|–)\s*(?:(\d{4}[\/-]\d{2}[\/-]\d{2})\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
  const match = text.match(rangeRegex);
  if (!match) return null;
  const startDateText = match[1] ?? undefined;
  const endDateText = match[3] ?? undefined;
  const startTimeText = match[2];
  const endTimeText = match[4];

  const baseStartDate = parseDate(startDateText ?? "", fallbackDate);
  const baseEndDate = parseDate(endDateText ?? "", baseStartDate ?? fallbackDate);
  const startTime = parseTimeSegment(startTimeText);
  const endTime = parseTimeSegment(endTimeText);
  if (!baseStartDate || !startTime || !endTime) return null;

  const start = zonedTimeToUtc(
    baseStartDate.year,
    baseStartDate.month,
    baseStartDate.day,
    startTime.hour,
    startTime.minute,
    0,
    options.timezone,
  );
  const endBase = baseEndDate ?? baseStartDate;
  const end = zonedTimeToUtc(endBase.year, endBase.month, endBase.day, endTime.hour, endTime.minute, 0, options.timezone);

  return {
    text: match[0],
    start: createComponents(start),
    end: createComponents(end),
  };
}

export function parse(text: string, refDate: Date = new Date(), options: ParseOptions = {}): ParsedResult[] {
  const results: ParsedResult[] = [];
  const segments = text.split(/\n+/);
  let fallback: { year: number; month: number; day: number } | null = {
    year: refDate.getUTCFullYear(),
    month: refDate.getUTCMonth() + 1,
    day: refDate.getUTCDate(),
  };

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const explicit = parseDate(trimmed, null);
    if (explicit) {
      fallback = explicit;
    }
    const range = parseRange(trimmed, options, fallback);
    if (range) {
      results.push({
        text: range.text,
        index: text.indexOf(range.text),
        start: range.start,
        end: range.end,
      });
      continue;
    }

    const dateMatch = parseDate(trimmed, fallback);
    const timeMatch = parseTimeSegment(trimmed);
    if (dateMatch && timeMatch) {
      const start = zonedTimeToUtc(dateMatch.year, dateMatch.month, dateMatch.day, timeMatch.hour, timeMatch.minute, 0, options.timezone);
      results.push({
        text: trimmed,
        index: text.indexOf(trimmed),
        start: createComponents(start),
      });
      fallback = dateMatch;
      continue;
    }
  }

  return results;
}

export function parseDateValue(text: string, refDate: Date = new Date(), options: ParseOptions = {}): Date | null {
  const [result] = parse(text, refDate, options);
  if (!result?.start) return null;
  return result.start.date();
}
