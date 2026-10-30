import { Plus, Users } from "lucide-react";
import { Avatar, ButtonLink, Card, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { Pagination, SearchBox, paginate, qs, str } from "@/components/controls";
import { getBusinessData } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { customerStats } from "@/lib/metrics";

export const metadata = { title: "Customers" };

export default async function CustomersPage(props: PageProps<"/customers">) {
  const sp = await props.searchParams;
  const q = str(sp.q)?.trim().toLowerCase() ?? "";
  const filter = str(sp.filter) ?? "all";
  const data = await getBusinessData();
  const rows = data.customers.map((c) => ({ c, ...customerStats(data, c.id) }));
  let list = rows;
  if (filter === "due") list = list.filter((r) => r.duePaise > 0);
  if (q) list = list.filter((r) => `${r.c.name} ${r.c.phone.replace(/\s/g, "")} ${r.c.email ?? ""}`.toLowerCase().includes(q.replace(/\s/g, "")));
  list = [...list].sort((a, b) => b.totalPaise - a.totalPaise);
  const pg = paginate(list, str(sp.page), 15);

  return (
    <>
      <PageHeader title="Customers" sub="Your customers, their orders and balances." actions={<ButtonLink href="/customers?new=1"><Plus className="size-4" /> Add customer</ButtonLink>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs active={filter} items={[
          { key: "all", label: "All", count: rows.length, href: qs("/customers", { q }) },
          { key: "due", label: "Has balance due", count: rows.filter((r) => r.duePaise > 0).length, href: qs("/customers", { filter: "due", q }) },
        ]} />
        <SearchBox placeholder="Search name or phone…" defaultValue={q} keep={{ filter: filter === "all" ? undefined : filter }} />
      </div>
      <Card>
        {pg.items.length === 0 ? (
          <EmptyState icon={Users} title={q ? "No customers match" : "No customers yet"} body={q ? "Try another name or number." : "Customers are added when you create orders, or you can add them directly."} />
        ) : (
          <ul className="divide-y divide-line/70">
            {pg.items.map(({ c, orderCount, totalPaise, duePaise }) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.phone}{c.city ? ` · ${c.city}` : ""} · {orderCount} order{orderCount === 1 ? "" : "s"}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm font-bold">{formatINR(totalPaise)}</p>
                  <p className={`tabular text-xs ${duePaise ? "font-semibold text-warning" : "text-muted"}`}>{duePaise ? `${formatINR(duePaise)} due` : "No balance"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={pg.page} pages={pg.pages} href={(n) => qs("/customers", { filter, q, page: n })} />
    </>
  );
}
