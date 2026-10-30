import { Download } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { RangeSelect } from "@/components/range-select";
import { SalesChart } from "@/components/sales-chart";
import { getBusinessData } from "@/lib/data";
import { isRangeKey, resolveRange } from "@/lib/dates";
import { formatDay, formatINR } from "@/lib/format";
import { METRIC_DEFINITIONS, dailySales, summarize, topProducts } from "@/lib/metrics";

export const metadata = { title: "Reports" };

export default async function ReportsPage(props: PageProps<"/reports">) {
  const sp = await props.searchParams;
  const rangeKey = isRangeKey(sp.range) ? sp.range : "thisMonth";
  const data = await getBusinessData();
  const range = resolveRange(rangeKey, data.business.timezone);
  const s = summarize(data, range);
  const daily = dailySales(data, range);
  const top = topProducts(data, range, 8);
  const csv = (type: string) => `/api/reports/export?type=${type}&range=${rangeKey}`;

  return (
    <>
      <PageHeader title="Reports" sub={`${range.label}: ${range.start} to ${range.end}`} actions={<RangeSelect value={rangeKey} />} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Sales recorded", formatINR(s.salesPaise), METRIC_DEFINITIONS.sales],
          ["Orders", String(s.orders), METRIC_DEFINITIONS.orders],
          ["Payments received", formatINR(s.receivedPaise), METRIC_DEFINITIONS.received],
          ["Outstanding (now)", formatINR(s.outstandingPaise), METRIC_DEFINITIONS.outstanding],
        ].map(([l, v, h]) => (
          <Card key={l} className="p-4">
            <p className="text-xs text-muted">{l}</p>
            <p className="tabular mt-1 text-xl font-bold">{v}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted">{h}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Daily sales" action={<Export href={csv("daily")} />} />
          <div className="px-3 pb-3 sm:px-5">{daily.length > 1 && <SalesChart points={daily} />}</div>
          <div className="max-h-72 overflow-y-auto border-t border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-cream-100 text-left text-xs text-muted"><tr><th className="px-5 py-2 font-medium">Date</th><th className="px-5 py-2 text-right font-medium">Sales</th></tr></thead>
              <tbody className="divide-y divide-line/70">
                {[...daily].reverse().map((d) => (
                  <tr key={d.day}><td className="px-5 py-2">{formatDay(d.day, { weekday: "short", year: "numeric" })}</td><td className="tabular px-5 py-2 text-right">{formatINR(d.paise)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Product performance" sub="By units sold, revenue after discounts" action={<Export href={csv("products")} />} />
            {top.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">No products sold in this period.</p> : (
              <ol className="space-y-3 px-5 pb-5">
                {top.map((p, i) => {
                  const w = Math.round((p.units / top[0]!.units) * 100);
                  return (
                    <li key={p.productId} className="text-sm">
                      <div className="flex justify-between"><span><span className="mr-2 text-muted">{i + 1}.</span>{p.name}</span><span className="tabular font-semibold">{p.units} · {formatINR(p.revenuePaise)}</span></div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-cream-200"><div className="h-full rounded-full bg-forest-600" style={{ width: `${w}%` }} /></div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Exports</h2>
            <p className="mt-1 text-xs text-muted">CSV files open in Excel or Google Sheets. Only your business&apos;s records are included.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Export href={csv("orders")} label="Orders" />
              <Export href={csv("payments")} label="Payments" />
              <Export href={csv("outstanding")} label="Outstanding" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Export({ href, label = "CSV" }: { href: string; label?: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold hover:border-forest-600" download>
      <Download className="size-3.5" /> {label}
    </a>
  );
}
