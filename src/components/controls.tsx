import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import clsx from "clsx";

/** Plain GET form — works without JavaScript and keeps other filters. */
export function SearchBox({
  placeholder,
  defaultValue,
  keep = {},
}: {
  placeholder: string;
  defaultValue?: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form className="relative w-full sm:max-w-xs" role="search">
      {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <label className="sr-only" htmlFor="q">{placeholder}</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-forest-600"
      />
    </form>
  );
}

export function Pagination({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (p: number) => string;
}) {
  if (pages <= 1) return null;
  const cls = "grid size-9 place-items-center rounded-lg border border-line bg-white";
  return (
    <nav className="mt-5 flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} className={cls} aria-label="Previous page"><ChevronLeft className="size-4" /></Link> : <span className={clsx(cls, "opacity-40")}><ChevronLeft className="size-4" /></span>}
      <span className="px-2 text-muted">Page {page} of {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className={cls} aria-label="Next page"><ChevronRight className="size-4" /></Link> : <span className={clsx(cls, "opacity-40")}><ChevronRight className="size-4" /></span>}
    </nav>
  );
}

export function qs(base: string, params: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== "all") p.set(k, String(v));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

export function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function paginate<T>(items: T[], pageParam: string | undefined, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), pages);
  return { page, pages, items: items.slice((page - 1) * size, page * size) };
}
