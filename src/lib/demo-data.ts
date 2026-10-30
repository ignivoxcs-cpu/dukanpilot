// PREVIEW-ONLY demo dataset. Used only when Supabase is not configured, and
// the UI always shows a "Demo data" banner when it is active. Figures are
// computed by the same metric functions used for real data — nothing is
// hardcoded into the dashboard.

import type {
  BusinessData,
  Customer,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  Product,
} from "./types";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const BID = "demo-business";

export function buildDemoData(now: Date = new Date()): BusinessData {
  const rand = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]!;
  const daysAgo = (d: number, h = 10) =>
    new Date(now.getTime() - d * 86400000 - h * 3600000 * rand()).toISOString();

  const productSeed: [string, string, number, number][] = [
    ["Cotton Kurti", "Kurtis", 899, 12],
    ["Handmade Candle", "Home Decor", 499, 25],
    ["Silver Earrings", "Accessories", 699, 3],
    ["Canvas Tote Bag", "Accessories", 599, 20],
    ["Ceramic Mug", "Home Decor", 299, 15],
    ["Gift Hamper", "Gifts", 1299, 0],
    ["Block-print Dupatta", "Kurtis", 749, 9],
    ["Jute Table Runner", "Home Decor", 549, 2],
  ];
  const products: Product[] = productSeed.map(([name, category, price, stock], i) => ({
    id: `p${i + 1}`,
    businessId: BID,
    name,
    category,
    description: `${name} — handpicked for Priya's Collection.`,
    pricePaise: price * 100,
    stock,
    isActive: true,
    createdAt: daysAgo(60),
  }));

  const names = [
    "Neha Verma", "Amit Singh", "Kavya Nair", "Rohit Mehta",
    "Sneha Patel", "Vikram Rao", "Pooja Iyer", "Arjun Nair",
    "Meera Joshi", "Karan Malhotra",
  ];
  const customers: Customer[] = names.map((name, i) => ({
    id: `c${i + 1}`,
    businessId: BID,
    name,
    phone: `+91 98765 ${String(43210 + i * 111).slice(0, 5)}`,
    city: pick(["Bengaluru", "Mumbai", "Pune", "Kochi", "Delhi"]),
    createdAt: daysAgo(i < 2 ? 0 : 10 + i * 3),
  }));

  const orders: Order[] = [];
  const payments: Payment[] = [];
  let num = 1000;
  for (let d = 40; d >= 0; d--) {
    const count = d === 0 ? 6 : Math.floor(rand() * 4) + 1;
    for (let k = 0; k < count; k++) {
      num++;
      const id = `o${num}`;
      const lineCount = Math.floor(rand() * 2) + 1;
      const items = Array.from({ length: lineCount }, (_, j) => {
        const p = pick(products);
        return {
          id: `${id}-${j}`,
          orderId: id,
          productId: p.id,
          productName: p.name,
          unitPricePaise: p.pricePaise,
          quantity: Math.floor(rand() * 2) + 1,
        };
      });
      const subtotal = items.reduce((s, it) => s + it.unitPricePaise * it.quantity, 0);
      const discount = rand() < 0.15 ? 5000 : 0;
      const total = subtotal - discount;
      const status: OrderStatus =
        d < 2
          ? pick(["pending", "pending", "confirmed", "shipped"])
          : d < 5
            ? pick(["shipped", "processing", "delivered"])
            : rand() < 0.06
              ? "cancelled"
              : "delivered";
      const createdAt = daysAgo(d, 9);
      orders.push({
        id,
        businessId: BID,
        number: num,
        customerId: pick(customers).id,
        status,
        items,
        subtotalPaise: subtotal,
        discountPaise: discount,
        totalPaise: total,
        createdAt,
      });
      if (status === "cancelled") continue;
      const r = rand();
      const method: PaymentMethod = pick(["upi", "upi", "upi", "cash", "bank_transfer"]);
      const amount = status === "pending" ? (r < 0.5 ? 0 : Math.round(total / 2 / 100) * 100) : r < 0.85 ? total : Math.round(total / 2 / 100) * 100;
      if (amount > 0)
        payments.push({
          id: `pay-${id}`,
          businessId: BID,
          orderId: id,
          kind: "payment",
          amountPaise: amount,
          method,
          reference: method === "upi" ? `UPI${400000 + num}` : undefined,
          paidAt: createdAt,
          voided: false,
          createdAt,
        });
    }
  }

  return {
    business: {
      id: BID,
      name: "Priya's Collection",
      ownerName: "Priya Sharma",
      slug: "priyascollection",
      category: "Fashion & Lifestyle",
      phone: "+91 98765 00000",
      city: "Bengaluru",
      timezone: "Asia/Kolkata",
      currency: "INR",
      lowStockThreshold: 3,
    },
    products,
    customers,
    orders: orders.reverse(),
    payments,
  };
}
