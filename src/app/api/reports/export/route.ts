import { getBusinessData } from "@/lib/data";
import { dayKey, isRangeKey, resolveRange, inRange } from "@/lib/dates";
import { toCSV, rupees } from "@/lib/csv";
import { dailySales, isEligible, netPaidByOrder, orderBalance, paymentStatus, topProducts, uniquePayments } from "@/lib/metrics";
import { orderCode } from "@/lib/format";

const TYPES = ["daily", "products", "orders", "payments", "outstanding"] as const;
type T = (typeof TYPES)[number];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as T;
  const rk = url.searchParams.get("range");
  if (!TYPES.includes(type) || !isRangeKey(rk)) return new Response("Invalid export request", { status: 400 });

  // Scoped to the signed-in business only (enforced by RLS in Phase 2).
  const data = await getBusinessData();
  const tz = data.business.timezone;
  const range = resolveRange(rk, tz);
  const cust = new Map(data.customers.map((c) => [c.id, c]));
  const paid = netPaidByOrder(data.payments);
  let rows: (string | number)[][] = [];

  if (type === "daily") rows = [["Date", "Sales (INR)"], ...dailySales(data, range).map((d) => [d.day, rupees(d.paise)])];
  if (type === "products")
    rows = [["Product", "Units sold", "Revenue (INR)"], ...topProducts(data, range, 1000).map((p) => [p.name, p.units, rupees(p.revenuePaise)])];
  if (type === "orders")
    rows = [
      ["Order", "Date", "Customer", "Status", "Subtotal", "Discount", "Total", "Paid", "Due", "Payment status"],
      ...data.orders.filter((o) => inRange(o.createdAt, range, tz)).map((o) => {
        const b = orderBalance(o, paid);
        return [orderCode(o.number), dayKey(o.createdAt, tz), cust.get(o.customerId)?.name ?? "", o.status, rupees(o.subtotalPaise), rupees(o.discountPaise), rupees(o.totalPaise), rupees(b.netPaid), rupees(b.due), o.status === "cancelled" ? "" : paymentStatus(o, data.payments)];
      }),
    ];
  if (type === "payments") {
    const orders = new Map(data.orders.map((o) => [o.id, o]));
    rows = [
      ["Date", "Order", "Customer", "Type", "Method", "Reference", "Amount (INR)"],
      ...uniquePayments(data.payments).filter((p) => inRange(p.paidAt, range, tz)).map((p) => {
        const o = orders.get(p.orderId);
        return [dayKey(p.paidAt, tz), o ? orderCode(o.number) : "", cust.get(o?.customerId ?? "")?.name ?? "", p.kind, p.method, p.reference ?? "", rupees(p.kind === "refund" ? -p.amountPaise : p.amountPaise)];
      }),
    ];
  }
  if (type === "outstanding")
    rows = [
      ["Order", "Customer", "Phone", "Total", "Paid", "Due"],
      ...data.orders.filter(isEligible).map((o) => ({ o, b: orderBalance(o, paid) })).filter((x) => x.b.due > 0)
        .map(({ o, b }) => [orderCode(o.number), cust.get(o.customerId)?.name ?? "", cust.get(o.customerId)?.phone ?? "", rupees(o.totalPaise), rupees(b.netPaid), rupees(b.due)]),
    ];

  const name = `dukaanpilot-${type}-${range.start}-to-${range.end}.csv`;
  return new Response("﻿" + toCSV(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
