import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HandCoins, Phone } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status";
import { WhatsAppComposer } from "@/components/client-buttons";
import { getBusinessData } from "@/lib/data";
import { formatDateTime, formatINR, orderCode } from "@/lib/format";
import { netPaidByOrder, orderBalance, paymentStatus, uniquePayments } from "@/lib/metrics";
import { METHOD_LABEL } from "@/lib/labels";
import { orderSummaryMessage, paymentReminderMessage } from "@/lib/whatsapp";

export default async function OrderDetail(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const data = await getBusinessData();
  const o = data.orders.find((x) => x.id === id);
  if (!o) notFound();
  const c = data.customers.find((x) => x.id === o.customerId)!;
  const tz = data.business.timezone;
  const { netPaid, due } = orderBalance(o, netPaidByOrder(data.payments));
  const pays = uniquePayments(data.payments).filter((p) => p.orderId === o.id);

  return (
    <>
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Order {orderCode(o.number)}</h1>
            <OrderStatusBadge status={o.status} />
            {o.status !== "cancelled" && <PaymentStatusBadge status={paymentStatus(o, data.payments)} />}
          </div>
          <p className="mt-1 text-sm text-muted">Placed {formatDateTime(o.createdAt, tz)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <WhatsAppComposer phone={c.phone} label="Send summary" message={orderSummaryMessage(data.business, o, c)} />
          {due > 0 && <WhatsAppComposer phone={c.phone} label="Payment reminder" message={paymentReminderMessage(data.business, o, c, due)} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Items" />
          <ul className="divide-y divide-line/70 px-5">
            {o.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3 text-sm">
                <span>{i.productName} <span className="text-muted">× {i.quantity}</span></span>
                <span className="tabular font-medium">{formatINR(i.unitPricePaise * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
            <Row label="Subtotal" value={formatINR(o.subtotalPaise)} />
            {o.discountPaise > 0 && <Row label="Discount" value={`−${formatINR(o.discountPaise)}`} />}
            <Row label="Total" value={formatINR(o.totalPaise)} strong />
            <Row label="Paid (net of refunds)" value={formatINR(netPaid)} />
            <Row label="Balance due" value={formatINR(due)} strong={due > 0} />
          </dl>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Customer</h2>
            <p className="mt-2 text-sm font-medium">{c.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted"><Phone className="size-3.5" /> {c.phone}</p>
            {c.city && <p className="text-sm text-muted">{c.city}</p>}
          </Card>
          <Card>
            <CardHeader title="Payment history" sub="Manually recorded — not bank-verified" />
            {pays.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-3 px-5 pb-5">
                {pays.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="grid size-8 place-items-center rounded-lg bg-cream-200"><HandCoins className="size-4" /></span>
                    <div className="flex-1">
                      <p className="font-medium">{p.kind === "refund" ? "Refund" : "Payment"} · {METHOD_LABEL[p.method]}</p>
                      <p className="text-xs text-muted">{formatDateTime(p.paidAt, tz)}{p.reference ? ` · Ref ${p.reference}` : ""}</p>
                    </div>
                    <span className={`tabular font-semibold ${p.kind === "refund" ? "text-danger" : ""}`}>{p.kind === "refund" ? "−" : ""}{formatINR(p.amountPaise)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold" : "text-muted"}`}>
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
