import clsx from "clsx";
import { Gem, Gift, Home, Shirt, ShoppingBag, type LucideIcon } from "lucide-react";
import type { Product } from "@/lib/types";

const CAT: Record<string, [LucideIcon, string, string]> = {
  Kurtis: [Shirt, "#f3e3d3", "#9a5b2e"],
  Accessories: [Gem, "#e4ecf3", "#3d6688"],
  "Home Decor": [Home, "#e7efdc", "#4b7330"],
  Gifts: [Gift, "#f4e6ee", "#9a3d6c"],
};

export function ProductThumb({ product, className }: { product: Pick<Product, "name" | "category" | "imageUrl">; className?: string }) {
  if (product.imageUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.imageUrl} alt="" className={clsx("object-cover", className)} />;
  const [Icon, bg, fg] = CAT[product.category ?? ""] ?? [ShoppingBag, "#efe9d8", "#123c2d"];
  return (
    <div className={clsx("grid place-items-center", className)} style={{ background: bg, color: fg }} aria-hidden>
      <Icon className="size-1/3 max-h-12 max-w-12 opacity-80" strokeWidth={1.6} />
    </div>
  );
}
