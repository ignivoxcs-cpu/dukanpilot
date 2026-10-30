"use client";

import { useId, useState } from "react";
import { formatCompactINR, formatDay, formatINR } from "@/lib/format";

export function SalesChart({ points }: { points: { day: string; paise: number }[] }) {
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 520, H = 250, L = 44, R = 16, T = 16, B = 28;
  const max = Math.max(...points.map((p) => p.paise), 1);
  const nice = niceMax(max);
  const x = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / nice);
  const line = smooth(points.map((p, i) => [x(i), y(p.paise)]));
  const area = `${line} L${x(points.length - 1)},${H - B} L${x(0)},${H - B} Z`;
  const active = hover ?? points.length - 1;
  const every = Math.ceil(points.length / 7);
  const total = points.reduce((s, p) => s + p.paise, 0);

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Sales chart, total ${formatINR(total)} over ${points.length} days`}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1f8a4c" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#1f8a4c" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(nice * f)} y2={y(nice * f)} stroke="#ece6d6" strokeDasharray={f ? "3 4" : undefined} />
            <text x={L - 8} y={y(nice * f) + 4} textAnchor="end" className="fill-muted text-[11px]">{formatCompactINR(nice * f)}</text>
          </g>
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke="#1f8a4c" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.day}>
            {(i % every === 0 || i === points.length - 1) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted text-[11px]">{formatDay(p.day)}</text>
            )}
            <rect x={x(i) - (W - L - R) / points.length / 2} y={T} width={(W - L - R) / points.length} height={H - T - B}
              fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1}>
              <title>{`${formatDay(p.day)}: ${formatINR(p.paise)}`}</title>
            </rect>
          </g>
        ))}
        <circle cx={x(active)} cy={y(points[active]!.paise)} r="5" fill="#fff" stroke="#1f8a4c" strokeWidth="3" />
      </svg>
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-forest px-2.5 py-1.5 text-center text-white shadow-[var(--shadow-pop)]"
        style={{ left: `${Math.min(Math.max((x(active) / W) * 100, 14), 86)}%`, top: `${(y(points[active]!.paise) / H) * 100 - 4}%` }}
      >
        <p className="text-[10px] opacity-70">{formatDay(points[active]!.day, { year: "numeric" })}</p>
        <p className="tabular text-sm font-bold">{formatINR(points[active]!.paise)}</p>
      </div>
    </figure>
  );
}

function niceMax(v: number) {
  const r = v / 100;
  const mag = Math.pow(10, Math.floor(Math.log10(r)));
  const n = Math.ceil(r / mag / 2) * 2 * mag;
  return Math.max(n, 1) * 100;
}

function smooth(pts: number[][]) {
  if (pts.length < 2) return `M${pts[0]![0]},${pts[0]![1]}`;
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1] ?? pts[i]!;
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[i + 1]!;
    const [x3, y3] = pts[i + 2] ?? pts[i + 1]!;
    const c1x = x1! + (x2! - x0!) / 6, c1y = y1! + (y2! - y0!) / 6;
    const c2x = x2! - (x3! - x1!) / 6, c2y = y2! - (y3! - y1!) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`;
  }
  return d;
}
