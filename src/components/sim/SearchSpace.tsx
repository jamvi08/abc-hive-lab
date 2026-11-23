"use client";

import { useMemo } from "react";
import { fmt } from "@/lib/abc/format";
import type { AbcConfig, ConvergencePoint, Step, Vec } from "@/lib/abc/types";
import { heatmapFor, RAMP_CSS } from "@/lib/heatmap";
import { useIsClient } from "@/lib/useIsClient";
import { BeeGlyph, FlowerGlyph, HiveGlyph, ROLE_COLOR, StarGlyph, type Role } from "./glyphs";

const ML = 50,
  MT = 22,
  PW = 500,
  PH = 500,
  MR = 26,
  MB = 40;
/** glyphs may overflow the bounds frame by this much (sources sitting on a bound) */
const BLEED = 18;
const W = ML + PW + MR,
  H = MT + PH + MB;

interface Props {
  cfg: AbcConfig;
  heatKey: string;
  step: Step | undefined;
  convergence: ConvergencePoint[];
  showTrails: boolean;
  showOptimum: boolean;
  /** animation duration in ms */
  dur: number;
  compact?: boolean;
}

function ticks(lo: number, hi: number, n = 5) {
  return Array.from({ length: n }, (_, i) => lo + (i * (hi - lo)) / (n - 1));
}

export function SearchSpace({ cfg, heatKey, step, convergence, showTrails, showOptimum, dur, compact }: Props) {
  const { problem, limit } = cfg;
  const { lb, ub } = problem;
  const isClient = useIsClient();
  const heat = useMemo(() => (isClient ? heatmapFor(problem, heatKey) : null), [isClient, problem, heatKey]);

  const sx = (x: number) => ML + ((x - lb[0]) / (ub[0] - lb[0])) * PW;
  const sy = (y: number) => MT + (1 - (y - lb[1]) / (ub[1] - lb[1])) * PH;
  const P = (v: Vec) => [sx(v[0]), sy(v[1])] as const;
  const hive = [ML + 26, MT + 26] as const;

  const snap = step?.snap;
  const Np = snap?.X.length ?? 0;

  // flower size by fitness rank (nectar)
  const sizes = useMemo(() => {
    if (!snap) return [];
    const order = snap.fit.map((f, i) => [f, i] as const).sort((a, b) => a[0] - b[0]);
    const s = new Array(Np).fill(9);
    order.forEach(([, i], r) => (s[i] = 6.5 + (Np > 1 ? (7 * r) / (Np - 1) : 5)));
    return s;
  }, [snap, Np]);

  if (!step || !snap) return <div className="card aspect-square" />;

  // ---- actor bee -------------------------------------------------------
  let bee: { pos: readonly [number, number]; role: Role; visible: boolean; waggle?: boolean } = {
    pos: hive,
    role: "employed",
    visible: false,
  };
  let focusM: number | null = null;
  switch (step.kind) {
    case "candidate":
      bee = { pos: P(step.detail.v), role: step.detail.bee, visible: true };
      focusM = step.detail.m;
      break;
    case "select":
      bee = { pos: P(step.detail.accepted ? step.detail.v : step.detail.xOld), role: step.detail.bee, visible: true };
      focusM = step.detail.m;
      break;
    case "probabilities":
      bee = { pos: hive, role: "employed", visible: true, waggle: true };
      break;
    case "onlooker-choice": {
      const d = step.detail;
      const go = d.method === "roulette" || d.recruited;
      bee = { pos: go ? P(snap.X[d.m]) : hive, role: "onlooker", visible: true };
      focusM = d.m;
      break;
    }
    case "scout-check":
      bee = step.detail.abandon.length
        ? { pos: P(snap.X[step.detail.abandon[0]]), role: "scout", visible: true }
        : { pos: hive, role: "scout", visible: false };
      break;
    case "scout-replace":
      bee = { pos: P(step.detail.newX), role: "scout", visible: true };
      focusM = step.detail.m;
      break;
    case "memorize":
      bee = { pos: P(snap.best.x), role: "employed", visible: false };
      break;
  }

  const t = (ms: number) => ({ transitionDuration: `${ms}ms` });
  const trailPts = showTrails ? convergence.slice(Math.max(0, convergence.length - 80), -1) : [];

  return (
    <div className="card overflow-hidden p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Search space with food sources and bees">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
          <clipPath id="plot">
            <rect x={ML - BLEED} y={MT - BLEED} width={PW + 2 * BLEED} height={PH + 2 * BLEED} />
          </clipPath>
        </defs>

        {/* landscape */}
        <rect x={ML} y={MT} width={PW} height={PH} fill="#1e0b47" />
        {heat && <image href={heat.url} x={ML} y={MT} width={PW} height={PH} preserveAspectRatio="none" />}
        <rect x={ML} y={MT} width={PW} height={PH} fill="none" stroke="#3b3357" />

        {/* axes */}
        {ticks(lb[0], ub[0]).map((v) => (
          <g key={`x${v}`}>
            <line x1={sx(v)} x2={sx(v)} y1={MT + PH} y2={MT + PH + 5} stroke="#6b6385" />
            <text x={sx(v)} y={MT + PH + 18} textAnchor="middle" fontSize="12" fill="#a39cb8" className="num">
              {fmt(v, 2)}
            </text>
          </g>
        ))}
        {ticks(lb[1], ub[1]).map((v) => (
          <g key={`y${v}`}>
            <line x1={ML - 5} x2={ML} y1={sy(v)} y2={sy(v)} stroke="#6b6385" />
            <text x={ML - 8} y={sy(v) + 4} textAnchor="end" fontSize="12" fill="#a39cb8" className="num">
              {fmt(v, 2)}
            </text>
          </g>
        ))}
        <text x={ML + PW / 2} y={H - 4} textAnchor="middle" fontSize="13" fill="#ece9f5" fontStyle="italic">
          x₁
        </text>
        <text x={12} y={MT + PH / 2} textAnchor="middle" fontSize="13" fill="#ece9f5" fontStyle="italic">
          x₂
        </text>

        <g clipPath="url(#plot)">
          {/* hive */}
          <g transform={`translate(${hive[0]},${hive[1]})`}>
            <HiveGlyph size={17} />
            <title>The hive: onlookers wait here and watch the dances</title>
          </g>

          {/* trails */}
          {trailPts.map((c, ci) =>
            c.X.map((x, m) => (
              <circle
                key={`t${c.cycle}-${m}`}
                cx={sx(x[0])}
                cy={sy(x[1])}
                r={1.7}
                fill="#fff"
                opacity={0.12 + (0.35 * (ci + 1)) / trailPts.length}
              />
            )),
          )}

          {/* true optimum */}
          {showOptimum &&
            problem.optimum?.xs.map((o, i) => (
              <g key={`o${i}`} transform={`translate(${sx(o[0])},${sy(o[1])})`}>
                <path d="M -7 0 H 7 M 0 -7 V 7" stroke="#34d399" strokeWidth="2" />
                <circle r="4" fill="none" stroke="#34d399" strokeWidth="1.2" />
                <title>True minimum: f = {fmt(problem.optimum!.f, 4)}</title>
              </g>
            ))}

          {/* step-specific overlays (under the flowers) */}
          <Overlay step={step} P={P} hive={hive} limit={limit} />

          {/* food sources */}
          {snap.X.map((x, m) => {
            const [px, py] = P(x);
            const tr = snap.trial[m];
            const frac = Math.min(1, tr / (limit + 1));
            const over = tr > limit;
            const r = sizes[m];
            const ringR = r + 5;
            const circ = 2 * Math.PI * ringR;
            const focused = focusM === m;
            return (
              <g key={`src${m}`} className="move" style={{ ...t(dur), transform: `translate(${px}px, ${py}px)` }}>
                {focused && <circle r={r + 11} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" opacity="0.9" />}
                {tr > 0 && (
                  <circle
                    r={ringR}
                    fill="none"
                    stroke={over ? "#f87171" : "#fde68a"}
                    strokeWidth="2.6"
                    strokeDasharray={`${circ * frac} ${circ}`}
                    transform="rotate(-90)"
                    strokeLinecap="round"
                  />
                )}
                <FlowerGlyph size={r} />
                <text
                  x={r + 4}
                  y={-r - 1}
                  fontSize="12"
                  fontWeight="700"
                  fill="#fff"
                  stroke="#0c0a14"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {m + 1}
                </text>
                <title>
                  {`Food source ${m + 1}\nx = (${x.map((v) => fmt(v)).join(", ")})\nf = ${fmt(snap.f[m])}\nfit = ${fmt(snap.fit[m])}\ntrial t = ${tr} (limit ${limit})${snap.prob ? `\np = ${fmt(snap.prob[m])}` : ""}`}
                </title>
              </g>
            );
          })}

          {/* probability labels */}
          {step.kind === "probabilities" &&
            snap.X.map((x, m) => (
              <text
                key={`p${m}`}
                x={sx(x[0])}
                y={sy(x[1]) + sizes[m] + 16}
                textAnchor="middle"
                fontSize="11.5"
                fontWeight="600"
                fill="#fde68a"
                stroke="#0c0a14"
                strokeWidth="3"
                paintOrder="stroke"
                className="num"
              >
                p={fmt(snap.prob![m], 2)}
              </text>
            ))}

          {/* best so far */}
          <g className="move" style={{ ...t(dur), transform: `translate(${sx(snap.best.x[0])}px, ${sy(snap.best.x[1])}px)` }}>
            {step.kind === "memorize" && <circle r="10" fill="none" stroke="#fde047" strokeWidth="2" className="pulse" />}
            <g transform="translate(0,-1)">
              <StarGlyph r={8} />
            </g>
            <title>{`Best so far: f = ${fmt(snap.best.f, 6)}`}</title>
          </g>

          {/* actor bee */}
          <g
            className="move"
            style={{ ...t(dur), transform: `translate(${bee.pos[0] + 12}px, ${bee.pos[1] - 14}px)`, opacity: bee.visible ? 1 : 0 }}
          >
            <BeeGlyph role={bee.role} scale={1.05} waggle={bee.waggle} />
          </g>
        </g>
      </svg>

      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[12px] text-hive-muted">
          <span className="flex items-center gap-1.5">
            <svg width="18" height="18" viewBox="-9 -9 18 18">
              <FlowerGlyph size={6} />
            </svg>
            food source (bigger = more nectar)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="18" viewBox="-9 -9 18 18">
              <circle r="7" fill="none" stroke="#fde68a" strokeWidth="2" strokeDasharray="22 44" transform="rotate(-90)" />
            </svg>
            trial counter t (red when t &gt; limit)
          </span>
          {(["employed", "onlooker", "scout"] as Role[]).map((r) => (
            <span key={r} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLOR[r] }} />
              {r}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="-8 -8 16 16">
              <StarGlyph r={7} />
            </svg>
            best so far
          </span>
          {showOptimum && problem.optimum && (
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="-7 -7 14 14">
                <path d="M -6 0 H 6 M 0 -6 V 6" stroke="#34d399" strokeWidth="2" />
              </svg>
              true minimum
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            low f
            <span className="inline-block h-2.5 w-24 rounded" style={{ background: RAMP_CSS }} />
            high f
          </span>
        </div>
      )}
    </div>
  );
}

function Overlay({
  step,
  P,
  hive,
  limit,
}: {
  step: Step;
  P: (v: Vec) => readonly [number, number];
  hive: readonly [number, number];
  limit: number;
}) {
  const snap = step.snap;
  // labels near the right edge are flipped to the left of their anchor
  const label = (x: number, y: number, text: string, color = "#fff") => {
    const flip = x > ML + PW - 150;
    return (
      <text
        x={flip ? x - 30 : x}
        y={Math.min(y, MT + PH + 4)}
        textAnchor={flip ? "end" : "start"}
        fontSize="12"
        fontWeight="600"
        fill={color}
        stroke="#0c0a14"
        strokeWidth="3.2"
        paintOrder="stroke"
      >
        {text}
      </text>
    );
  };

  switch (step.kind) {
    case "candidate":
    case "select": {
      const d = step.detail;
      const [ox, oy] = P(d.xOld);
      const [kx, ky] = P(d.xk);
      const [vx, vy] = P(d.v);
      const col = ROLE_COLOR[d.bee];
      if (step.kind === "candidate")
        return (
          <g>
            <line x1={ox} y1={oy} x2={kx} y2={ky} stroke="#c4b5fd" strokeWidth="1.6" strokeDasharray="5 4" opacity="0.9" />
            <circle cx={kx} cy={ky} r="17" fill="none" stroke="#c4b5fd" strokeWidth="2" />
            {label(kx + 14, ky + 26, `partner k=${d.k + 1}`, "#ddd6fe")}
            {(Math.abs(vx - ox) > 2 || Math.abs(vy - oy) > 2) && (
              <line x1={ox} y1={oy} x2={vx} y2={vy} stroke={col} strokeWidth="2.5" markerEnd="url(#arrow)" />
            )}
            <circle cx={vx} cy={vy} r="8" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3 2" />
            {label(vx + 10, vy + 22, d.wasClamped ? `v (clipped at bound)` : `v: only x${d.j === 0 ? "₁" : "₂"} changes`)}
          </g>
        );
      const sd = step.detail;
      return sd.accepted ? (
        <g>
          <circle cx={ox} cy={oy} r="7" fill="none" stroke="#a39cb8" strokeDasharray="2 2" />
          {(Math.abs(vx - ox) > 2 || Math.abs(vy - oy) > 2) && (
            <line x1={ox} y1={oy} x2={vx} y2={vy} stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrow)" />
          )}
          {label(vx + 12, vy + 24, "✓ moved (fit ↑, t = 0)", "#6ee7b7")}
        </g>
      ) : (
        <g>
          <line x1={ox} y1={oy} x2={vx} y2={vy} stroke="#f87171" strokeWidth="1.6" strokeDasharray="4 4" />
          <g transform={`translate(${vx},${vy})`}>
            <circle r="8" fill="#0c0a14" fillOpacity="0.6" stroke="#f87171" strokeWidth="2" />
            <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke="#f87171" strokeWidth="2.2" />
          </g>
          {label(vx + 12, vy + 24, `✗ worse: stay, t = ${sd.trialAfter}`, "#fca5a5")}
        </g>
      );
    }
    case "onlooker-choice": {
      const d = step.detail;
      const [x, y] = P(snap.X[d.m]);
      const ok = d.method === "roulette" || d.recruited;
      return (
        <g>
          {ok && <line x1={hive[0]} y1={hive[1]} x2={x} y2={y} stroke="#38bdf8" strokeWidth="1.8" strokeDasharray="6 5" opacity="0.85" />}
          <circle cx={x} cy={y} r="20" fill="none" stroke={ok ? "#38bdf8" : "#6b6385"} strokeWidth="2.5" />
          {d.method === "sweep"
            ? label(x + 18, y + 30, `r=${fmt(d.r, 2)} ${d.recruited ? "<" : "≥"} p=${fmt(d.p, 2)}`, ok ? "#bae6fd" : "#c4c0d4")
            : label(x + 18, y + 30, `onlooker #${d.onlookerNo}`, "#bae6fd")}
        </g>
      );
    }
    case "scout-check":
      return (
        <g>
          {step.detail.abandon.map((m) => {
            const [x, y] = P(snap.X[m]);
            return (
              <g key={m}>
                <circle cx={x} cy={y} r="21" fill="none" stroke="#fb7185" strokeWidth="2.5" />
                {label(x + 16, y + 32, `t=${step.detail.trial[m]} > limit=${limit}`, "#fecdd3")}
              </g>
            );
          })}
        </g>
      );
    case "scout-replace": {
      const d = step.detail;
      const [ox, oy] = P(d.old);
      const [nx, ny] = P(d.newX);
      return (
        <g>
          <line x1={ox} y1={oy} x2={nx} y2={ny} stroke="#fb7185" strokeWidth="2" strokeDasharray="6 5" markerEnd="url(#arrow)" />
          <g transform={`translate(${ox},${oy})`}>
            <circle r="9" fill="#0c0a14" fillOpacity="0.7" stroke="#a39cb8" strokeWidth="1.6" />
            <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke="#a39cb8" strokeWidth="2" />
          </g>
          {label(ox + 12, oy + 24, "abandoned → memory B", "#e4e4e7")}
          <circle cx={nx} cy={ny} r="20" fill="none" stroke="#fb7185" strokeWidth="2.5" />
        </g>
      );
    }
    case "memorize": {
      const [x, y] = P(snap.best.x);
      return label(x + 14, y - 14, `best f = ${fmt(snap.best.f, 4)}`, "#fef08a");
    }
    default:
      return null;
  }
}
