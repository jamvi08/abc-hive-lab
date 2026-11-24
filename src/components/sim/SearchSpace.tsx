"use client";

import { useMemo } from "react";
import { fmt } from "@/lib/abc/format";
import type { AbcConfig, ConvergencePoint, Step, Vec } from "@/lib/abc/types";
import { heatmapFor } from "@/lib/heatmap";
import { useIsClient } from "@/lib/useIsClient";
import { Tex } from "../Tex";
import { BeeGlyph, FlowerGlyph, HiveGlyph, ROLE_COLOR, StarGlyph, type Role } from "./glyphs";

const ML = 44,
  MT = 20,
  PW = 500,
  PH = 500,
  MR = 24,
  MB = 34;
const W = ML + PW + MR,
  H = MT + PH + MB;
/** glyphs may overflow the bounds frame by this much (sources sitting on a bound) */
const BLEED = 18;
const INK = "#1f1d1a";

interface Props {
  cfg: AbcConfig;
  heatKey: string;
  step: Step | undefined;
  convergence: ConvergencePoint[];
  showTrails: boolean;
  showOptimum: boolean;
  /** animation duration in ms */
  dur: number;
}

function ticks(lo: number, hi: number, n = 5) {
  return Array.from({ length: n }, (_, i) => lo + (i * (hi - lo)) / (n - 1));
}

export function SearchSpace({ cfg, heatKey, step, convergence, showTrails, showOptimum, dur }: Props) {
  const { problem, limit } = cfg;
  const { lb, ub } = problem;
  const isClient = useIsClient();
  const heat = useMemo(() => (isClient ? heatmapFor(problem, heatKey) : null), [isClient, problem, heatKey]);

  const sx = (x: number) => ML + ((x - lb[0]) / (ub[0] - lb[0])) * PW;
  const sy = (y: number) => MT + (1 - (y - lb[1]) / (ub[1] - lb[1])) * PH;
  const P = (v: Vec) => [sx(v[0]), sy(v[1])] as const;
  const hive = [ML + 24, MT + 24] as const;

  const snap = step?.snap;
  const Np = snap?.X.length ?? 0;

  // flower size by fitness rank (more nectar = bigger)
  const sizes = useMemo(() => {
    if (!snap) return [];
    const order = snap.fit.map((f, i) => [f, i] as const).sort((a, b) => a[0] - b[0]);
    const s = new Array(Np).fill(9);
    order.forEach(([, i], r) => (s[i] = 6.5 + (Np > 1 ? (6 * r) / (Np - 1) : 4)));
    return s;
  }, [snap, Np]);

  if (!step || !snap) return <div className="card aspect-square" />;

  // ---- the bee that is "acting" in this step --------------------------
  let bee: { pos: readonly [number, number]; role: Role; visible: boolean; waggle?: boolean } = { pos: hive, role: "employed", visible: false };
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
      if (step.detail.abandon.length) bee = { pos: P(snap.X[step.detail.abandon[0]]), role: "scout", visible: true };
      break;
    case "scout-replace":
      bee = { pos: P(step.detail.newX), role: "scout", visible: true };
      focusM = step.detail.m;
      break;
  }

  const t = (ms: number) => ({ transitionDuration: `${ms}ms` });
  const trailPts = showTrails ? convergence.slice(Math.max(0, convergence.length - 80), -1) : [];

  return (
    <div className="card overflow-hidden p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1 pb-1">
        <span className="text-[13px] font-semibold text-stone-800">Map of</span>
        <span className="text-[13px]">
          <Tex tex={problem.tex} />
        </span>
        <span className="ml-auto text-[12px] text-hive-muted">whiter = lower f = more nectar</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Search space with food sources and bees">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
          <clipPath id="plot">
            <rect x={ML - BLEED} y={MT - BLEED} width={PW + 2 * BLEED} height={PH + 2 * BLEED} />
          </clipPath>
        </defs>

        {heat && <image href={heat.url} x={ML} y={MT} width={PW} height={PH} preserveAspectRatio="none" />}
        <rect x={ML} y={MT} width={PW} height={PH} fill="none" stroke="#d6d3cc" />

        {ticks(lb[0], ub[0]).map((v) => (
          <text key={`x${v}`} x={sx(v)} y={MT + PH + 17} textAnchor="middle" fontSize="12" fill="#8a857c" className="num">
            {fmt(v, 2)}
          </text>
        ))}
        {ticks(lb[1], ub[1]).map((v) => (
          <text key={`y${v}`} x={ML - 8} y={sy(v) + 4} textAnchor="end" fontSize="12" fill="#8a857c" className="num">
            {fmt(v, 2)}
          </text>
        ))}
        <text x={ML + PW / 2} y={H - 2} textAnchor="middle" fontSize="13" fill={INK} fontStyle="italic">
          x₁
        </text>
        <text x={10} y={MT + PH / 2} textAnchor="middle" fontSize="13" fill={INK} fontStyle="italic">
          x₂
        </text>

        <g clipPath="url(#plot)">
          <g transform={`translate(${hive[0]},${hive[1]})`}>
            <HiveGlyph size={15} />
            <title>The hive: onlookers wait here and watch the dances</title>
          </g>

          {trailPts.map((c, ci) =>
            c.X.map((x, m) => (
              <circle key={`t${c.cycle}-${m}`} cx={sx(x[0])} cy={sy(x[1])} r={1.7} fill="#57534e" opacity={0.1 + (0.35 * (ci + 1)) / trailPts.length} />
            )),
          )}

          {showOptimum &&
            problem.optimum?.xs.map((o, i) => (
              <g key={`o${i}`} transform={`translate(${sx(o[0])},${sy(o[1])})`}>
                <path d="M -6 0 H 6 M 0 -6 V 6" stroke="#059669" strokeWidth="2" />
                <title>True minimum: f = {fmt(problem.optimum!.f, 4)}</title>
              </g>
            ))}

          <Overlay step={step} P={P} hive={hive} limit={limit} />

          {snap.X.map((x, m) => {
            const [px, py] = P(x);
            const tr = snap.trial[m];
            const frac = Math.min(1, tr / (limit + 1));
            const over = tr > limit;
            const r = sizes[m];
            const ringR = r + 5;
            const circ = 2 * Math.PI * ringR;
            return (
              <g key={`src${m}`} className="move" style={{ ...t(dur), transform: `translate(${px}px, ${py}px)` }}>
                {focusM === m && <circle r={r + 11} fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="3 3" />}
                {tr > 0 && (
                  <circle r={ringR} fill="none" stroke={over ? "#dc2626" : "#f59e0b"} strokeWidth="2.4" strokeDasharray={`${circ * frac} ${circ}`} transform="rotate(-90)" strokeLinecap="round" />
                )}
                <FlowerGlyph size={r} />
                <text x={r + 3} y={-r} fontSize="11.5" fontWeight="700" fill={INK} stroke="#fff" strokeWidth="3" paintOrder="stroke">
                  {m + 1}
                </text>
                <title>
                  {`Flower ${m + 1}\nx = (${x.map((v) => fmt(v)).join(", ")})\nf = ${fmt(snap.f[m])}\nfitness = ${fmt(snap.fit[m])}\nfailed t = ${tr} times (limit ${limit})${snap.prob ? `\np = ${fmt(snap.prob[m])}` : ""}`}
                </title>
              </g>
            );
          })}

          {step.kind === "probabilities" &&
            snap.X.map((x, m) => (
              <text key={`p${m}`} x={sx(x[0])} y={sy(x[1]) + sizes[m] + 15} textAnchor="middle" fontSize="11" fontWeight="600" fill="#92400e" stroke="#fff" strokeWidth="3" paintOrder="stroke" className="num">
                p={fmt(snap.prob![m], 2)}
              </text>
            ))}

          <g className="move" style={{ ...t(dur), transform: `translate(${sx(snap.best.x[0])}px, ${sy(snap.best.x[1])}px)` }}>
            {step.kind === "memorize" && <circle r="10" fill="none" stroke="#eab308" strokeWidth="2" className="pulse" />}
            <StarGlyph r={7.5} />
            <title>{`Best so far: f = ${fmt(snap.best.f, 6)}`}</title>
          </g>

          <g className="move" style={{ ...t(dur), transform: `translate(${bee.pos[0] + 12}px, ${bee.pos[1] - 14}px)`, opacity: bee.visible ? 1 : 0 }}>
            <BeeGlyph role={bee.role} scale={1} waggle={bee.waggle} />
          </g>
        </g>
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-1 text-[12px] text-hive-muted">
        <span className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="-8 -8 16 16">
            <FlowerGlyph size={5.5} />
          </svg>
          flower = food source (bigger = better)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="-8 -8 16 16">
            <circle r="6" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="19 38" transform="rotate(-90)" />
          </svg>
          ring = times it failed
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="-7 -7 14 14">
            <StarGlyph r={6} />
          </svg>
          best so far
        </span>
        <span className="flex items-center gap-2">
          bees:
          {(["employed", "onlooker", "scout"] as Role[]).map((r) => (
            <span key={r} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLOR[r] }} />
              {r}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

function Overlay({ step, P, hive, limit }: { step: Step; P: (v: Vec) => readonly [number, number]; hive: readonly [number, number]; limit: number }) {
  const snap = step.snap;
  const label = (x: number, y: number, text: string, color = INK) => {
    const flip = x > ML + PW - 120;
    return (
      <text x={flip ? x - 26 : x} y={Math.min(y, MT + PH + 4)} textAnchor={flip ? "end" : "start"} fontSize="12" fontWeight="600" fill={color} stroke="#fff" strokeWidth="3.5" paintOrder="stroke">
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
      const moved = Math.abs(vx - ox) > 2 || Math.abs(vy - oy) > 2;
      if (step.kind === "candidate")
        return (
          <g>
            <line x1={ox} y1={oy} x2={kx} y2={ky} stroke="#7c3aed" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.7" />
            <circle cx={kx} cy={ky} r="16" fill="none" stroke="#7c3aed" strokeWidth="1.8" />
            {label(kx + 14, ky + 26, "partner", "#6d28d9")}
            {moved && <line x1={ox} y1={oy} x2={vx} y2={vy} stroke={ROLE_COLOR[d.bee]} strokeWidth="2.5" markerEnd="url(#arrow)" />}
            <circle cx={vx} cy={vy} r="7" fill="#fff" fillOpacity="0.6" stroke={INK} strokeWidth="1.5" strokeDasharray="3 2" />
            {label(vx + 10, vy + 22, "new spot?")}
          </g>
        );
      const sd = step.detail;
      return sd.accepted ? (
        <g>
          <circle cx={ox} cy={oy} r="6" fill="none" stroke="#a8a29e" strokeDasharray="2 2" />
          {moved && <line x1={ox} y1={oy} x2={vx} y2={vy} stroke="#059669" strokeWidth="2.5" markerEnd="url(#arrow)" />}
          {label(vx + 12, vy + 24, "✓ better, moved", "#047857")}
        </g>
      ) : (
        <g>
          <line x1={ox} y1={oy} x2={vx} y2={vy} stroke="#dc2626" strokeWidth="1.4" strokeDasharray="4 4" />
          <g transform={`translate(${vx},${vy})`}>
            <circle r="7" fill="#fff" stroke="#dc2626" strokeWidth="1.8" />
            <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" stroke="#dc2626" strokeWidth="2" />
          </g>
          {label(vx + 12, vy + 24, "✗ worse, stays", "#b91c1c")}
        </g>
      );
    }
    case "onlooker-choice": {
      const d = step.detail;
      const [x, y] = P(snap.X[d.m]);
      const ok = d.method === "roulette" || d.recruited;
      return (
        <g>
          {ok && <line x1={hive[0]} y1={hive[1]} x2={x} y2={y} stroke="#0284c7" strokeWidth="1.6" strokeDasharray="6 5" opacity="0.8" />}
          <circle cx={x} cy={y} r="19" fill="none" stroke={ok ? "#0284c7" : "#a8a29e"} strokeWidth="2.2" />
          {d.method === "sweep" && label(x + 18, y + 30, d.recruited ? "r < p: go" : "r ≥ p: skip", ok ? "#0369a1" : "#78716c")}
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
                <circle cx={x} cy={y} r="20" fill="none" stroke="#e11d48" strokeWidth="2.2" />
                {label(x + 16, y + 32, `failed ${step.detail.trial[m]} > ${limit}`, "#be123c")}
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
          <line x1={ox} y1={oy} x2={nx} y2={ny} stroke="#e11d48" strokeWidth="1.8" strokeDasharray="6 5" markerEnd="url(#arrow)" />
          <g transform={`translate(${ox},${oy})`}>
            <circle r="7" fill="#fff" stroke="#a8a29e" strokeWidth="1.6" />
            <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" stroke="#78716c" strokeWidth="2" />
          </g>
          <circle cx={nx} cy={ny} r="19" fill="none" stroke="#e11d48" strokeWidth="2.2" />
        </g>
      );
    }
    default:
      return null;
  }
}
