// Core domain types for DukaanPilot. Mirrors supabase/migrations/0001_init.sql.

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export type PaymentMethod = "upi" | "cash" | "bank_transfer" | "card" | "other";
export type PaymentKind = "payment" | "refund";

/** Derived from payments vs order total — never set by hand. */
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  slug: string;
  category: string;
  phone: string;
  email?: string;
  city?: string;
  timezone: string; // IANA, e.g. Asia/Kolkata
  currency: "INR";
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  category?: string;
  /** Price in paise (integer) to avoid floating-point money errors. */
  pricePaise: number;
  stock: number;
  imageUrl?: string;
  isActive: boolean; // false = archived
  createdAt: string; // ISO
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string; // snapshot at time of order
  unitPricePaise: number; // snapshot at time of order
  quantity: number;
}

export interface Order {
  id: string;
  businessId: string;
  number: number; // human-facing, e.g. 1028 → #DP1028
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  businessId: string;
  orderId: string;
  kind: PaymentKind;
  amountPaise: number; // always positive; kind decides direction
  method: PaymentMethod;
  reference?: string;
  paidAt: string;
  voided: boolean;
  createdAt: string;
}

export interface BusinessData {
  business: Business;
  products: Product[];
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
}
