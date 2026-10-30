import { headers } from "next/headers";
import { ExternalLink, Globe } from "lucide-react";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { CopyButton, ShareButton } from "@/components/client-buttons";
import { ProductThumb } from "@/components/product-thumb";
import { getBusinessData } from "@/lib/data";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Storefront" };

export default async function StorefrontPage() {
  const data = await getBusinessData();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const path = `/s/${data.business.slug}`;
  const url = `${proto}://${host}${path}`;
  const visible = data.products.filter((p) => p.isActive);

  return (
    <>
      <PageHeader title="Storefront" sub="Your public catalogue — customers can browse without an account." />
      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <span className="grid size-12 place-items-center rounded-xl bg-lime/50 text-forest"><Globe className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Your store link</p>
            <p className="truncate font-mono text-sm text-muted">{url}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={url} />
            <ShareButton url={url} title={data.business.name} />
            <ButtonLink href={path} target="_blank" variant="primary"><ExternalLink className="size-4" /> View store</ButtonLink>
          </div>
        </div>
      </Card>
      <h2 className="mb-3 text-[15px] font-semibold">Showing on your store ({visible.length})</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p) => (
          <li key={p.id}>
            <Card className="overflow-hidden">
              <ProductThumb product={p} className="aspect-square w-full" />
              <div className="p-3">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="tabular text-sm">{formatINR(p.pricePaise)} {p.stock === 0 && <span className="text-xs text-danger">· Sold out</span>}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
