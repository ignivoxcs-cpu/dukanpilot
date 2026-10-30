const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format paise as ₹ with Indian digit grouping: ₹1,25,000 or ₹17,268.50. */
export function formatINR(paise: number): string {
  return (paise % 100 === 0 ? inrWhole : inrPaise).format(paise / 100);
}

export function formatCompactINR(paise: number): string {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return `₹${Math.round(r)}`;
}

export function orderCode(n: number) {
  return `#DP${n}`;
}

export function formatDay(key: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(key + "T12:00:00Z").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...opts,
  });
}

export function formatDateTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 100);
}
