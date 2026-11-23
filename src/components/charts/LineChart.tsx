"use client";

import { useRef, useState } from "react";
import { fmt } from "@/lib/abc/format";

export interface Series {
  id: string;
  label: string;
  color: string;
  points: { x: number; y: number }[];
}

/**
 * Minimal SVG line chart: one y-axis, solid hairline grid, 2px lines,
 * crosshair + tooltip listing every series, selective endpoint labels.
 */
export function LineChart({
  series,
  xDomain,
  log,
  xLabel,
  height = 230,
  width = 560,
  yFormat = (v: number) => fmt(v, 4),
  endLabels = true,
}: {
  series: Series[];
  xDomain: [number, number];
  log: boolean;
  xLabel: string;
  height?: number;
  /** viewBox width: use a larger value for wide containers so text stays small */
  width?: number;
  yFormat?: (v: number) => string;
  endLabels?: boolean;
}) {
  const W = width,
    H = height,
    L = 58,
    R = endLabels && series.length > 1 ? 92 : 16,
    T = 12,
    B = 34;
  const PW = W - L - R,
    PH = H - T - B;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const tr = (v: number) => (log ? Math.log10(Math.max(v, 1e-16)) : v);
  const ys = series.flatMap((s) => s.points.map((p) => tr(p.y))).filter(Number.isFinite);
  let y0 = ys.length ? Math.min(...ys) : 0,
    y1 = ys.length ? Math.max(...ys) : 1;
  if (log) {
    y0 = Math.floor(y0);
    y1 = Math.ceil(y1);
    if (y1 === y0) y1 = y0 + 1;
  } else {
    const pad = (y1 - y0) * 0.08 || 1;
    y0 -= pad;
    y1 += pad;
  }
  const [x0, x1] = xDomain;
  const sx = (x: number) => L + ((x - x0) / (x1 - x0 || 1)) * PW;
  const sy = (y: number) => T + (1 - (tr(y) - y0) / (y1 - y0)) * PH;

  const yTicks: number[] = [];
  if (log) {
    const step = Math.max(1, Math.ceil((y1 - y0) / 6));
    for (let e = y0; e <= y1; e += step) yTicks.push(Math.pow(10, e));
  } else for (let i = 0; i <= 4; i++) yTicks.push(y0 + ((y1 - y0) * i) / 4);
  const xTicks = Array.from({ length: 6 }, (_, i) => Math.round(x0 + ((x1 - x0) * i) / 5));

  const onMove = (e: React.PointerEvent) => {
    const svg = ref.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const x = x0 + ((px - L) / PW) * (x1 - x0);
    setHover(Math.max(x0, Math.min(x1, x)));
  };

  const nearest = (s: Series, x: number) => {
    let best = s.points[0];
    for (const p of s.points) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    return best;
  };

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
      >
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={L + PW} y1={sy(v)} y2={sy(v)} stroke="#2b2540" strokeWidth="1" />
            <text x={L - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#a39cb8" className="num">
              {log ? `1e${Math.round(Math.log10(v))}` : fmt(v, 3)}
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={v} x={sx(v)} y={T + PH + 16} textAnchor="middle" fontSize="11" fill="#a39cb8" className="num">
            {v}
          </text>
        ))}
        <line x1={L} x2={L + PW} y1={T + PH} y2={T + PH} stroke="#4b4170" />
        <text x={L + PW / 2} y={H - 2} textAnchor="middle" fontSize="11.5" fill="#a39cb8">
          {xLabel}
        </text>
        {series.map((s) => {
          if (!s.points.length) return null;
          const d = s.points.map((p, i) => `${i ? "L" : "M"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
          const last = s.points[s.points.length - 1];
          return (
            <g key={s.id}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
              <circle cx={sx(last.x)} cy={sy(last.y)} r="4" fill={s.color} stroke="#15121f" strokeWidth="2" />
              {endLabels && series.length > 1 && (
                <text x={sx(last.x) + 8} y={sy(last.y) + 4} fontSize="11" fill="#ece9f5">
                  {s.label}
                </text>
              )}
            </g>
          );
        })}
        {hover !== null && series[0]?.points.length > 0 && (
          <g>
            <line x1={sx(nearest(series[0], hover).x)} x2={sx(nearest(series[0], hover).x)} y1={T} y2={T + PH} stroke="#ece9f5" strokeWidth="1" opacity="0.5" />
            {series.map((s) => {
              const p = nearest(s, hover);
              return p ? <circle key={s.id} cx={sx(p.x)} cy={sy(p.y)} r="4" fill={s.color} stroke="#15121f" strokeWidth="2" /> : null;
            })}
          </g>
        )}
      </svg>
      {hover !== null && series[0]?.points.length > 0 && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-hive-border bg-hive-bg/95 px-3 py-2 text-xs shadow-lg"
          style={{ left: `${Math.min(70, Math.max(8, ((sx(hover) - L) / W) * 100))}%` }}
        >
          <div className="mb-1 text-hive-muted">
            {xLabel} {fmt(nearest(series[0], hover).x, 0)}
          </div>
          {series.map((s) => {
            const p = nearest(s, hover);
            return (
              <div key={s.id} className="num flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-hive-muted">{s.label}</span>
                <span className="ml-auto pl-3 text-hive-text">{p ? yFormat(p.y) : "–"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
