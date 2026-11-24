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

/** onlookers recruited to a source this cycle: up to 3 dots, then "+n" */
function TallyDots({ n, r0, angle }: { n: number; r0: number; angle: number }) {
  const shown = Math.min(n, n > 3 ? 2 : 3);
  const [lx, ly] = polar(r0 + shown * 7 + 4, angle);
  return (
    <g>
      {Array.from({ length: shown }, (_, k) => {
        const [tx, ty] = polar(r0 + k * 7, angle);
        return <circle key={k} cx={tx} cy={ty} r="2.8" fill="#0284c7" />;
      })}
      {n > shown && (
        <text x={lx} y={ly + 3} textAnchor="middle" fontSize="9" fill="#0369a1">
          +{n - shown}
        </text>
      )}
    </g>
  );
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
        <circle cx={C} cy={C} r={R} fill="none" stroke="#e7e5e0" strokeWidth="1.5" />
        <text x={C} y={C - 6} textAnchor="middle" fontSize="12.5" fill="#6b675f">
          Onlookers wait in the hive…
        </text>
        <text x={C} y={C + 12} textAnchor="middle" fontSize="11" fill="#a8a29e">
          p comes after the employed phase
        </text>
      </g>
    );
  } else if (selection === "sweep") {
    const a = (2 * Math.PI) / Np;
    body = (
      <g>
        <circle cx={C} cy={C} r={R} fill="none" stroke="#d6d3cc" strokeWidth="1" />
        <circle cx={C} cy={C} r={R0 + 0.1 * (R - R0)} fill="none" stroke="#d6d3cc" strokeWidth="1" strokeDasharray="0" />
        {prob.map((p, m) => {
          const a0 = m * a + 0.02,
            a1 = (m + 1) * a - 0.02;
          const active = activeM === m;
          const [lx, ly] = polar(R + 14, (m + 0.5) * a);
          return (
            <g key={m}>
              <path d={sector(R0, R, a0, a1)} fill="#f3f2ee" />
              <path
                d={sector(R0, R0 + p * (R - R0), a0, a1)}
                fill="#f59e0b"
                opacity={active ? 0.95 : 0.45}
                stroke={active ? "#1f1d1a" : "none"}
                strokeWidth="1.5"
              >
                <title>{`Source ${m + 1}: p = ${fmt(p)}`}</title>
              </path>
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fontWeight={active ? 700 : 500} fill={active ? "#1f1d1a" : "#6b675f"}>
                {m + 1}
              </text>
              <TallyDots n={tally[m] ?? 0} r0={R + 24} angle={(m + 0.5) * a} />
            </g>
          );
        })}
        {d?.method === "sweep" && (
          <path
            d={sector(R0 + d.r * (R - R0) - 1.5, R0 + d.r * (R - R0) + 1.5, d.m * a - 0.05, (d.m + 1) * a + 0.05)}
            fill={d.recruited ? "#0284c7" : "#78716c"}
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
                stroke="#ffffff"
                strokeWidth="2"
              >
                <title>{`Source ${m + 1}: p = ${fmt(prob[m])}, slice = ${fmt((prob[m] / total) * 100, 1)}%`}</title>
              </path>
              {a1 - a0 > 0.24 && (
                <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fontWeight={active ? 700 : 500} fill={active ? "#1c1206" : "#78350f"}>
                  {m + 1}
                </text>
              )}
              <TallyDots n={tally[m] ?? 0} r0={R + 9} angle={mid} />
            </g>
          );
        })}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${C}px ${C}px`, transition: `transform ${Math.max(dur, 250) * 1.6}ms cubic-bezier(0.2, 0.8, 0.2, 1)` }}>
          <line x1={C} y1={C} x2={C} y2={C - R - 6} stroke="#1f1d1a" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={C} cy={C - R - 6} r="4" fill="#1f1d1a" />
        </g>
        <circle cx={C} cy={C} r="7" fill="#1f1d1a" />
      </g>
    );
  }

  return (
    <section>
      <div className="label mb-1">{selection === "sweep" ? "How onlookers pick a flower (r < p)" : "How onlookers pick a flower (roulette wheel)"}</div>
      <div className="flex items-center gap-4">
        <svg viewBox={`0 0 ${S} ${S}`} className="w-[230px] shrink-0" role="img" aria-label="Onlooker selection wheel">
          {body}
        </svg>
        <div className="space-y-2 text-[12.5px] leading-relaxed text-hive-muted">
          {selection === "sweep" ? (
            <p>
              Each petal&apos;s length is the flower&apos;s chance <b className="text-stone-800">p</b>. Onlookers check the flowers one by one
              with a random number r (the thin arc). If the arc is <span className="text-sky-700">inside the petal</span> (r &lt; p), an
              onlooker goes there.
            </p>
          ) : (
            <p>
              Each slice is a flower. Better flowers get <b className="text-stone-800">bigger slices</b>, so the spinning pointer lands on
              them more often. That is the positive feedback.
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-onlooker" /> = onlookers sent there this cycle
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
