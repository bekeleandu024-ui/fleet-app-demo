export type ParsedOrder = {
  customer?: string;
  origin?: string;
  destination?: string;
  puWindowStart?: string;  // ISO or plain text if we can’t parse
  puWindowEnd?: string;
  delWindowStart?: string;
  delWindowEnd?: string;
  requiredTruck?: string;
  notes?: string;
};

export function parseOrderFromText(raw: string): ParsedOrder {
  const text = normalize(raw);

  // Simple line-based extraction
  const get = (label: string) => {
    const m = new RegExp(String.raw`${label}\s*[:\-]\s*(.+)`, "i").exec(text);
    return m?.[1]?.trim();
  };

  const customer = get("(?:customer|consignee|client)");
  const origin = get("(?:origin|pickup\\s*addr(?:ess)?)");
  const destination = get("(?:destination|delivery\\s*addr(?:ess)?)");
  const requiredTruck = get("(?:truck\\s*type|equipment|req(?:uired)?\\s*truck)");
  const puStartSingle = get("(?:pickup|pu)\\s*(?:window\\s*)?(?:start|open|from)");
  const puEndSingle = get("(?:pickup|pu)\\s*(?:window\\s*)?(?:end|close|by)");
  const delStartSingle = get("(?:delivery|del)\\s*(?:window\\s*)?(?:start|open|from)");
  const delEndSingle = get("(?:delivery|del)\\s*(?:window\\s*)?(?:end|close|by)");

  // Time window heuristics (pickup/delivery)
  // Try formats like: "Pickup Window: 2025-10-22 09:00–11:00" or "PU: 10/22 09:00-11:00"
  const pu = matchWindow(text, /(pickup|pu)[^\n]*?(window|time)?/i);
  const del = matchWindow(text, /(delivery|del)[^\n]*?(window|time)?/i);

  // Fallback: sometimes dates appear on separate lines
  const puLine = lineAfter(text, /(pickup|pu)/i);
  const delLine = lineAfter(text, /(delivery|del)/i);

  const puLineRange = parseDateRange(puLine);
  const delLineRange = parseDateRange(delLine);

  const res: ParsedOrder = {
    customer,
    origin,
    destination,
    requiredTruck,
    puWindowStart: firstDefined(
      pu?.start,
      puLineRange?.start,
      toIsoOrRawMaybe(puStartSingle)
    ),
    puWindowEnd: firstDefined(
      pu?.end,
      puLineRange?.end,
      toIsoOrRawMaybe(puEndSingle)
    ),
    delWindowStart: firstDefined(
      del?.start,
      delLineRange?.start,
      toIsoOrRawMaybe(delStartSingle)
    ),
    delWindowEnd: firstDefined(
      del?.end,
      delLineRange?.end,
      toIsoOrRawMaybe(delEndSingle)
    ),
  };

  // Scoot leftover lines into notes if they look useful
  const interesting = collectNotes(text, res);
  if (interesting) res.notes = interesting;

  return res;
}

function normalize(s: string) {
  // Normalize bullets and whitespace
  return s.replace(/\r/g, "").replace(/\t/g, " ").replace(/[\u2022\u00b7]/g, "-");
}

// Find the next non-empty line after a label
function lineAfter(text: string, label: RegExp) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (label.test(lines[i])) {
      // return next non-empty
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) return lines[j].trim();
      }
    }
  }
  return undefined;
}

// Try to capture "label: <date/time> - <date/time>"
function matchWindow(text: string, label: RegExp) {
  const re = new RegExp(
    String.raw`${label.source}.*?[:\-]\s*([0-9A-Za-z\/:.\s\-]+?)\s*(?:–|-)\s*([0-9A-Za-z\/:.\s\-]+)`,
    "i"
  );
  const m = re.exec(text);
  if (!m) return undefined;
  const start = toIsoOrRaw(m[1].trim());
  const end = toIsoOrRaw(m[2].trim());
  return { start, end };
}

function parseDateRange(line?: string) {
  if (!line) return undefined;
  // Basic "date time - time" or "date time - date time"
  const re = /([0-9A-Za-z\/:.\s]+?)\s*(?:–|-)\s*([0-9A-Za-z\/:.\s]+)/;
  const m = re.exec(line);
  if (!m) return undefined;
  return { start: toIsoOrRaw(m[1].trim()), end: toIsoOrRaw(m[2].trim()) };
}

function toIsoOrRaw(s: string) {
  // Try to parse into a Date; if invalid, return original string
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  // Try MM/DD hh:mm pattern with today's/this year fallback is complex — keep raw if unsure
  return s;
}

function toIsoOrRawMaybe(s?: string | null) {
  if (!s) return undefined;
  return toIsoOrRaw(s);
}

function firstDefined<T>(...values: (T | undefined)[]) {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function collectNotes(text: string, res: ParsedOrder) {
  // Drop lines we’ve already consumed; keep remaining “hints” under 600 chars
  const used = [
    res.customer, res.origin, res.destination, res.requiredTruck,
    res.puWindowStart, res.puWindowEnd, res.delWindowStart, res.delWindowEnd
  ].filter(Boolean) as string[];

  const lines = text.split("\n").map(x=>x.trim()).filter(Boolean);
  const keep = lines.filter(l =>
    !used.some(u => l.includes(u)) &&
    !/^(customer|origin|destination|pickup|delivery|pu|del|equipment|truck)/i.test(l)
  );
  const notes = keep.join(" | ");
  return notes.slice(0, 600) || undefined;
}
