import { Badge, type Tone } from "./ui";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONE[status]}>{status[0]!.toUpperCase() + status.slice(1)}</Badge>;
}

const PAY_TONE: Record<PaymentStatus, Tone> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
  refunded: "neutral",
};
const PAY_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  partial: "Part paid",
  unpaid: "Unpaid",
  refunded: "Refunded",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAY_TONE[status]}>{PAY_LABEL[status]}</Badge>;
}

export function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock === 0) return <Badge tone="danger">Out of stock</Badge>;
  if (stock <= threshold) return <Badge tone="warning">Low stock ({stock})</Badge>;
  return <Badge tone="success">In stock ({stock})</Badge>;
}
