import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, PageHeader, Tabs, ButtonLink } from "@/components/ui";
import { StockBadge } from "@/components/status";
import { ProductThumb } from "@/components/product-thumb";
import { Pagination, SearchBox, paginate, qs, str } from "@/components/controls";
import { getBusinessData } from "@/lib/data";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Products" };

export default async function ProductsPage(props: PageProps<"/products">) {
  const sp = await props.searchParams;
  const q = str(sp.q)?.trim().toLowerCase() ?? "";
  const stock = str(sp.stock) ?? "all";
  const { business, products } = await getBusinessData();
  const t = business.lowStockThreshold;
  const active = products.filter((p) => p.isActive);

  const counts = {
    all: active.length,
    in: active.filter((p) => p.stock > t).length,
    low: active.filter((p) => p.stock <= t).length, // includes out of stock
    out: active.filter((p) => p.stock === 0).length,
  };
  let list = stock === "archived" ? products.filter((p) => !p.isActive) : active;
  if (stock === "in") list = list.filter((p) => p.stock > t);
  if (stock === "low") list = list.filter((p) => p.stock <= t);
  if (stock === "out") list = list.filter((p) => p.stock === 0);
  if (q) list = list.filter((p) => `${p.name} ${p.category ?? ""}`.toLowerCase().includes(q));
  const pg = paginate(list, str(sp.page), 12);

  const tab = (key: string, label: string, count?: number) => ({ key, label, count, href: qs("/products", { stock: key, q }) });

  return (
    <>
      <PageHeader
        title="Products"
        sub="Manage your product catalogue and stock."
        actions={<ButtonLink href="/products?new=1"><Plus className="size-4" /> Add product</ButtonLink>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs active={stock} items={[tab("all", "All", counts.all), tab("in", "In stock", counts.in), tab("low", "Low stock", counts.low), tab("out", "Out of stock", counts.out), tab("archived", "Archived")]} />
        <SearchBox placeholder="Search products…" defaultValue={q} keep={{ stock }} />
      </div>

      {pg.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={q || stock !== "all" ? "No products match" : "Add your first product"}
            body={q || stock !== "all" ? "Try a different search or filter." : "Products you add appear here and on your public storefront."}
            action={!q && stock === "all" ? <ButtonLink href="/products?new=1"><Plus className="size-4" /> Add product</ButtonLink> : <Link className="text-sm font-semibold text-forest-600 underline" href="/products">Clear filters</Link>}
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {pg.items.map((p) => (
            <li key={p.id}>
              <Card className="overflow-hidden">
                <ProductThumb product={p} className="aspect-[4/3] w-full" />
                <div className="p-3.5">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted">{p.category}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
                    <span className="tabular text-[15px] font-bold">{formatINR(p.pricePaise)}</span>
                    <StockBadge stock={p.stock} threshold={t} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={pg.page} pages={pg.pages} href={(n) => qs("/products", { stock, q, page: n })} />
    </>
  );
}
