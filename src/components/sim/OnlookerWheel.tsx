"use client";

import { fmt } from "@/lib/abc/format";
import type { Selection, Step } from "@/lib/abc/types";

const S = 280,
  C = S / 2,
  R = 104,
  R0 = 18;

const polar = (r: number, a: number) => [C + r * Math.sin(a), C - r * Math.cos(a)] as const;

function sector(r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  return `M ${x0} ${y0} A ${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function OnlookerWheel({
  step,
  prob,
  selection,
  tally,
  dur,
}: {
  step: Step;
  prob: number[] | null;
  selection: Selection;
  tally: number[];
  dur: number;
}) {
  const Np = step.snap.X.length;
  const d = step.kind === "onlooker-choice" ? step.detail : null;
  const activeM =
    d?.m ?? (step.phase === "onlooker" && (step.kind === "candidate" || step.kind === "select") ? step.detail.m : null);

  let body: React.ReactNode;
  if (!prob) {
    body = (
      <g>
        <circle cx={C} cy={C} r={R} fill="none" stroke="#2b2540" strokeWidth="1.5" />
        <text x={C} y={C - 6} textAnchor="middle" fontSize="12.5" fill="#a39cb8">
          Onlookers wait in the hive…
        </text>
        <text x={C} y={C + 12} textAnchor="middle" fontSize="11" fill="#6b6385">
          p comes after the employed phase
        </text>
      </g>
    );
  } else if (selection === "sweep") {
    const a = (2 * Math.PI) / Np;
    body = (
      <g>
        <circle cx={C} cy={C} r={R} fill="none" stroke="#3b3357" strokeWidth="1" />
        <circle cx={C} cy={C} r={R0 + 0.1 * (R - R0)} fill="none" stroke="#3b3357" strokeWidth="1" strokeDasharray="0" />
        {prob.map((p, m) => {
          const a0 = m * a + 0.02,
            a1 = (m + 1) * a - 0.02;
          const active = activeM === m;
          const [lx, ly] = polar(R + 14, (m + 0.5) * a);
          return (
            <g key={m}>
              <path d={sector(R0, R, a0, a1)} fill="#ffffff" opacity="0.03" />
              <path
                d={sector(R0, R0 + p * (R - R0), a0, a1)}
                fill="#f59e0b"
                opacity={active ? 0.95 : 0.45}
                stroke={active ? "#fff" : "none"}
                strokeWidth="1.5"
              >
                <title>{`Source ${m + 1}: p = ${fmt(p)}`}</title>
              </path>
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fontWeight={active ? 700 : 500} fill={active ? "#fff" : "#a39cb8"}>
                {m + 1}
              </text>
              {Array.from({ length: tally[m] ?? 0 }, (_, k) => {
                const [tx, ty] = polar(R + 26 + k * 7, (m + 0.5) * a);
                return <circle key={k} cx={tx} cy={ty} r="2.8" fill="#38bdf8" />;
              })}
            </g>
          );
        })}
        {d?.method === "sweep" && (
          <path
            d={sector(R0 + d.r * (R - R0) - 1.5, R0 + d.r * (R - R0) + 1.5, d.m * a - 0.05, (d.m + 1) * a + 0.05)}
            fill={d.recruited ? "#38bdf8" : "#e4e4e7"}
          />
        )}
      </g>
    );
  } else {
    const total = prob.reduce((s, p) => s + p, 0);
    const cum = prob.map((_, i) => prob.slice(0, i + 1).reduce((a, b) => a + b, 0));
    const slices = prob.map((p, i) => [((cum[i] - p) / total) * 2 * Math.PI, (cum[i] / total) * 2 * Math.PI] as const);
    const angle = d?.method === "roulette" ? (d.spin / d.total) * 360 + 720 * d.onlookerNo : 0;
    body = (
      <g>
        {slices.map(([a0, a1], m) => {
          const active = activeM === m;
          const mid = (a0 + a1) / 2;
          const [lx, ly] = polar(R * 0.72, mid);
          return (
            <g key={m}>
              <path
                d={sector(R0, R, a0, a1)}
                fill="#f59e0b"
                opacity={active ? 0.95 : 0.4}
                stroke="#15121f"
                strokeWidth="2"
              >
                <title>{`Source ${m + 1}: p = ${fmt(prob[m])}, slice = ${fmt((prob[m] / total) * 100, 1)}%`}</title>
              </path>
              {a1 - a0 > 0.24 && (
                <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fontWeight={active ? 700 : 500} fill={active ? "#1c1206" : "#f5f3ff"}>
                  {m + 1}
                </text>
              )}
              {Array.from({ length: tally[m] ?? 0 }, (_, k) => {
                const [tx, ty] = polar(R + 9 + k * 7, mid);
                return <circle key={k} cx={tx} cy={ty} r="2.8" fill="#38bdf8" />;
              })}
            </g>
          );
        })}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${C}px ${C}px`, transition: `transform ${Math.max(dur, 250) * 1.6}ms cubic-bezier(0.2, 0.8, 0.2, 1)` }}>
          <line x1={C} y1={C} x2={C} y2={C - R - 6} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={C} cy={C - R - 6} r="4" fill="#fff" />
        </g>
        <circle cx={C} cy={C} r="7" fill="#fff" />
      </g>
    );
  }

  return (
    <section className="card p-4">
      <div className="label mb-1">{selection === "sweep" ? "Onlooker selection: r < pₘ (slides)" : "Onlooker selection: roulette wheel"}</div>
      <div className="flex items-center gap-4">
        <svg viewBox={`0 0 ${S} ${S}`} className="w-[230px] shrink-0" role="img" aria-label="Onlooker selection wheel">
          {body}
        </svg>
        <div className="space-y-2 text-[12.5px] leading-relaxed text-hive-muted">
          {selection === "sweep" ? (
            <>
              <p>
                Each petal&apos;s length is p<sub>m</sub>. Onlookers visit the sources in turn and draw a random r, shown as
                the thin arc.
              </p>
              <p>
                If the arc falls <span className="text-onlooker">inside the petal</span> (r &lt; p<sub>m</sub>), an onlooker is
                recruited. Otherwise the source is skipped.
              </p>
            </>
          ) : (
            <>
              <p>
                Each slice is p<sub>m</sub>/Σp of the wheel. Each onlooker spins once, and the pointer picks the food source.
              </p>
              <p>Richer sources have bigger slices, so they attract more onlookers. This is the positive feedback.</p>
            </>
          )}
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-onlooker" /> = onlookers recruited this cycle
          </p>
          {d?.method === "sweep" && (
            <p className="num text-hive-text">
              r = {fmt(d.r, 3)} {d.recruited ? "<" : "≥"} p{d.m + 1} = {fmt(d.p, 3)}
            </p>
          )}
          {d?.method === "roulette" && (
            <p className="num text-hive-text">
              spin = {fmt(d.spin, 3)} of Σp = {fmt(d.total, 3)} → source {d.m + 1}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
