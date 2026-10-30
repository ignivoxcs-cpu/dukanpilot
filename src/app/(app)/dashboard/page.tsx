import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Clock,
  HandCoins,
  PackagePlus,
  Receipt,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Users,
  Wallet,
  CircleDollarSign,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import { Avatar, Card, CardHeader, EmptyState, IconTile } from "@/components/ui";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status";
import { RangeSelect } from "@/components/range-select";
import { SalesChart } from "@/components/sales-chart";
import { getBusinessData } from "@/lib/data";
import { daysBetween, isRangeKey, previousRange, resolveRange, dayKey } from "@/lib/dates";
import { dailySales, METRIC_DEFINITIONS, paymentStatus, summarize } from "@/lib/metrics";
import { METHOD_LABEL } from "@/lib/labels";
import { formatDateTime, formatINR, orderCode, pctChange } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function Dashboard(props: PageProps<"/dashboard">) {
  const sp = await props.searchParams;
  const data = await getBusinessData();
  const tz = data.business.timezone;
  const rangeKey = isRangeKey(sp.range) ? sp.range : "today";
  const range = resolveRange(rangeKey, tz);
  const s = summarize(data, range);
  const p = summarize(data, previousRange(range));
  const chartRange = daysBetween(range.start, range.end) < 6 ? resolveRange("last7", tz) : range;
  const chart = dailySales(data, chartRange);
  const customers = new Map(data.customers.map((c) => [c.id, c]));
  const recent = data.orders.slice(0, 5);

  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const vs = rangeKey === "today" ? "yesterday" : "previous period";

  const activity = [
    ...data.orders.slice(0, 6).map((o) => ({
      at: o.createdAt,
      icon: ShoppingBag,
      text: `${o.status === "cancelled" ? "Cancelled" : "New"} order ${orderCode(o.number)} · ${customers.get(o.customerId)?.name ?? "Customer"}`,
      amount: formatINR(o.totalPaise),
    })),
    ...data.payments.slice(-6).map((py) => ({
      at: py.paidAt,
      icon: HandCoins,
      text: `${py.kind === "refund" ? "Refund" : "Payment"} recorded via ${METHOD_LABEL[py.method]}`,
      amount: formatINR(py.amountPaise),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const empty = data.orders.length === 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[30px]">{greeting}, {data.business.ownerName.split(" ")[0]}! 👋</h1>
          <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening with {data.business.name}.</p>
        </div>
        <RangeSelect value={rangeKey} />
      </div>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        <Stat icon={BadgeIndianRupee} tone="lime" label="Total sales" value={formatINR(s.salesPaise)} change={pctChange(s.salesPaise, p.salesPaise)} vs={vs} help={METRIC_DEFINITIONS.sales} />
        <Stat icon={Receipt} tone="cream" label="Total orders" value={String(s.orders)} change={pctChange(s.orders, p.orders)} vs={vs} help={METRIC_DEFINITIONS.orders} />
        <Stat icon={Wallet} tone="sky" label="Payments received" value={formatINR(s.receivedPaise)} change={pctChange(s.receivedPaise, p.receivedPaise)} vs={vs} help={METRIC_DEFINITIONS.received} />
        <Stat icon={CircleDollarSign} tone="peach" label="Outstanding" value={formatINR(s.outstandingPaise)} note="As of now" help={METRIC_DEFINITIONS.outstanding} href="/payments?status=due" />
        <Stat icon={Clock} tone="peach" label="Pending orders" value={String(s.pendingOrders)} note="Need action" help={METRIC_DEFINITIONS.pending} href="/orders?status=pending" />
        <Stat icon={Users} tone="sky" label="Total customers" value={String(s.customers)} note={s.newCustomers ? `+${s.newCustomers} new in period` : "No new in period"} help={METRIC_DEFINITIONS.customers} href="/customers" />
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Sales overview"
            sub={`${chartRange.label} · ${formatINR(chart.reduce((a, c) => a + c.paise, 0))} recorded`}
            action={<Link href={`/reports?range=${chartRange.key}`} className="text-xs font-semibold text-forest-600 hover:underline">Full report</Link>}
          />
          <div className="px-3 pb-4 sm:px-5">
            {empty ? (
              <EmptyState icon={PackageOpen} title="No sales yet" body="Create your first order and your sales trend will appear here." />
            ) : (
              <SalesChart points={chart} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent orders"
            action={<Link href="/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-forest-600 hover:underline">View all <ArrowRight className="size-3.5" /></Link>}
          />
          {recent.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" body="Orders you create or receive from your storefront show up here." />
          ) : (
            <ul className="divide-y divide-line/70 px-5 pb-3">
              {recent.map((o) => {
                const c = customers.get(o.customerId);
                const items = o.items.reduce((n, i) => n + i.quantity, 0);
                return (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-cream-100">
                      <Avatar name={c?.name ?? "?"} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{orderCode(o.number)}</p>
                        <p className="truncate text-xs text-muted">{c?.name} · {items} item{items > 1 ? "s" : ""} · <span className="tabular">{formatINR(o.totalPaise)}</span></p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <OrderStatusBadge status={o.status} />
                        {o.status !== "cancelled" && <PaymentStatusBadge status={paymentStatus(o, data.payments)} />}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <section aria-labelledby="qa">
          <h2 id="qa" className="mb-3 text-[15px] font-semibold">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
            <QuickAction href="/products?new=1" icon={PackagePlus} label="Add product" />
            <QuickAction href="/orders?new=1" icon={ShoppingCart} label="Create order" />
            <QuickAction href="/storefront" icon={Share2} label="Share store" />
            <QuickAction href="/payments" icon={Wallet} label="View payments" />
          </div>
        </section>
        <Card>
          <CardHeader title="Recent activity" />
          {activity.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="space-y-3 px-5 pb-5">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="grid size-8 place-items-center rounded-lg bg-cream-200 text-forest"><a.icon className="size-4" aria-hidden /></span>
                  <span className="min-w-0 flex-1 truncate">{a.text}</span>
                  <span className="tabular text-xs font-semibold">{a.amount}</span>
                  <time className="hidden w-24 text-right text-[11px] text-muted sm:block" dateTime={a.at}>
                    {dayKey(a.at, tz) === dayKey(new Date(), tz) ? "Today " + new Date(a.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: tz }) : formatDateTime(a.at, tz)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({
  icon, tone, label, value, change, vs, note, help, href,
}: {
  icon: LucideIcon; tone: "lime" | "cream" | "peach" | "sky"; label: string; value: string;
  change?: number | null; vs?: string; note?: string; help: string; href?: string;
}) {
  const body = (
    <Card className="flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-pop)] sm:flex-row sm:items-start sm:p-5">
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="tabular truncate text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
        <p className="text-[13px] text-muted" title={help}>{label}</p>
        {change !== undefined ? (
          <p className={`mt-1 text-xs font-semibold ${change === null ? "text-muted" : change >= 0 ? "text-success" : "text-danger"}`}>
            {change === null ? `New vs ${vs}` : `${change >= 0 ? "+" : ""}${change}% vs ${vs}`}
          </p>
        ) : (
          <p className="mt-1 text-xs font-medium text-muted">{note}</p>
        )}
      </div>
    </Card>
  );
  return href ? <Link href={href} className="block rounded-[var(--radius-card)]">{body}</Link> : body;
}

function QuickAction({ href, icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white p-3.5 text-sm font-semibold shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-pop)]">
      <IconTile icon={icon} tone="lime" className="size-10" />
      {label}
    </Link>
  );
}
