import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
import { Avatar, ButtonLink, Card, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status";
import { Pagination, SearchBox, paginate, qs, str } from "@/components/controls";
import { getBusinessData } from "@/lib/data";
import { formatDateTime, formatINR, orderCode } from "@/lib/format";
import { netPaidByOrder, orderBalance, paymentStatus } from "@/lib/metrics";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const metadata = { title: "Orders" };

export default async function OrdersPage(props: PageProps<"/orders">) {
  const sp = await props.searchParams;
  const q = str(sp.q)?.trim().toLowerCase() ?? "";
  const statusParam = str(sp.status);
  const status = ORDER_STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : "all";
  const data = await getBusinessData();
  const tz = data.business.timezone;
  const customers = new Map(data.customers.map((c) => [c.id, c]));
  const paid = netPaidByOrder(data.payments);

  let list = data.orders;
  if (status !== "all") list = list.filter((o) => o.status === status);
  if (q)
    list = list.filter((o) => {
      const c = customers.get(o.customerId);
      const hay = `${orderCode(o.number)}|${c?.name ?? ""}|${c?.phone ?? ""}`.toLowerCase().replace(/\s/g, "");
      return hay.includes(q.replace(/\s/g, ""));
    });
  const pg = paginate(list, str(sp.page), 15);
  const count = (s: OrderStatus) => data.orders.filter((o) => o.status === s).length;
  const tabs = [
    { key: "all", label: "All", count: data.orders.length, href: qs("/orders", { q }) },
    ...ORDER_STATUSES.map((s) => ({ key: s, label: s[0]!.toUpperCase() + s.slice(1), count: count(s), href: qs("/orders", { status: s, q }) })),
  ];

  return (
    <>
      <PageHeader title="Orders" sub="Manage and track all orders." actions={<ButtonLink href="/orders?new=1"><Plus className="size-4" /> Create order</ButtonLink>} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs items={tabs} active={status} />
        <SearchBox placeholder="Search order, customer or phone…" defaultValue={q} keep={{ status: status === "all" ? undefined : status }} />
      </div>

      <Card className="overflow-hidden">
        {pg.items.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={q || status !== "all" ? "No orders match" : "No orders yet"} body={q || status !== "all" ? "Try a different status or search." : "Create your first order to start tracking sales."} />
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="divide-y divide-line/70 md:hidden">
              {pg.items.map((o) => {
                const c = customers.get(o.customerId);
                return (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar name={c?.name ?? "?"} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{orderCode(o.number)} <span className="font-normal text-muted">· {c?.name}</span></p>
                        <p className="text-xs text-muted">{formatDateTime(o.createdAt, tz)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="tabular text-sm font-bold">{formatINR(o.totalPaise)}</span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-cream-100 text-left text-xs text-muted">
                  <tr>
                    {["Order", "Customer", "Date", "Amount", "Due", "Status", "Payment"].map((h) => (
                      <th key={h} scope="col" className={`px-4 py-3 font-medium ${h === "Amount" || h === "Due" ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {pg.items.map((o) => {
                    const c = customers.get(o.customerId);
                    const { due } = orderBalance(o, paid);
                    return (
                      <tr key={o.id} className="hover:bg-cream-100">
                        <td className="px-4 py-3 font-semibold"><Link href={`/orders/${o.id}`} className="hover:underline">{orderCode(o.number)}</Link></td>
                        <td className="px-4 py-3">{c?.name}</td>
                        <td className="px-4 py-3 text-muted">{formatDateTime(o.createdAt, tz)}</td>
                        <td className="tabular px-4 py-3 text-right font-semibold">{formatINR(o.totalPaise)}</td>
                        <td className={`tabular px-4 py-3 text-right ${due ? "font-semibold text-warning" : "text-muted"}`}>{due ? formatINR(due) : "—"}</td>
                        <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                        <td className="px-4 py-3">{o.status !== "cancelled" && <PaymentStatusBadge status={paymentStatus(o, data.payments)} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
      <Pagination page={pg.page} pages={pg.pages} href={(n) => qs("/orders", { status, q, page: n })} />
    </>
  );
}
