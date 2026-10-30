// Turns a parsed intent into an answer using real computed metrics.
// Every financial number here comes from lib/metrics — never invented.

import { type DayRange, resolveRange, previousRange, RANGE_LABELS } from "../dates";
import { formatINR, pctChange } from "../format";
import {
  METRIC_DEFINITIONS,
  lowStock,
  summarize,
  topProducts,
} from "../metrics";
import type { BusinessData } from "../types";
import type { Intent, Page } from "./intents";

export interface AssistantAction {
  label: string;
  href: string;
}

export interface AssistantReply {
  intent: Intent["type"];
  text: string;
  /** Short spoken version (no definitions). */
  speech: string;
  /** Explains period + metric definition, shown under the answer. */
  definition?: string;
  period?: string;
  metric?: { label: string; value: string; change?: number | null };
  navigate?: string;
  actions: AssistantAction[];
}

export const PAGE_PATHS: Record<Page, string> = {
  dashboard: "/dashboard",
  products: "/products",
  orders: "/orders",
  customers: "/customers",
  payments: "/payments",
  storefront: "/storefront",
  reports: "/reports",
  settings: "/settings",
};

const PAGE_LABELS: Record<Page, string> = {
  dashboard: "Dashboard",
  products: "Products",
  orders: "Orders",
  customers: "Customers",
  payments: "Payments",
  storefront: "Storefront",
  reports: "Reports",
  settings: "Settings",
};

export const SUGGESTIONS = [
  "What are my total sales today?",
  "How much payment is outstanding?",
  "Show pending orders",
  "Which products are selling the most?",
  "Compare this month with last month",
  "Show my low-stock products",
];

function periodText(r: DayRange) {
  return r.start === r.end ? `${r.label} (${r.start})` : `${r.label} (${r.start} to ${r.end})`;
}

export function answerIntent(
  intent: Intent,
  data: BusinessData,
  now: Date = new Date(),
): AssistantReply {
  const tz = data.business.timezone;
  const R = (k: Parameters<typeof resolveRange>[0]) => resolveRange(k, tz, now);

  switch (intent.type) {
    case "sales": {
      const r = R(intent.range);
      const s = summarize(data, r);
      const prev = summarize(data, previousRange(r));
      const change = pctChange(s.salesPaise, prev.salesPaise);
      const label = RANGE_LABELS[intent.range].toLowerCase();
      const cmp =
        change === null ? "" : ` That's ${Math.abs(change)}% ${change >= 0 ? "higher" : "lower"} than the previous period.`;
      return {
        intent: intent.type,
        text: `You've recorded ${formatINR(s.salesPaise)} in sales ${label === "today" ? "today" : `for ${label}`} from ${s.orders} order${s.orders === 1 ? "" : "s"}.${cmp}`,
        speech: `Sales ${label}: ${formatINR(s.salesPaise)} from ${s.orders} orders.`,
        definition: METRIC_DEFINITIONS.sales,
        period: periodText(r),
        metric: { label: `Total sales · ${RANGE_LABELS[intent.range]}`, value: formatINR(s.salesPaise), change },
        actions: [
          { label: "View orders", href: "/orders" },
          { label: "Open reports", href: `/reports?range=${intent.range}` },
        ],
      };
    }
    case "orders_count": {
      const r = R(intent.range);
      const s = summarize(data, r);
      return {
        intent: intent.type,
        text: `You have ${s.orders} order${s.orders === 1 ? "" : "s"} for ${RANGE_LABELS[intent.range].toLowerCase()}${s.cancelled ? ` (plus ${s.cancelled} cancelled, not counted)` : ""}.`,
        speech: `${s.orders} orders ${RANGE_LABELS[intent.range].toLowerCase()}.`,
        definition: METRIC_DEFINITIONS.orders,
        period: periodText(r),
        metric: { label: "Orders", value: String(s.orders) },
        actions: [{ label: "View orders", href: "/orders" }],
      };
    }
    case "received": {
      const r = R(intent.range);
      const s = summarize(data, r);
      return {
        intent: intent.type,
        text: `Payments recorded for ${RANGE_LABELS[intent.range].toLowerCase()}: ${formatINR(s.receivedPaise)} (net of refunds).`,
        speech: `${formatINR(s.receivedPaise)} received ${RANGE_LABELS[intent.range].toLowerCase()}.`,
        definition: METRIC_DEFINITIONS.received,
        period: periodText(r),
        metric: { label: "Payments received", value: formatINR(s.receivedPaise) },
        actions: [{ label: "Open payments", href: "/payments" }],
      };
    }
    case "outstanding": {
      const s = summarize(data, R("today"));
      return {
        intent: intent.type,
        text:
          s.outstandingPaise === 0
            ? "Nothing is outstanding — every active order is fully paid."
            : `${formatINR(s.outstandingPaise)} is still outstanding across your active orders.`,
        speech: `${formatINR(s.outstandingPaise)} outstanding.`,
        definition: METRIC_DEFINITIONS.outstanding,
        period: "As of now",
        metric: { label: "Outstanding balance", value: formatINR(s.outstandingPaise) },
        actions: [{ label: "View unpaid", href: "/payments?status=due" }],
      };
    }
    case "pending_count":
    case "show_pending": {
      const s = summarize(data, R("today"));
      return {
        intent: intent.type,
        text: `You have ${s.pendingOrders} pending order${s.pendingOrders === 1 ? "" : "s"}.${intent.type === "show_pending" ? " Opening them now." : ""}`,
        speech: `${s.pendingOrders} pending orders.`,
        definition: METRIC_DEFINITIONS.pending,
        period: "As of now",
        metric: { label: "Pending orders", value: String(s.pendingOrders) },
        navigate: intent.type === "show_pending" ? "/orders?status=pending" : undefined,
        actions: [{ label: "Show pending orders", href: "/orders?status=pending" }],
      };
    }
    case "top_products": {
      const r = R(intent.range);
      const top = topProducts(data, r, 3);
      if (!top.length)
        return {
          intent: intent.type,
          text: `No products have been sold for ${RANGE_LABELS[intent.range].toLowerCase()} yet.`,
          speech: "No sales yet for that period.",
          period: periodText(r),
          actions: [{ label: "Open products", href: "/products" }],
        };
      const list = top.map((p, i) => `${i + 1}. ${p.name} — ${p.units} sold (${formatINR(p.revenuePaise)})`).join("\n");
      return {
        intent: intent.type,
        text: `Your best sellers for ${RANGE_LABELS[intent.range].toLowerCase()}:\n${list}`,
        speech: `Your best seller is ${top[0]!.name}, with ${top[0]!.units} sold.`,
        definition: "Ranked by units sold on non-cancelled orders; revenue is after discounts.",
        period: periodText(r),
        actions: [{ label: "Product report", href: `/reports?range=${intent.range}` }],
      };
    }
    case "low_stock": {
      const t = data.business.lowStockThreshold;
      const items = lowStock(data.products, t);
      return {
        intent: intent.type,
        text: items.length
          ? `${items.length} product${items.length === 1 ? " is" : "s are"} at or below ${t} in stock:\n${items.map((p) => `• ${p.name} — ${p.stock === 0 ? "out of stock" : `${p.stock} left`}`).join("\n")}`
          : `All active products have more than ${t} in stock.`,
        speech: items.length ? `${items.length} products are running low.` : "No products are low on stock.",
        definition: `Low stock means ${t} or fewer units (change this in Settings).`,
        period: "As of now",
        navigate: "/products?stock=low",
        actions: [{ label: "Show low-stock products", href: "/products?stock=low" }],
      };
    }
    case "compare_months": {
      const a = summarize(data, R("thisMonth"));
      const b = summarize(data, R("lastMonth"));
      const change = pctChange(a.salesPaise, b.salesPaise);
      return {
        intent: intent.type,
        text: `This month so far: ${formatINR(a.salesPaise)} from ${a.orders} orders.\nLast month: ${formatINR(b.salesPaise)} from ${b.orders} orders.${change === null ? "" : `\nThat's ${Math.abs(change)}% ${change >= 0 ? "ahead of" : "behind"} last month's full total.`}`,
        speech: `This month ${formatINR(a.salesPaise)}, last month ${formatINR(b.salesPaise)}.`,
        definition: `${METRIC_DEFINITIONS.sales} Note: this month is still in progress.`,
        period: `${R("thisMonth").start} to today vs ${R("lastMonth").start} to ${R("lastMonth").end}`,
        metric: { label: "This month vs last month", value: formatINR(a.salesPaise), change },
        actions: [{ label: "Monthly report", href: "/reports?range=thisMonth" }],
      };
    }
    case "customers_count": {
      const s = summarize(data, R("today"));
      return {
        intent: intent.type,
        text: `You have ${s.customers} customers saved${s.newCustomers ? `, including ${s.newCustomers} added today` : ""}.`,
        speech: `${s.customers} customers.`,
        definition: METRIC_DEFINITIONS.customers,
        metric: { label: "Total customers", value: String(s.customers) },
        actions: [{ label: "Open customers", href: "/customers" }],
      };
    }
    case "navigate":
      return {
        intent: intent.type,
        text: `Opening ${PAGE_LABELS[intent.page]}.`,
        speech: `Opening ${PAGE_LABELS[intent.page]}.`,
        navigate: PAGE_PATHS[intent.page],
        actions: [],
      };
    case "help":
      return {
        intent: intent.type,
        text: "I can answer questions about your sales, orders, payments, customers and stock, and open any page for you. Try one of the suggestions below.",
        speech: "Ask me about sales, orders, payments or stock, or tell me which page to open.",
        actions: [],
      };
    default:
      return {
        intent: "unknown",
        text: "Sorry, I didn't understand that yet. I can answer questions about sales, outstanding payments, pending orders, best sellers and low stock, or open a page like Products or Customers.",
        speech: "Sorry, I didn't understand that. Try asking about sales or pending orders.",
        actions: [],
      };
  }
}
