export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

export function formatDateTimeRange(start?: Date | null, end?: Date | null) {
  const startText = formatDateTime(start);
  const endText = formatDateTime(end);
  if (startText && endText) return `${startText} – ${endText}`;
  return startText ?? endText ?? "Not scheduled";
}

export function formatDateTime(value?: Date | null) {
  if (!value) return undefined;
  try {
    return value.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value.toISOString();
  }
}

export function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export function formatCPM(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

export function formatMiles(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(0)} mi`;
}
