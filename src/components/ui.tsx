import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Card({ className, ...p }: ComponentProps<"div">) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]",
        className,
      )}
      {...p}
    />
  );
}

export function CardHeader({
  title,
  action,
  sub,
}: {
  title: ReactNode;
  action?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

type BtnVariant = "primary" | "lime" | "outline" | "ghost";
const btn: Record<BtnVariant, string> = {
  primary: "bg-forest text-white hover:bg-forest-700",
  lime: "bg-lime text-forest hover:bg-lime-600",
  outline: "border border-line bg-white text-ink hover:bg-cream-100",
  ghost: "text-ink hover:bg-cream-200",
};
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 h-10 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function Button({
  variant = "primary",
  className,
  ...p
}: ComponentProps<"button"> & { variant?: BtnVariant }) {
  return <button className={clsx(btnBase, btn[variant], className)} {...p} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...p
}: ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return <Link className={clsx(btnBase, btn[variant], className)} {...p} />;
}

export type Tone = "success" | "warning" | "info" | "danger" | "neutral" | "forest";
const tones: Record<Tone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  info: "bg-info-bg text-info",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-cream-200 text-muted",
  forest: "bg-forest text-lime",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

export function IconTile({
  icon: Icon,
  tone = "lime",
  className,
}: {
  icon: LucideIcon;
  tone?: "lime" | "cream" | "peach" | "sky" | "forest";
  className?: string;
}) {
  const t = {
    lime: "bg-lime/50 text-forest",
    cream: "bg-cream-200 text-forest",
    peach: "bg-[#fde3d2] text-[#c2531f]",
    sky: "bg-[#dcecf3] text-[#1f5d78]",
    forest: "bg-forest text-lime",
  }[tone];
  return (
    <span className={clsx("grid size-11 shrink-0 place-items-center rounded-xl", t, className)}>
      <Icon className="size-5" strokeWidth={2} aria-hidden />
    </span>
  );
}

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-cream-200 text-forest">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const palette = ["#f4d9c6", "#d8ead1", "#d6e4f0", "#efe1f3", "#f6ecc4", "#d9efe9"];
  const idx = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
  const ini = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={clsx("grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-forest", className)}
      style={{ background: palette[idx] }}
      aria-hidden
    >
      {ini}
    </span>
  );
}

export function Tabs({
  items,
  active,
}: {
  items: { label: string; href: string; count?: number; key: string }[];
  active: string;
}) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Filters">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={clsx(
            "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            t.key === active ? "bg-forest text-white" : "border border-line bg-white text-muted hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1 opacity-70">({t.count})</span>}
        </Link>
      ))}
    </nav>
  );
}
