import clsx from "clsx";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx("size-8", className)} aria-hidden>
      <path
        d="M9 11V9.5a7 7 0 0 1 14 0V11"
        fill="none"
        stroke="#D7F36A"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <rect x="4.5" y="10.5" width="23" height="18" rx="5" fill="#D7F36A" />
      <path d="M11 20.5l3.4 3.2L21.5 16" fill="none" stroke="#123C2D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ dark = true }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={clsx("text-[21px] font-bold tracking-tight", dark ? "text-white" : "text-forest")}>
        DukaanPilot
      </span>
    </span>
  );
}
