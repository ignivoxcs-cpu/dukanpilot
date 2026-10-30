// WhatsApp click-to-chat links. These only OPEN WhatsApp with a prefilled
// message for the merchant to review and send — nothing is sent automatically.

import { formatINR, orderCode } from "./format";
import type { Business, Customer, Order } from "./types";

/** Normalise an Indian phone number to wa.me digits (e.g. 919876543210). */
export function waNumber(phone: string): string | null {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

export function waLink(phone: string | null, message: string): string {
  const text = encodeURIComponent(message);
  const n = phone ? waNumber(phone) : null;
  return n ? `https://wa.me/${n}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function orderSummaryMessage(b: Business, o: Order, c: Customer) {
  const lines = o.items
    .map((i) => `• ${i.productName} × ${i.quantity} — ${formatINR(i.unitPricePaise * i.quantity)}`)
    .join("\n");
  return [
    `Hi ${c.name.split(" ")[0]}, here is your order summary from ${b.name}.`,
    ``,
    `Order ${orderCode(o.number)}`,
    lines,
    o.discountPaise ? `Discount: −${formatINR(o.discountPaise)}` : null,
    `Total: ${formatINR(o.totalPaise)}`,
    ``,
    `Thank you for shopping with us!`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function paymentReminderMessage(
  b: Business,
  o: Order,
  c: Customer,
  duePaise: number,
) {
  return `Hi ${c.name.split(" ")[0]}, a gentle reminder from ${b.name}: ${formatINR(
    duePaise,
  )} is pending for order ${orderCode(o.number)}. Please let us know once paid. Thank you!`;
}

export function productEnquiryMessage(b: Business, productName: string) {
  return `Hi ${b.name}, I'm interested in "${productName}". Is it available?`;
}
