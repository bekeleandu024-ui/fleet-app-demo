export type ParsedOrder = {
  customer?: string;
  origin?: string;
  destination?: string;
  requiredTruck?: string;
  puStart?: string;
  puEnd?: string;
  delStart?: string;
  delEnd?: string;
  notes?: string;
};

export function parseOcrToOrder(rawText: string): ParsedOrder {
  const sanitized = normalizeText(rawText);
  const lines = sanitized.split("\n").map(line => line.trim());

  const pickupWindowRaw = findValue(sanitized, lines, [/(?:pickup|pu)\s*(?:window|time|availability)/i]);
  const deliveryWindowRaw = findValue(sanitized, lines, [/(?:delivery|del)\s*(?:window|time|availability)/i]);

  const puSingleStart = findValue(sanitized, lines, [/(?:pickup|pu)\s*(?:window\s*)?(?:start|open|from)/i]);
  const puSingleEnd = findValue(sanitized, lines, [/(?:pickup|pu)\s*(?:window\s*)?(?:end|close|by)/i]);
  const delSingleStart = findValue(sanitized, lines, [/(?:delivery|del)\s*(?:window\s*)?(?:start|open|from)/i]);
  const delSingleEnd = findValue(sanitized, lines, [/(?:delivery|del)\s*(?:window\s*)?(?:end|close|by)/i]);

  const pickupRange = parseWindow(pickupWindowRaw);
  const deliveryRange = parseWindow(deliveryWindowRaw);

  const result: ParsedOrder = {};

  assignIf(result, "customer", findValue(sanitized, lines, [/(?:customer|consignee|client)/i]));
  assignIf(
    result,
    "origin",
    findValue(sanitized, lines, [/(?:pickup(?!\s*(?:window|time))[^:\n]*?(?:origin|location)?[^:\n]*?(?:address)?|origin[^:\n]*?(?:address|location)?)/i])
  );
  assignIf(
    result,
    "destination",
    findValue(sanitized, lines, [/(?:delivery(?!\s*(?:window|time))[^:\n]*?(?:destination|location)?[^:\n]*?(?:address)?|destination[^:\n]*?(?:address|location)?)/i])
  );
  assignIf(result, "requiredTruck", findValue(sanitized, lines, [/(?:required\s*truck|req(?:uired)?\s*truck|truck\s*type|equipment)/i]));

  const puStart = firstDefined(
    pickupRange.start,
    resolveWithStart(pickupRange.start, pickupRange.rawStart),
    resolveWithStart(undefined, puSingleStart)
  );
  if (puStart) result.puStart = puStart;

  const puEnd = firstDefined(
    pickupRange.end,
    resolveWithStart(pickupRange.start, pickupRange.rawEnd),
    resolveWithStart(pickupRange.start ?? puStart, puSingleEnd)
  );
  if (puEnd) result.puEnd = puEnd;

  const delStart = firstDefined(
    deliveryRange.start,
    resolveWithStart(deliveryRange.start, deliveryRange.rawStart),
    resolveWithStart(undefined, delSingleStart)
  );
  if (delStart) result.delStart = delStart;

  const delEnd = firstDefined(
    deliveryRange.end,
    resolveWithStart(deliveryRange.start, deliveryRange.rawEnd),
    resolveWithStart(deliveryRange.start ?? delStart, delSingleEnd)
  );
  if (delEnd) result.delEnd = delEnd;

  assignIf(result, "notes", findValue(sanitized, lines, [/(?:notes?|comments?|instructions?)/i]));

  const contact = findValue(sanitized, lines, [/(?:contact|dispatcher|phone)/i]);
  if (contact) {
    const contactLine = `Contact: ${contact}`;
    result.notes = result.notes ? `${result.notes}\n${contactLine}` : contactLine;
  }

  return result;
}

type WindowParts = {
  start?: string;
  end?: string;
  rawStart?: string;
  rawEnd?: string;
};

function parseWindow(rawValue?: string | null): WindowParts {
  if (!rawValue) return {};
  const cleaned = clean(rawValue);
  if (!cleaned) return {};

  const normalized = cleaned.replace(/\s+to\s+/gi, " - ");

  let rawStart: string | undefined;
  let rawEnd: string | undefined;

  const spacedSeparator = /\s+(?:-|–|—)\s+/.exec(normalized);
  if (spacedSeparator) {
    rawStart = clean(normalized.slice(0, spacedSeparator.index));
    rawEnd = clean(normalized.slice(spacedSeparator.index + spacedSeparator[0].length));
  } else {
    const firstColon = normalized.indexOf(":");
    let hyphenIndex = firstColon >= 0 ? normalized.indexOf("-", firstColon) : -1;
    if (hyphenIndex < 0) {
      hyphenIndex = normalized.lastIndexOf("-");
    }
    if (hyphenIndex > 0 && hyphenIndex < normalized.length - 1) {
      rawStart = clean(normalized.slice(0, hyphenIndex));
      rawEnd = clean(normalized.slice(hyphenIndex + 1));
    }
  }

  if (!rawStart) {
    const start = normalizeDateTime(normalized);
    return { start, rawStart: normalized };
  }

  const start = normalizeDateTime(rawStart);
  let end = rawEnd ? normalizeDateTime(rawEnd) : undefined;
  if (!end && start && rawEnd) {
    end = combineDateAndTime(start, rawEnd);
  }

  return { start, end, rawStart, rawEnd };
}

function resolveWithStart(start: string | undefined, raw?: string | null) {
  if (!raw) return undefined;
  const normalized = normalizeDateTime(raw);
  if (normalized) return normalized;
  if (start) {
    return combineDateAndTime(start, raw);
  }
  return undefined;
}

function findValue(text: string, lines: string[], patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const inline = new RegExp(
      `(?:^|\n)\\s*(?:${pattern.source})(?:[^\\n]*?)\\s*[:\\-]\\s*([^\\n]+)`,
      "i"
    ).exec(text);
    if (inline) {
      const value = clean(inline[1]);
      if (value) return value;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    for (const pattern of patterns) {
      const exact = new RegExp(`^(?:${pattern.source})(?:\s*[:\-]\s*)?$`, "i");
      if (exact.test(line)) {
        const collected = collectFollowing(lines, i + 1);
        if (collected) return collected;
      }
    }
  }

  return undefined;
}

function collectFollowing(lines: string[], startIndex: number): string | undefined {
  const values: string[] = [];
  for (let j = startIndex; j < lines.length; j++) {
    const raw = lines[j];
    if (!raw) {
      if (values.length) break;
      continue;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      if (values.length) break;
      continue;
    }

    if (/:\s*$/.test(trimmed) && values.length === 0) {
      // Likely another label with no value; skip and continue searching.
      continue;
    }

    if (/:\s*/.test(trimmed) && values.length > 0) {
      break;
    }

    values.push(clean(trimmed));

    if (values.length >= 2) break;
  }

  if (values.length === 0) return undefined;
  return values.join(" ");
}

function normalizeText(text: string) {
  return (text || "")
    .replace(/\r/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\t/g, " ")
    .trim();
}

function normalizeDateTime(value?: string | null) {
  if (!value) return undefined;
  const cleaned = clean(value);
  if (!cleaned) return undefined;

  const isoFull = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})(?::\d{2})?(?:Z)?$/i);
  if (isoFull) {
    const [, year, month, day, hour, minute] = isoFull;
    return `${year}-${month}-${day}T${pad(hour)}:${minute}`;
  }

  const isoDateOnly = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly;
    return `${year}-${month}-${day}T00:00`;
  }

  const dashed = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (dashed) {
    const [, year, month, day, hour, minute] = dashed;
    return `${year}-${month}-${day}T${pad(hour)}:${minute}`;
  }

  const slash = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})$/);
  if (slash) {
    let [, month, day, year, hour, minute] = slash;
    const y = normalizeYear(year);
    return `${y}-${pad(month)}-${pad(day)}T${pad(hour)}:${minute}`;
  }

  return undefined;
}

function combineDateAndTime(start: string, rawTime?: string | null) {
  if (!rawTime) return undefined;
  const cleaned = clean(rawTime);
  if (!cleaned) return undefined;
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return undefined;
  let hour = Number(match[1]);
  let minute = match[2] ? Number(match[2]) : 0;
  const period = match[3]?.toLowerCase();

  if (Number.isNaN(hour) || Number.isNaN(minute)) return undefined;

  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  if (hour >= 24 || minute >= 60) return undefined;

  return `${start.split("T")[0]}T${pad(hour)}:${pad(minute)}`;
}

function normalizeYear(year: string) {
  const num = Number(year);
  if (num < 100) {
    return num + (num >= 70 ? 1900 : 2000);
  }
  return num;
}

function clean(value?: string | null) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function pad(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return num < 10 ? `0${num}` : String(num);
}

function assignIf(target: ParsedOrder, key: keyof ParsedOrder, value?: string) {
  if (value) target[key] = value;
}

function firstDefined<T>(...values: (T | undefined)[]) {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}
