import { DateTime } from "luxon";
import { parse as chronoParse } from "chrono-node";
import { LABEL_SYNONYMS, type CanonicalLabel, normalizeLabel } from "./labels";
import { sanitizeFields } from "./schema";
import type {
  FieldConfidenceMap,
  OCRLine,
  ParsedResult,
  PartialOrderFields,
  OrderFields,
} from "./types";

export type ParseOptions = {
  tz?: string;
  locale?: string;
};

export type TokenizedLine = {
  text: string;
  confidence: number;
  index: number;
};

const lineConfidenceFloor = 0.45;

const normalizedSynonyms: Record<string, { key: CanonicalLabel; canonical: boolean }> = (() => {
  const map: Record<string, { key: CanonicalLabel; canonical: boolean }> = {};
  for (const [key, synonyms] of Object.entries(LABEL_SYNONYMS) as [CanonicalLabel, string[]][]) {
    synonyms.forEach((label, index) => {
      map[normalizeLabel(label)] = { key, canonical: index === 0 };
    });
  }
  return map;
})();

function levenshteinRatio(a: string, b: string) {
  if (a === b) return 1;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  const distance = matrix[a.length][b.length];
  return 1 - distance / Math.max(a.length, b.length, 1);
}

function resolveLabel(label: string): { key: CanonicalLabel; score: number } | null {
  const normalized = normalizeLabel(label);
  if (!normalized) return null;
  const direct = normalizedSynonyms[normalized];
  if (direct) {
    return { key: direct.key, score: direct.canonical ? 1 : 0.92 };
  }
  let best: { key: CanonicalLabel; score: number } | null = null;
  for (const [key, synonyms] of Object.entries(LABEL_SYNONYMS) as [CanonicalLabel, string[]][]) {
    for (const synonym of synonyms) {
      const ratio = levenshteinRatio(normalized, normalizeLabel(synonym));
      if (ratio >= 0.8 && (!best || ratio > best.score)) {
        best = { key, score: 0.75 + ratio * 0.25 };
      }
    }
  }
  return best;
}

function detectLabelValue(text: string): { label: string; value: string } | null {
  const colon = text.match(/^(?<label>[\w\s\/#&\-']{2,40})\s*[:|]\s*(?<value>.+)$/i);
  if (colon?.groups) {
    return { label: colon.groups.label.trim(), value: colon.groups.value.trim() };
  }
  const tab = text.split(/\t+/);
  if (tab.length >= 2) {
    return { label: tab[0].trim(), value: tab.slice(1).join(" ").trim() };
  }
  const columns = text.split(/\s{2,}/);
  if (columns.length >= 2) {
    return { label: columns[0].trim(), value: columns.slice(1).join(" ").trim() };
  }
  return null;
}

function tokenizeLines(text: string, lines: OCRLine[]): TokenizedLine[] {
  const fallback = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const tokens: TokenizedLine[] = [];
  const max = Math.max(fallback.length, lines.length);
  for (let i = 0; i < max; i++) {
    const fromLine = lines[i]?.text?.trim();
    const lineConfidence = lines[i]?.confidence ?? 0;
    if (fromLine) {
      tokens.push({ text: fromLine, confidence: Math.max(lineConfidence / 100, lineConfidenceFloor), index: tokens.length });
      continue;
    }
    const fallbackText = fallback[i];
    if (fallbackText) {
      tokens.push({ text: fallbackText, confidence: 0.6, index: tokens.length });
    }
  }
  return tokens.filter(token => token.text.length > 0);
}

function convertToIso(date: Date, tz?: string) {
  const dt = DateTime.fromJSDate(date, { zone: tz ?? undefined });
  const zoned = tz ? dt.setZone(tz) : dt;
  return zoned.isValid ? zoned.toISO() : dt.toISO();
}

function parseTemporalValue(value: string, options: ParseOptions) {
  const results = chronoParse(value, new Date(), { timezone: options.tz });
  if (!results.length) return { start: null, end: null };
  const first = results[0];
  const start = first.start ? convertToIso(first.start.date(), options.tz) : null;
  const end = first.end ? convertToIso(first.end.date(), options.tz) : null;
  return { start, end };
}

function normalizeNotes(text: string) {
  return text
    .split(/\n+/)
    .map(part => part.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000);
}

function shouldTreatAsRange(label: CanonicalLabel, value: string) {
  if (!value) return false;
  if (/[\-–]/.test(value) && /\d/.test(value)) return true;
  if (label.includes("Window")) return true;
  return false;
}

export function parseOrderFromOCR(
  structured: { text: string; lines: OCRLine[] },
  options: ParseOptions = {},
): ParsedResult {
  const tokens = tokenizeLines(structured.text, structured.lines ?? []);
  const raw: Partial<Record<keyof OrderFields, unknown>> = {};
  const confidence: FieldConfidenceMap = {};
  const consumed = new Set<number>();

  const assignField = (key: CanonicalLabel, value: unknown, score: number) => {
    if (value === undefined || value === null) return;
    const previous = confidence[key] ?? 0;
    if (previous >= score) return;
    raw[key] = value;
    confidence[key] = Math.min(1, score);
  };

  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;
    const token = tokens[i];
    const detection = detectLabelValue(token.text);
    if (!detection) continue;
    const match = resolveLabel(detection.label);
    if (!match) continue;

    let value = detection.value;
    if (!value && tokens[i + 1]) {
      value = tokens[i + 1].text;
      consumed.add(i + 1);
    }

    const score = Math.max(lineConfidenceFloor, token.confidence) * match.score;
    if (match.key === "notes") {
      const block: string[] = [];
      if (value) block.push(value);
      let cursor = i + 1;
      while (tokens[cursor] && !detectLabelValue(tokens[cursor].text)) {
        block.push(tokens[cursor].text);
        consumed.add(cursor);
        cursor++;
        if (block.join("\n").length > 2000) break;
      }
      const notesValue = normalizeNotes(block.join("\n"));
      if (notesValue) {
        assignField("notes", notesValue, score);
      }
      continue;
    }

    if (match.key === "puWindowStart" || match.key === "puWindowEnd" || match.key === "delWindowStart" || match.key === "delWindowEnd") {
      const { start, end } = shouldTreatAsRange(match.key, value)
        ? parseTemporalValue(value, options)
        : parseTemporalValue(value, options);
      if (start) {
        const startKey = match.key === "puWindowEnd" || match.key === "delWindowEnd" ? match.key.replace("End", "Start") : match.key;
        assignField(startKey as CanonicalLabel, start, score);
      }
      if (end) {
        const endKey = match.key === "puWindowStart" || match.key === "delWindowStart" ? (match.key.replace("Start", "End") as CanonicalLabel) : match.key;
        assignField(endKey, end, score * 0.96);
      }
      if (!start && !end && value) {
        assignField(match.key, value, score * 0.5);
      }
      continue;
    }

    if (match.key === "requiredTruck") {
      assignField("requiredTruck", value, score);
      continue;
    }

    if (match.key === "customer" || match.key === "origin" || match.key === "destination") {
      assignField(match.key, value, score);
      continue;
    }
  }

  const { fields, warnings } = sanitizeFields(raw);
  const filteredConfidence: FieldConfidenceMap = {};
  for (const key of Object.keys(fields) as (keyof OrderFields)[]) {
    filteredConfidence[key] = confidence[key] ?? 0.5;
  }

  return {
    fields: fields as PartialOrderFields,
    confidence: filteredConfidence,
    warnings,
  };
}
