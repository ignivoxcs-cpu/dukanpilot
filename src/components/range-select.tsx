"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_LABELS, type RangeKey } from "@/lib/dates";

export function RangeSelect({ value, label = "Date range" }: { value: RangeKey; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="relative inline-flex h-10 items-center rounded-xl border border-line bg-white pl-3 pr-8 text-sm font-medium shadow-[var(--shadow-card)]">
      <span className="sr-only">{label}</span>
      <CalendarDays className="mr-2 size-4 text-muted" aria-hidden />
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(params);
          p.set("range", e.target.value);
          router.push(`${pathname}?${p}`);
        }}
        className="appearance-none bg-transparent pr-1 outline-none"
      >
        {Object.entries(RANGE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-muted" aria-hidden />
    </label>
  );
}
