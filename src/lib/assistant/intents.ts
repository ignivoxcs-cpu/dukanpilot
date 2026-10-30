// DukaanPilot AI — deterministic intent parser. No external AI service, no
// generated SQL: text is mapped to a fixed set of intents with validated
// parameters, and each intent is answered by a tested metric function.

import type { RangeKey } from "../dates";

export type Page =
  | "dashboard"
  | "products"
  | "orders"
  | "customers"
  | "payments"
  | "storefront"
  | "reports"
  | "settings";

export type Intent =
  | { type: "sales"; range: RangeKey }
  | { type: "orders_count"; range: RangeKey }
  | { type: "received"; range: RangeKey }
  | { type: "outstanding" }
  | { type: "pending_count" }
  | { type: "show_pending" }
  | { type: "top_products"; range: RangeKey }
  | { type: "low_stock" }
  | { type: "compare_months" }
  | { type: "customers_count" }
  | { type: "navigate"; page: Page }
  | { type: "help" }
  | { type: "unknown" };

export function parseRange(t: string, fallback: RangeKey): RangeKey {
  if (/\byesterday\b/.test(t)) return "yesterday";
  if (/\blast month\b|\bprevious month\b/.test(t)) return "lastMonth";
  if (/\bthis month\b|\bmonth'?s\b|\bmonthly\b/.test(t)) return "thisMonth";
  if (/\blast 30\b|\b30 days\b/.test(t)) return "last30";
  if (/\bthis week\b|\blast 7\b|\b7 days\b|\bweek'?s?\b/.test(t)) return "last7";
  if (/\btoday\b|\btoday'?s\b/.test(t)) return "today";
  return fallback;
}

const PAGE_WORDS: [RegExp, Page][] = [
  [/\bdashboard\b|\bhome\b/, "dashboard"],
  [/\bproducts?\b|\bcatalog(ue)?\b|\binventory\b/, "products"],
  [/\borders?\b/, "orders"],
  [/\bcustomers?\b|\bclients?\b/, "customers"],
  [/\bpayments?\b/, "payments"],
  [/\bstore ?front\b|\bstore\b|\bshop\b/, "storefront"],
  [/\breports?\b/, "reports"],
  [/\bsettings?\b|\bprofile\b/, "settings"],
];

export function parseIntent(input: string): Intent {
  const t = input
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return { type: "unknown" };

  if (/^(help|what can you do|hi|hello|hey)\b/.test(t)) return { type: "help" };

  if (/\bcompare\b|\bvs\b|\bversus\b/.test(t) && /\bmonth\b/.test(t))
    return { type: "compare_months" };

  if (/\blow ?stock\b|\bout of stock\b|\brunning low\b|\brestock\b/.test(t))
    return { type: "low_stock" };

  if (
    /\b(best|top|most)\b/.test(t) &&
    /\b(sell|selling|seller|sellers|sold|products?|items?|popular)\b/.test(t)
  )
    return { type: "top_products", range: parseRange(t, "thisMonth") };

  if (/\boutstanding\b|\bdue\b|\bunpaid\b|\bowe[ds]?\b|\bbalance\b/.test(t))
    return { type: "outstanding" };

  if (/\bpending\b/.test(t) && /\borders?\b/.test(t)) {
    if (/\bhow many\b|\bcount\b|\bnumber of\b|\bstill\b/.test(t))
      return { type: "pending_count" };
    return { type: "show_pending" };
  }

  if (/\b(received|collected|got paid|payments? received)\b/.test(t))
    return { type: "received", range: parseRange(t, "today") };

  if (/\bsales?\b|\brevenue\b|\bearn(ed|ings)?\b|\bincome\b|\bsold\b/.test(t))
    return { type: "sales", range: parseRange(t, "today") };

  if (/\bhow many\b/.test(t) && /\borders?\b/.test(t))
    return { type: "orders_count", range: parseRange(t, "today") };

  if (/\bhow many\b/.test(t) && /\bcustomers?\b/.test(t))
    return { type: "customers_count" };

  if (/\b(open|go to|goto|show|take me to|navigate to|view)\b/.test(t)) {
    for (const [re, page] of PAGE_WORDS) if (re.test(t)) return { type: "navigate", page };
  }
  // Bare page name ("products", "my customers")
  for (const [re, page] of PAGE_WORDS)
    if (re.test(t) && t.split(" ").length <= 3) return { type: "navigate", page };

  return { type: "unknown" };
}
