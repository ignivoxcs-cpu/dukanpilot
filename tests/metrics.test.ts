import { describe, expect, it } from "vitest";
import { dayKey, resolveRange, previousRange } from "@/lib/dates";
import {
  calculateOrderTotals,
  paymentStatus,
  summarize,
  topProducts,
  validatePaymentAmount,
  lowStock,
} from "@/lib/metrics";
import type { BusinessData, Order, Payment } from "@/lib/types";

const TZ = "Asia/Kolkata";
// 30 Oct 2026, 10:00 IST
const NOW = new Date("2026-10-30T04:30:00Z");

function order(p: Partial<Order> & { id: string; total: number; at: string }): Order {
  return {
    businessId: "b1",
    number: 1,
    customerId: "c1",
    status: "pending",
    items: [{ id: p.id + "i", orderId: p.id, productId: "p1", productName: "Kurti", unitPricePaise: p.total, quantity: 1 }],
    subtotalPaise: p.total,
    discountPaise: 0,
    totalPaise: p.total,
    createdAt: p.at,
    ...p,
  };
}
function pay(id: string, orderId: string, amt: number, at: string, extra: Partial<Payment> = {}): Payment {
  return { id, businessId: "b1", orderId, kind: "payment", amountPaise: amt, method: "upi", paidAt: at, voided: false, createdAt: at, ...extra };
}

function data(orders: Order[], payments: Payment[] = []): BusinessData {
  return {
    business: { id: "b1", name: "T", ownerName: "O", slug: "t", category: "x", phone: "", timezone: TZ, currency: "INR", lowStockThreshold: 3 },
    products: [
      { id: "p1", businessId: "b1", name: "Kurti", pricePaise: 89900, stock: 2, isActive: true, createdAt: "" },
      { id: "p2", businessId: "b1", name: "Mug", pricePaise: 29900, stock: 10, isActive: true, createdAt: "" },
      { id: "p3", businessId: "b1", name: "Old", pricePaise: 100, stock: 0, isActive: false, createdAt: "" },
    ],
    customers: [],
    orders,
    payments,
  };
}

describe("timezone handling", () => {
  it("uses the business-local calendar day, not UTC", () => {
    // 29 Oct 20:00 UTC = 30 Oct 01:30 IST
    expect(dayKey("2026-10-29T20:00:00Z", TZ)).toBe("2026-10-30");
  });
  it("resolves ranges", () => {
    expect(resolveRange("today", TZ, NOW)).toMatchObject({ start: "2026-10-30", end: "2026-10-30" });
    expect(resolveRange("last7", TZ, NOW)).toMatchObject({ start: "2026-10-24", end: "2026-10-30" });
    expect(resolveRange("lastMonth", TZ, NOW)).toMatchObject({ start: "2026-09-01", end: "2026-09-30" });
    expect(previousRange(resolveRange("thisMonth", TZ, NOW))).toMatchObject({ start: "2026-09-01", end: "2026-09-30" });
    expect(previousRange(resolveRange("last7", TZ, NOW))).toMatchObject({ start: "2026-10-17", end: "2026-10-23" });
  });
});

describe("summarize", () => {
  const today = resolveRange("today", TZ, NOW);
  it("excludes cancelled orders from sales and counts", () => {
    const d = data([
      order({ id: "a", total: 10000, at: "2026-10-30T03:00:00Z" }),
      order({ id: "b", total: 5000, at: "2026-10-30T03:00:00Z", status: "cancelled" }),
      order({ id: "c", total: 7000, at: "2026-10-28T03:00:00Z" }),
    ]);
    const s = summarize(d, today);
    expect(s.salesPaise).toBe(10000);
    expect(s.orders).toBe(1);
    expect(s.cancelled).toBe(1);
  });
  it("counts an order placed at 1:30am IST as today, not yesterday", () => {
    const d = data([order({ id: "a", total: 10000, at: "2026-10-29T20:00:00Z" })]);
    expect(summarize(d, today).salesPaise).toBe(10000);
  });
  it("computes outstanding with partial payments and refunds", () => {
    const d = data(
      [order({ id: "a", total: 10000, at: "2026-10-30T03:00:00Z" }), order({ id: "b", total: 4000, at: "2026-10-20T03:00:00Z", status: "delivered" })],
      [pay("p1", "a", 3000, "2026-10-30T03:00:00Z"), pay("p2", "b", 4000, "2026-10-20T03:00:00Z"), pay("r1", "b", 1000, "2026-10-30T03:00:00Z", { kind: "refund" })],
    );
    const s = summarize(d, today);
    expect(s.outstandingPaise).toBe(7000 + 1000);
    expect(s.receivedPaise).toBe(3000 - 1000);
  });
  it("ignores duplicate and voided payment records", () => {
    const p = pay("p1", "a", 3000, "2026-10-30T03:00:00Z");
    const d = data([order({ id: "a", total: 10000, at: "2026-10-30T03:00:00Z" })], [p, { ...p }, pay("p2", "a", 5000, "2026-10-30T03:00:00Z", { voided: true })]);
    const s = summarize(d, today);
    expect(s.receivedPaise).toBe(3000);
    expect(s.outstandingPaise).toBe(7000);
  });
  it("cancelled orders have no outstanding balance", () => {
    const d = data([order({ id: "a", total: 10000, at: "2026-10-30T03:00:00Z", status: "cancelled" })]);
    expect(summarize(d, today).outstandingPaise).toBe(0);
  });
});

describe("payment rules", () => {
  const o = order({ id: "a", total: 10000, at: "2026-10-30T03:00:00Z" });
  it("derives payment status", () => {
    expect(paymentStatus(o, [])).toBe("unpaid");
    expect(paymentStatus(o, [pay("1", "a", 4000, "")])).toBe("partial");
    expect(paymentStatus(o, [pay("1", "a", 10000, "")])).toBe("paid");
    expect(paymentStatus(o, [pay("1", "a", 10000, ""), pay("2", "a", 10000, "", { kind: "refund" })])).toBe("refunded");
  });
  it("prevents overpayment and over-refund", () => {
    expect(validatePaymentAmount(o, [pay("1", "a", 6000, "")], 5000, "payment")).toMatch(/overpay/);
    expect(validatePaymentAmount(o, [pay("1", "a", 6000, "")], 4000, "payment")).toBeNull();
    expect(validatePaymentAmount(o, [pay("1", "a", 6000, "")], 7000, "refund")).toMatch(/Refund/);
    expect(validatePaymentAmount(o, [], 0, "payment")).toMatch(/greater than zero/);
    expect(validatePaymentAmount({ ...o, status: "cancelled" }, [], 100, "payment")).toMatch(/cancelled/);
  });
});

describe("order totals (server-side)", () => {
  it("calculates subtotal, discount, total", () => {
    expect(calculateOrderTotals([{ unitPricePaise: 89900, quantity: 2 }, { unitPricePaise: 29900, quantity: 1 }], 10000)).toEqual({
      subtotalPaise: 209700, discountPaise: 10000, totalPaise: 199700,
    });
  });
  it("rejects bad input", () => {
    expect(() => calculateOrderTotals([{ unitPricePaise: 100, quantity: 0 }], 0)).toThrow();
    expect(() => calculateOrderTotals([{ unitPricePaise: 100, quantity: 1.5 }], 0)).toThrow();
    expect(() => calculateOrderTotals([{ unitPricePaise: 100, quantity: 1 }], 200)).toThrow(/Discount/);
    expect(() => calculateOrderTotals([{ unitPricePaise: 100, quantity: 1 }], -1)).toThrow();
  });
});

describe("products", () => {
  it("ranks best sellers and allocates discount", () => {
    const o = order({ id: "a", total: 9000, at: "2026-10-30T03:00:00Z" });
    o.subtotalPaise = 10000; o.discountPaise = 1000;
    o.items = [{ id: "i", orderId: "a", productId: "p2", productName: "Mug", unitPricePaise: 5000, quantity: 2 }];
    const top = topProducts(data([o]), resolveRange("today", TZ, NOW));
    expect(top[0]).toMatchObject({ name: "Mug", units: 2, revenuePaise: 9000 });
  });
  it("low stock excludes archived products", () => {
    expect(lowStock(data([]).products, 3).map((p) => p.id)).toEqual(["p1"]);
  });
});
