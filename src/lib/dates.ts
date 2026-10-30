// Timezone-safe date helpers. Every report groups by the business's local
// calendar day (default Asia/Kolkata), never by the server's timezone.

export type RangeKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth";

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
  lastMonth: "Last month",
};

export function isRangeKey(v: unknown): v is RangeKey {
  return typeof v === "string" && v in RANGE_LABELS;
}

/** Local calendar day as YYYY-MM-DD in the given timezone. */
export function dayKey(date: Date | string, timeZone: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Shift a YYYY-MM-DD key by whole days (calendar arithmetic, no TZ drift). */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export interface DayRange {
  key: RangeKey;
  label: string;
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive YYYY-MM-DD
}

export function resolveRange(
  key: RangeKey,
  timeZone: string,
  now: Date = new Date(),
): DayRange {
  const today = dayKey(now, timeZone);
  const [y, m] = today.split("-").map(Number);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  let start = today;
  let end = today;
  switch (key) {
    case "today":
      break;
    case "yesterday":
      start = end = addDays(today, -1);
      break;
    case "last7":
      start = addDays(today, -6);
      break;
    case "last30":
      start = addDays(today, -29);
      break;
    case "thisMonth":
      start = monthStart;
      break;
    case "lastMonth": {
      end = addDays(monthStart, -1);
      start = end.slice(0, 8) + "01";
      break;
    }
  }
  return { key, label: RANGE_LABELS[key], start, end };
}

/** The equal-length period immediately before `range` (for "vs previous"). */
export function previousRange(range: DayRange): DayRange {
  if (range.key === "thisMonth" || range.key === "lastMonth") {
    const prevEnd = addDays(range.start, -1);
    return { ...range, start: prevEnd.slice(0, 8) + "01", end: prevEnd };
  }
  const len = daysBetween(range.start, range.end) + 1;
  return {
    ...range,
    start: addDays(range.start, -len),
    end: addDays(range.start, -1),
  };
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000,
  );
}

export function inRange(iso: string, range: DayRange, timeZone: string) {
  const k = dayKey(iso, timeZone);
  return k >= range.start && k <= range.end;
}

export function listDays(range: DayRange): string[] {
  const out: string[] = [];
  for (let k = range.start; k <= range.end; k = addDays(k, 1)) out.push(k);
  return out;
}
