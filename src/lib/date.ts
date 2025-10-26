import { format } from "date-fns";

export function formatYMD(date: Date | string | null): string {
  if (!date) {
    return "-";
  }

  const value = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return format(value, "yyyy-MM-dd");
}
