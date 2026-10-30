"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Mic, Search, Sparkles, X, Info } from "lucide-react";
import { NAV } from "./nav-items";
import { Logo, LogoMark } from "./logo";
import { AssistantPanel } from "./assistant/assistant-panel";

interface Props {
  children: ReactNode;
  business: { name: string; category: string; ownerName: string };
  pendingOrders: number;
  demo: boolean;
}

export function AppFrame({ children, business, pendingOrders, demo }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [wide, setWide] = useState(false);

  // Desktop (≥1280px): assistant docked open by default. Mobile: sheet.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const apply = () => {
      setWide(mq.matches);
      setAssistantOpen(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAssistantOpen((o) => !o);
      }
      if (e.key === "Escape" && !wide) setAssistantOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wide]);

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col bg-forest px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-8 px-2" aria-label="DukaanPilot home">
          <Logo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors",
                active(n.href) ? "bg-lime text-forest" : "text-white/80 hover:bg-white/8 hover:text-white",
              )}
            >
              <n.icon className="size-[19px]" aria-hidden />
              <span className="flex-1">{n.label}</span>
              {n.href === "/orders" && pendingOrders > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-[#f2683c] px-1.5 text-[11px] font-semibold text-white" aria-label={`${pendingOrders} pending`}>
                  {pendingOrders}
                </span>
              )}
            </Link>
          ))}
          <button
            onClick={() => setAssistantOpen((o) => !o)}
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14.5px] font-medium text-white/80 hover:bg-white/8 hover:text-white"
            aria-expanded={assistantOpen}
          >
            <Sparkles className="size-[19px] text-lime" aria-hidden />
            <span className="flex-1">DukaanPilot AI</span>
            <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold text-forest">New</span>
          </button>
        </nav>
        <div className="mt-6 rounded-2xl bg-white/8 p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-lime/90 text-sm font-bold text-forest">
              {business.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{business.name}</p>
              <p className="truncate text-xs text-white/60">{business.category}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line/70 bg-cream/90 px-4 backdrop-blur sm:px-6">
            <Link href="/dashboard" className="lg:hidden" aria-label="Home">
              <LogoMark />
            </Link>
            <label className="relative hidden max-w-md flex-1 md:block">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                placeholder="Search products, orders, customers…"
                className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm outline-none placeholder:text-muted/80 focus:border-forest-600"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = (e.target as HTMLInputElement).value.trim();
                    if (q) router.push(`/orders?q=${encodeURIComponent(q)}`);
                  }
                }}
              />
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button className="relative grid size-10 place-items-center rounded-xl hover:bg-cream-200" aria-label={`Notifications${pendingOrders ? `, ${pendingOrders} pending orders` : ""}`}>
                <Bell className="size-5" aria-hidden />
                {pendingOrders > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-[#f2683c]" />}
              </button>
              <div className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2">
                <span className="grid size-9 place-items-center rounded-full bg-forest text-xs font-semibold text-lime">
                  {business.ownerName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </span>
                <div className="hidden leading-tight sm:block">
                  <p className="text-sm font-semibold">{business.ownerName}</p>
                  <p className="text-xs text-muted">Business Owner</p>
                </div>
              </div>
            </div>
          </header>

          {demo && (
            <div className="flex items-center gap-2 border-b border-[#ecd9a8] bg-[#fbf1d6] px-4 py-2 text-xs text-[#7a5a12] sm:px-6" role="status">
              <Info className="size-4 shrink-0" aria-hidden />
              <span>
                <strong>Preview mode — demo data.</strong> Figures are calculated from sample records. Your real data appears once the database is connected.
              </span>
            </div>
          )}

          <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
            {children}
          </main>
        </div>

        {/* Assistant: docked on desktop, sheet on mobile */}
        {assistantOpen && (
          <>
            {!wide && (
              <div className="fixed inset-0 z-40 bg-forest/40 backdrop-blur-[2px]" onClick={() => setAssistantOpen(false)} aria-hidden />
            )}
            <aside
              className={clsx(
                wide
                  ? "sticky top-0 h-dvh w-[380px] shrink-0 border-l border-line bg-cream-100"
                  : "fixed inset-x-0 bottom-0 z-50 h-[88dvh] rounded-t-3xl bg-cream-100 shadow-[var(--shadow-pop)] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:h-[min(720px,90dvh)] sm:w-[400px] sm:rounded-3xl",
              )}
              aria-label="DukaanPilot AI assistant"
              role={wide ? "complementary" : "dialog"}
            >
              <AssistantPanel onClose={() => setAssistantOpen(false)} />
            </aside>
          </>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
          {NAV.filter((n) => n.mobile).slice(0, 2).map((n) => (
            <MobileTab key={n.href} {...n} active={active(n.href)} />
          ))}
          <button
            onClick={() => setAssistantOpen(true)}
            className="-mt-6 flex flex-col items-center gap-1 text-[10.5px] font-medium text-forest"
            aria-label="Open DukaanPilot AI"
          >
            <span className="grid size-14 place-items-center rounded-full bg-forest text-lime shadow-[var(--shadow-pop)] ring-4 ring-white">
              <Mic className="size-6" aria-hidden />
            </span>
            Ask AI
          </button>
          {NAV.filter((n) => n.mobile).slice(2, 4).map((n) => (
            <MobileTab key={n.href} {...n} active={active(n.href)} />
          ))}
        </div>
      </nav>
      {!wide && !assistantOpen && <span className="sr-only">Press Ctrl+J to open the assistant</span>}
      {!assistantOpen && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-6 right-6 z-30 hidden items-center gap-2 rounded-full bg-forest py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-[var(--shadow-pop)] hover:bg-forest-700 lg:flex"
        >
          <Mic className="size-4 text-lime" aria-hidden /> Ask DukaanPilot AI
        </button>
      )}
    </div>
  );
}

function MobileTab({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof X; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx("flex flex-col items-center gap-1 py-1.5 text-[10.5px] font-medium", active ? "text-forest" : "text-muted")}
    >
      <span className={clsx("grid h-7 w-12 place-items-center rounded-full", active && "bg-lime")}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      {label}
    </Link>
  );
}
