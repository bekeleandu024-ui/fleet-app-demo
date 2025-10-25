import { DateTime } from "luxon";

export type ConfidenceBadge = "success" | "warning" | "default";

export function confidenceToBadge(score?: number | null): ConfidenceBadge {
  if (typeof score !== "number") return "default";
  if (score >= 0.85) return "success";
  if (score < 0.6) return "warning";
  return "default";
}

export function formatConfidence(score?: number): string {
  if (typeof score !== "number") return "—";
  return `${Math.round(score * 100)}%`;
}

export function formatIsoForDisplay(iso?: string | null, options: { timeZone?: string } = {}): string {
  if (!iso) return "";
  const dt = DateTime.fromISO(iso, { setZone: true, zone: options.timeZone });
  if (!dt.isValid) return iso;
  return dt.toFormat("LLL dd, yyyy HH:mm", { timeZone: options.timeZone });
}
