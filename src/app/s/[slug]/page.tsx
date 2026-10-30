import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, MessageCircle } from "lucide-react";
import { ProductThumb } from "@/components/product-thumb";
import { LogoMark } from "@/components/logo";
import { getPublicStore } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

export async function generateMetadata(props: PageProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const store = await getPublicStore(slug);
  return { title: store ? `${store.name} — Shop` : "Store not found" };
}

export default async function PublicStore(props: PageProps<"/s/[slug]">) {
  const { slug } = await props.params;
  const store = await getPublicStore(slug);
  if (!store) notFound();

  return (
    <div className="min-h-dvh bg-cream">
      <header className="bg-forest px-4 pb-16 pt-8 text-white">
        <div className="mx-auto max-w-5xl">
          <span className="grid size-16 place-items-center rounded-2xl bg-lime text-2xl font-bold text-forest">{store.name[0]}</span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{store.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-white/70">
            {store.category}
            {store.city && <><span aria-hidden>·</span><MapPin className="size-3.5" /> {store.city}</>}
          </p>
        </div>
      </header>
      <main className="mx-auto -mt-10 max-w-5xl px-4 pb-16">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {store.products.map((p) => (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
              <ProductThumb product={p} className="aspect-square w-full" />
              <div className="flex flex-1 flex-col p-3.5">
                <h2 className="text-sm font-semibold">{p.name}</h2>
                <p className="tabular mt-0.5 font-bold">{formatINR(p.pricePaise)}</p>
                <p className={`mt-0.5 text-xs ${p.available ? "text-success" : "text-danger"}`}>{p.available ? "Available" : "Currently sold out"}</p>
                <a
                  href={waLink(store.phone, `Hi ${store.name}, I'm interested in "${p.name}" (${formatINR(p.pricePaise)}). Is it available?`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-forest text-xs font-semibold text-white hover:bg-forest-700"
                >
                  <MessageCircle className="size-3.5" /> Enquire<span className="hidden sm:inline">&nbsp;on WhatsApp</span>
                </a>
              </div>
            </li>
          ))}
        </ul>
        <footer className="mt-12 flex items-center justify-center gap-2 text-xs text-muted">
          <LogoMark className="size-5" /> Powered by DukaanPilot
        </footer>
      </main>
    </div>
  );
}
