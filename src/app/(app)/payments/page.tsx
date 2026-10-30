import Link from "next/link";
import { CircleDollarSign, Clock, ListChecks, Wallet } from "lucide-react";
import { Card, EmptyState, IconTile, PageHeader, Tabs } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/status";
import { RangeSelect } from "@/components/range-select";
import { Pagination, paginate, qs, str } from "@/components/controls";
import { getBusinessData } from "@/lib/data";
import { isRangeKey, resolveRange, inRange } from "@/lib/dates";
import { formatDateTime, formatINR, orderCode } from "@/lib/format";
import { METRIC_DEFINITIONS, isEligible, netPaidByOrder, orderBalance, paymentStatus, summarize, uniquePayments } from "@/lib/metrics";
import { METHOD_LABEL } from "@/lib/labels";

export const metadata = { title: "Payments" };

export default async function PaymentsPage(props: PageProps<"/payments">) {
  const sp = await props.searchParams;
  const view = str(sp.status) === "due" ? "due" : "history";
  const rangeKey = isRangeKey(sp.range) ? sp.range : "last30";
  const data = await getBusinessData();
  const tz = data.business.timezone;
  const range = resolveRange(rangeKey, tz);
  const s = summarize(data, range);
  const paid = netPaidByOrder(data.payments);
  const orders = new Map(data.orders.map((o) => [o.id, o]));
  const customers = new Map(data.customers.map((c) => [c.id, c]));

  const history = uniquePayments(data.payments)
    .filter((p) => inRange(p.paidAt, range, tz))
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const dueOrders = data.orders.filter((o) => isEligible(o) && orderBalance(o, paid).due > 0);
  const pgH = paginate(history, str(sp.page), 15);
  const pgD = paginate(dueOrders, str(sp.page), 15);
  const pg = view === "due" ? pgD : pgH;

  return (
    <>
      <PageHeader title="Payments" sub="Track payments you've recorded and balances still due." actions={<RangeSelect value={rangeKey} />} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini icon={Wallet} tone="lime" label={`Received · ${range.label}`} value={formatINR(s.receivedPaise)} help={METRIC_DEFINITIONS.received} />
        <Mini icon={CircleDollarSign} tone="peach" label="Outstanding" value={formatINR(s.outstandingPaise)} help={METRIC_DEFINITIONS.outstanding} />
        <Mini icon={ListChecks} tone="sky" label="Payment records" value={String(history.length)} help="Number of payment and refund records in the period." />
        <Mini icon={Clock} tone="cream" label="Orders with balance" value={String(dueOrders.length)} help="Non-cancelled orders that are not fully paid." />
      </div>
      <p className="mb-4 rounded-xl bg-cream-200/70 px-3 py-2 text-xs text-muted">
        DukaanPilot records payments you enter manually. A payment marked as received is not bank-verified — please check your UPI or bank app.
      </p>
      <div className="mb-4">
        <Tabs active={view} items={[
          { key: "history", label: "Payment history", count: history.length, href: qs("/payments", { range: rangeKey }) },
          { key: "due", label: "Balance due", count: dueOrders.length, href: qs("/payments", { status: "due", range: rangeKey }) },
        ]} />
      </div>
      <Card className="overflow-hidden">
        {pg.items.length === 0 ? (
          <EmptyState icon={Wallet} title={view === "due" ? "Nothing outstanding" : "No payments in this period"} body={view === "due" ? "All active orders are fully paid." : "Recorded payments will show here."} />
        ) : view === "history" ? (
          <ul className="divide-y divide-line/70">
            {pgH.items.map((p) => {
              const o = orders.get(p.orderId);
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3.5 text-sm sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{customers.get(o?.customerId ?? "")?.name ?? "—"} <span className="font-normal text-muted">· {o ? <Link className="hover:underline" href={`/orders/${o.id}`}>{orderCode(o.number)}</Link> : ""}</span></p>
                    <p className="truncate text-xs text-muted">{formatDateTime(p.paidAt, tz)} · {METHOD_LABEL[p.method]}{p.reference ? ` · Ref ${p.reference}` : ""}</p>
                  </div>
                  <span className={`tabular font-bold ${p.kind === "refund" ? "text-danger" : ""}`}>{p.kind === "refund" ? "−" : ""}{formatINR(p.amountPaise)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="divide-y divide-line/70">
            {pgD.items.map((o) => {
              const b = orderBalance(o, paid);
              return (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-cream-100 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{customers.get(o.customerId)?.name} <span className="font-normal text-muted">· {orderCode(o.number)}</span></p>
                      <p className="text-xs text-muted">Total {formatINR(o.totalPaise)} · Paid {formatINR(b.netPaid)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="tabular font-bold text-warning">{formatINR(b.due)}</span>
                      <PaymentStatusBadge status={paymentStatus(o, data.payments)} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Pagination page={pg.page} pages={pg.pages} href={(n) => qs("/payments", { status: view === "due" ? "due" : undefined, range: rangeKey, page: n })} />
    </>
  );
}

function Mini({ icon, tone, label, value, help }: { icon: typeof Wallet; tone: "lime" | "peach" | "sky" | "cream"; label: string; value: string; help: string }) {
  return (
    <Card className="flex items-center gap-3 p-4" title={help}>
      <IconTile icon={icon} tone={tone} className="size-10" />
      <div className="min-w-0">
        <p className="tabular truncate text-lg font-bold">{value}</p>
        <p className="truncate text-xs text-muted">{label}</p>
      </div>
    </Card>
  );
}
