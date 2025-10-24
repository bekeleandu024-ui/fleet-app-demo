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

type TabularFieldKey =
  | keyof ParsedOrder
  | "puRange"
  | "delRange";

type TabularHints = Partial<
  Pick<
    ParsedOrder,
    "customer" | "origin" | "destination" | "requiredTruck" | "notes" | "puStart" | "puEnd" | "delStart" | "delEnd"
  >
> & {
  puRange?: string;
  delRange?: string;
};

export function parseOcrToOrder(rawText: string): ParsedOrder {
  const sanitized = normalizeText(rawText);
  const lines = sanitized.split("\n").map(line => line.trim());

  const tabularHints = extractTabularHints(lines);

  const pickupWindowRaw =
    tabularHints.puRange ??
    findValue(sanitized, lines, [/(?:pickup|pu)\s*(?:window|time|availability)/i]) ??
    findLooseValue(lines, [/(?:pickup|pu)\s*(?:window|time|availability)/i]);
  const deliveryWindowRaw =
    tabularHints.delRange ??
    findValue(sanitized, lines, [/(?:delivery|del)\s*(?:window|time|availability)/i]) ??
    findLooseValue(lines, [/(?:delivery|del)\s*(?:window|time|availability)/i]);

  const puSingleStart =
    tabularHints.puStart ??
    findValue(sanitized, lines, [/(?:pickup|pu)\s*(?:window\s*)?(?:start|open|from)/i]) ??
    findLooseValue(lines, [/(?:pickup|pu)\s*(?:window\s*)?(?:start|open|from)/i]);
  const puSingleEnd =
    tabularHints.puEnd ??
    findValue(sanitized, lines, [/(?:pickup|pu)\s*(?:window\s*)?(?:end|close|by)/i]) ??
    findLooseValue(lines, [/(?:pickup|pu)\s*(?:window\s*)?(?:end|close|by)/i]);
  const delSingleStart =
    tabularHints.delStart ??
    findValue(sanitized, lines, [/(?:delivery|del)\s*(?:window\s*)?(?:start|open|from)/i]) ??
    findLooseValue(lines, [/(?:delivery|del)\s*(?:window\s*)?(?:start|open|from)/i]);
  const delSingleEnd =
    tabularHints.delEnd ??
    findValue(sanitized, lines, [/(?:delivery|del)\s*(?:window\s*)?(?:end|close|by)/i]) ??
    findLooseValue(lines, [/(?:delivery|del)\s*(?:window\s*)?(?:end|close|by)/i]);

  const pickupRange = parseWindow(pickupWindowRaw);
  const deliveryRange = parseWindow(deliveryWindowRaw);

  const result: ParsedOrder = {};

  assignIf(
    result,
    "customer",
    firstDefined(
      tabularHints.customer,
      findValue(sanitized, lines, [/(?:customer|consignee|client|shipper)/i]),
      findLooseValue(lines, [/(?:customer|consignee|client|shipper)/i])
    )
  );
  assignIf(
    result,
    "origin",
    firstDefined(
      tabularHints.origin,
      findValue(sanitized, lines, [/(?:pickup(?!\s*(?:window|time))[^:\n]*?(?:origin|location)?[^:\n]*?(?:address)?|origin[^:\n]*?(?:address|location)?)/i]),
      findLooseValue(lines, [/(?:origin|pickup\s*(?:location|address)|ship\s*from)/i])
    )
  );
  assignIf(
    result,
    "destination",
    firstDefined(
      tabularHints.destination,
      findValue(sanitized, lines, [/(?:delivery(?!\s*(?:window|time))[^:\n]*?(?:destination|location)?[^:\n]*?(?:address)?|destination[^:\n]*?(?:address|location)?)/i]),
      findLooseValue(lines, [/(?:destination|delivery\s*(?:location|address)|ship\s*to)/i])
    )
  );
  assignIf(
    result,
    "requiredTruck",
    firstDefined(
      tabularHints.requiredTruck,
      findValue(sanitized, lines, [/(?:required\s*truck|req(?:uired)?\s*truck|truck\s*type|equipment|equip\.?)/i]),
      findLooseValue(lines, [/(?:truck\s*type|equipment|trailer|equip\.?)/i])
    )
  );

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

  assignIf(
    result,
    "notes",
    firstDefined(
      tabularHints.notes,
      findValue(sanitized, lines, [/(?:notes?|comments?|instructions?)/i]),
      findLooseValue(lines, [/(?:notes?|comments?|instructions?)/i])
    )
  );

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

function extractTabularHints(lines: string[]): TabularHints {
  const hints: TabularHints = {};

  for (let i = 0; i < lines.length; i++) {
    const headerLine = clean(lines[i]);
    if (!headerLine) continue;

    const headerColumns = splitColumns(headerLine);
    if (headerColumns.length < 2) continue;

    const matches = headerColumns
      .map((col, index) => {
        const key = matchTabularField(col);
        return key ? { key, index } : null;
      })
      .filter((entry): entry is { key: TabularFieldKey; index: number } => entry !== null);

    if (matches.length === 0) continue;

    const unresolved = () => matches.filter(m => getHint(hints, m.key) === undefined);
    if (unresolved().length === 0) continue;

    for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
      const rowLine = clean(lines[j]);
      if (!rowLine) continue;
      const rowColumns = splitColumns(rowLine);
      if (rowColumns.length === 0) continue;

      let foundAny = false;
      for (const { key, index } of matches) {
        if (getHint(hints, key) !== undefined) continue;
        const value = rowColumns[index] ?? rowColumns[rowColumns.length - 1];
        const cleaned = clean(value);
        if (!cleaned) continue;

        setHint(hints, key, cleaned);
        foundAny = true;
      }

      if (!foundAny) continue;
      if (unresolved().length === 0) break;
    }
  }

  return hints;
}

function findLooseValue(lines: string[], patterns: RegExp[]): string | undefined {
  for (const rawLine of lines) {
    if (!rawLine) continue;
    const line = clean(rawLine);
    if (!line) continue;

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const inline = pattern.exec(line);
      if (inline) {
        const after = clean(line.slice((inline.index ?? 0) + inline[0].length));
        if (after) return after.replace(/^[\-:]+\s*/, "");
      }

      const columns = splitColumns(line);
      for (let i = 0; i < columns.length; i++) {
        pattern.lastIndex = 0;
        if (pattern.test(columns[i])) {
          const next = columns[i + 1];
          if (next) {
            const cleaned = clean(next);
            if (cleaned) return cleaned;
          }
        }
      }
    }
  }

  return undefined;
}

const TABULAR_SYNONYMS: Record<TabularFieldKey, RegExp[]> = {
  customer: [/(?:^|\s)(?:customer|client|consignee|shipper)(?:\s|$)/i],
  origin: [/(?:^|\s)(?:origin|pickup(?:\s*(?:city|location|address))?|ship\s*from)(?:\s|$)/i],
  destination: [/(?:^|\s)(?:destination|delivery(?:\s*(?:city|location|address))?|ship\s*to)(?:\s|$)/i],
  requiredTruck: [/(?:truck|equip(?:ment)?|trailer|units?)/i],
  notes: [/(?:notes?|comments?|instructions?)/i],
  puStart: [/(?:pu|pickup)[^a-zA-Z]*(?:start|from|open)/i],
  puEnd: [/(?:pu|pickup)[^a-zA-Z]*(?:end|to|close|by)/i],
  delStart: [/(?:del|delivery)[^a-zA-Z]*(?:start|from|open)/i],
  delEnd: [/(?:del|delivery)[^a-zA-Z]*(?:end|to|close|by)/i],
  puRange: [/(?:pu|pickup)[^a-zA-Z]*(?:window|availability)/i],
  delRange: [/(?:del|delivery)[^a-zA-Z]*(?:window|availability)/i],
};

function matchTabularField(value: string): TabularFieldKey | null {
  const cleaned = value.toLowerCase();
  for (const key of Object.keys(TABULAR_SYNONYMS) as TabularFieldKey[]) {
    const patterns = TABULAR_SYNONYMS[key];
    if (patterns.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(cleaned);
    })) {
      return key;
    }
  }
  return null;
}

function splitColumns(line: string): string[] {
  if (!line) return [];
  const cleaned = line.replace(/\|/g, " ");
  const columns = cleaned.split(/\s{2,}|\t+/).map(part => clean(part));
  return columns.filter(Boolean);
}

function getHint(hints: TabularHints, key: TabularFieldKey) {
  return hints[key as keyof TabularHints];
}

function setHint(hints: TabularHints, key: TabularFieldKey, value: string) {
  (hints as Record<string, string>)[key] = value;
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

  const slashAmPm = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (slashAmPm) {
    let [, month, day, year, hour, minute, period] = slashAmPm;
    const y = normalizeYear(year);
    let hr = Number(hour);
    const min = minute ? Number(minute) : 0;
    const per = period.toLowerCase();
    if (per === "pm" && hr < 12) hr += 12;
    if (per === "am" && hr === 12) hr = 0;
    return `${y}-${pad(month)}-${pad(day)}T${pad(hr)}:${pad(min)}`;
  }

  const dashDate = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/i);
  if (dashDate) {
    let [, month, day, year, hour, minute, period] = dashDate;
    const y = normalizeYear(year);
    if (hour) {
      let hr = Number(hour);
      const min = minute ? Number(minute) : 0;
      const per = period ? period.toLowerCase() : undefined;
      if (per === "pm" && hr < 12) hr += 12;
      if (per === "am" && hr === 12) hr = 0;
      return `${y}-${pad(month)}-${pad(day)}T${pad(hr)}:${pad(min)}`;
    }
    return `${y}-${pad(month)}-${pad(day)}T00:00`;
  }

  const monthName = cleaned.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(\d{2,4})(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/i
  );
  if (monthName) {
    const [, month, day, year, hour, minute, period] = monthName;
    const monthIndex = monthNameToNumber(month);
    const y = normalizeYear(year);
    let hr = hour ? Number(hour) : 0;
    const min = minute ? Number(minute) : 0;
    if (period) {
      const per = period.toLowerCase();
      if (per === "pm" && hr < 12) hr += 12;
      if (per === "am" && hr === 12) hr = 0;
    }
    return `${y}-${pad(monthIndex)}-${pad(day)}T${pad(hr)}:${pad(min)}`;
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

function monthNameToNumber(value: string) {
  const normalized = value.slice(0, 3).toLowerCase();
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const index = months.indexOf(normalized);
  return index >= 0 ? index + 1 : 1;
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
