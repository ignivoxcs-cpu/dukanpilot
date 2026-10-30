// Deterministic business metrics. Every number shown on the dashboard, in
// reports, and spoken by DukaanPilot AI comes from these functions.
//
// METRIC DEFINITIONS (shown to users via METRIC_DEFINITIONS):
// - Eligible order: any order whose status is not "cancelled".
// - Sales recorded: sum of totals (after discount) of eligible orders
//   created in the period (business-local calendar days).
// - Orders: count of eligible orders created in the period.
// - Payments received: sum of non-voided payment records dated in the period,
//   minus non-voided refunds dated in the period. Manual records — not
//   bank-verified.
// - Outstanding balance: across all eligible orders (as of now), the sum of
//   max(order total − net paid, 0).
// - Pending orders: eligible orders currently in "pending" status.

import type {
  BusinessData,
  Order,
  Payment,
  PaymentStatus,
  Product,
} from "./types";
import { type DayRange, inRange, listDays, dayKey } from "./dates";

export const METRIC_DEFINITIONS = {
  sales:
    "Sum of order totals (after discounts) for all non-cancelled orders created in the period.",
  orders: "Number of non-cancelled orders created in the period.",
  received:
    "Payments recorded in the period minus refunds. These are manual records, not bank-verified.",
  outstanding:
    "Unpaid amount still due across all non-cancelled orders, as of now.",
  pending: "Non-cancelled orders currently in Pending status.",
  customers: "Customers saved in your business.",
} as const;

export const isEligible = (o: Order) => o.status !== "cancelled";

/** De-duplicate payments by id so a repeated record can never inflate totals. */
export function uniquePayments(payments: Payment[]): Payment[] {
  const seen = new Set<string>();
  return payments.filter((p) => {
    if (p.voided || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function netPaidByOrder(payments: Payment[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of uniquePayments(payments)) {
    const sign = p.kind === "refund" ? -1 : 1;
    m.set(p.orderId, (m.get(p.orderId) ?? 0) + sign * p.amountPaise);
  }
  return m;
}

export function orderBalance(order: Order, paid: Map<string, number>) {
  const netPaid = paid.get(order.id) ?? 0;
  const due = isEligible(order) ? Math.max(order.totalPaise - netPaid, 0) : 0;
  return { netPaid, due };
}

export function paymentStatus(
  order: Order,
  payments: Payment[],
): PaymentStatus {
  const ps = uniquePayments(payments).filter((p) => p.orderId === order.id);
  const net = ps.reduce(
    (s, p) => s + (p.kind === "refund" ? -p.amountPaise : p.amountPaise),
    0,
  );
  if (ps.some((p) => p.kind === "refund") && net <= 0) return "refunded";
  if (net <= 0) return "unpaid";
  if (net >= order.totalPaise) return "paid";
  return "partial";
}

export interface Summary {
  salesPaise: number;
  orders: number;
  cancelled: number;
  receivedPaise: number;
  outstandingPaise: number;
  pendingOrders: number;
  customers: number;
  newCustomers: number;
}

export function summarize(
  data: BusinessData,
  range: DayRange,
): Summary {
  const tz = data.business.timezone;
  const inPeriod = data.orders.filter((o) => inRange(o.createdAt, range, tz));
  const eligible = inPeriod.filter(isEligible);
  const paid = netPaidByOrder(data.payments);

  const received = uniquePayments(data.payments)
    .filter((p) => inRange(p.paidAt, range, tz))
    .reduce(
      (s, p) => s + (p.kind === "refund" ? -p.amountPaise : p.amountPaise),
      0,
    );

  return {
    salesPaise: eligible.reduce((s, o) => s + o.totalPaise, 0),
    orders: eligible.length,
    cancelled: inPeriod.length - eligible.length,
    receivedPaise: received,
    outstandingPaise: data.orders.reduce(
      (s, o) => s + orderBalance(o, paid).due,
      0,
    ),
    pendingOrders: data.orders.filter((o) => o.status === "pending").length,
    customers: data.customers.length,
    newCustomers: data.customers.filter((c) => inRange(c.createdAt, range, tz))
      .length,
  };
}

export function dailySales(data: BusinessData, range: DayRange) {
  const tz = data.business.timezone;
  const byDay = new Map<string, number>(listDays(range).map((d) => [d, 0]));
  for (const o of data.orders) {
    if (!isEligible(o)) continue;
    const k = dayKey(o.createdAt, tz);
    if (byDay.has(k)) byDay.set(k, byDay.get(k)! + o.totalPaise);
  }
  return [...byDay].map(([day, paise]) => ({ day, paise }));
}

export interface ProductPerformance {
  productId: string;
  name: string;
  units: number;
  revenuePaise: number;
}

export function topProducts(
  data: BusinessData,
  range: DayRange,
  limit = 5,
): ProductPerformance[] {
  const tz = data.business.timezone;
  const m = new Map<string, ProductPerformance>();
  for (const o of data.orders) {
    if (!isEligible(o) || !inRange(o.createdAt, range, tz)) continue;
    // Allocate discount proportionally so revenue sums to order totals.
    const ratio = o.subtotalPaise > 0 ? o.totalPaise / o.subtotalPaise : 0;
    for (const it of o.items) {
      const cur = m.get(it.productId) ?? {
        productId: it.productId,
        name: it.productName,
        units: 0,
        revenuePaise: 0,
      };
      cur.units += it.quantity;
      cur.revenuePaise += Math.round(it.unitPricePaise * it.quantity * ratio);
      m.set(it.productId, cur);
    }
  }
  return [...m.values()]
    .sort((a, b) => b.units - a.units || b.revenuePaise - a.revenuePaise)
    .slice(0, limit);
}

export function lowStock(products: Product[], threshold: number) {
  return products
    .filter((p) => p.isActive && p.stock <= threshold)
    .sort((a, b) => a.stock - b.stock);
}

export function customerStats(data: BusinessData, customerId: string) {
  const paid = netPaidByOrder(data.payments);
  const orders = data.orders.filter(
    (o) => o.customerId === customerId && isEligible(o),
  );
  return {
    orderCount: orders.length,
    totalPaise: orders.reduce((s, o) => s + o.totalPaise, 0),
    duePaise: orders.reduce((s, o) => s + orderBalance(o, paid).due, 0),
  };
}

/** Server-side order total calculation. Never trust browser-sent totals. */
export function calculateOrderTotals(
  lines: { unitPricePaise: number; quantity: number }[],
  discountPaise: number,
) {
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1)
      throw new Error("Quantity must be a whole number of at least 1.");
    if (!Number.isInteger(l.unitPricePaise) || l.unitPricePaise < 0)
      throw new Error("Invalid unit price.");
  }
  const subtotal = lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
  if (!Number.isInteger(discountPaise) || discountPaise < 0)
    throw new Error("Discount cannot be negative.");
  if (discountPaise > subtotal)
    throw new Error("Discount cannot be more than the order subtotal.");
  return { subtotalPaise: subtotal, discountPaise, totalPaise: subtotal - discountPaise };
}

/** Business rule: a payment may never push net paid above the order total. */
export function validatePaymentAmount(
  order: Order,
  payments: Payment[],
  amountPaise: number,
  kind: "payment" | "refund",
) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0)
    return "Amount must be greater than zero.";
  if (order.status === "cancelled" && kind === "payment")
    return "Cannot record a payment on a cancelled order.";
  const { netPaid } = orderBalance(order, netPaidByOrder(payments));
  if (kind === "payment" && netPaid + amountPaise > order.totalPaise)
    return `This would overpay the order. Maximum you can record is ₹${(
      (order.totalPaise - netPaid) /
      100
    ).toFixed(2)}.`;
  if (kind === "refund" && amountPaise > netPaid)
    return "Refund cannot exceed the amount already paid.";
  return null;
}
