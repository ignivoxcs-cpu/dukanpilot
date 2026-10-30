import { describe, expect, it } from "vitest";
import { parseIntent } from "@/lib/assistant/intents";
import { answerIntent } from "@/lib/assistant/answer";
import { buildDemoData } from "@/lib/demo-data";
import { summarize } from "@/lib/metrics";
import { resolveRange } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { waLink, waNumber } from "@/lib/whatsapp";

describe("intent parser — the 10 required commands", () => {
  const cases: [string, object][] = [
    ["What are my total sales today?", { type: "sales", range: "today" }],
    ["How much payment is outstanding?", { type: "outstanding" }],
    ["Show pending orders.", { type: "show_pending" }],
    ["Which products are selling the most?", { type: "top_products" }],
    ["Open my products.", { type: "navigate", page: "products" }],
    ["Open my customers.", { type: "navigate", page: "customers" }],
    ["Show this month's sales.", { type: "sales", range: "thisMonth" }],
    ["Compare this month with last month.", { type: "compare_months" }],
    ["How many orders are still pending?", { type: "pending_count" }],
    ["Show my low-stock products.", { type: "low_stock" }],
  ];
  for (const [q, expected] of cases)
    it(q, () => expect(parseIntent(q)).toMatchObject(expected));

  it("extra phrasings", () => {
    expect(parseIntent("sales yesterday")).toMatchObject({ type: "sales", range: "yesterday" });
    expect(parseIntent("go to settings")).toMatchObject({ type: "navigate", page: "settings" });
    expect(parseIntent("Open products")).toMatchObject({ type: "navigate", page: "products" });
    expect(parseIntent("payments received this week")).toMatchObject({ type: "received", range: "last7" });
    expect(parseIntent("tell me a joke")).toMatchObject({ type: "unknown" });
    expect(parseIntent("")).toMatchObject({ type: "unknown" });
  });
});

describe("assistant answers use real computed figures", () => {
  const now = new Date();
  const d = buildDemoData(now);
  it("sales today matches summarize()", () => {
    const s = summarize(d, resolveRange("today", d.business.timezone, now));
    const r = answerIntent({ type: "sales", range: "today" }, d, now);
    expect(r.metric?.value).toBe(formatINR(s.salesPaise));
    expect(r.text).toContain(formatINR(s.salesPaise));
    expect(r.definition).toBeTruthy();
    expect(r.period).toContain("Today");
  });
  it("show pending navigates with filter", () => {
    expect(answerIntent({ type: "show_pending" }, d, now).navigate).toBe("/orders?status=pending");
  });
  it("navigation", () => {
    expect(answerIntent({ type: "navigate", page: "customers" }, d, now).navigate).toBe("/customers");
  });
});

describe("whatsapp links", () => {
  it("normalises Indian numbers", () => {
    expect(waNumber("+91 98765 43210")).toBe("919876543210");
    expect(waNumber("09876543210")).toBe("919876543210");
    expect(waNumber("9876543210")).toBe("919876543210");
    expect(waNumber("123")).toBeNull();
  });
  it("encodes message text", () => {
    expect(waLink("9876543210", "Hi & ₹500\nThanks")).toBe(
      "https://wa.me/919876543210?text=Hi%20%26%20%E2%82%B9500%0AThanks",
    );
  });
});

import { toCSV } from "@/lib/csv";
describe("csv export", () => {
  it("escapes quotes/commas and neutralises formulas", () => {
    expect(toCSV([["a,b", 'say "hi"', "=SUM(A1)", 5]])).toBe('"a,b","say ""hi""",\'=SUM(A1),5');
  });
});
