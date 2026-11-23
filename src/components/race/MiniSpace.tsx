"use client";

import { useMemo } from "react";
import type { Problem, Vec } from "@/lib/abc/types";
import { heatmapFor } from "@/lib/heatmap";
import { useIsClient } from "@/lib/useIsClient";
import { FlowerGlyph, StarGlyph } from "../sim/glyphs";

const S = 300,
  P = 8;

/** Small search-space panel used by the race lanes. */
export function MiniSpace({
  problem,
  heatKey,
  sources,
  samples,
  best,
  color,
}: {
  problem: Problem;
  heatKey: string;
  sources?: Vec[];
  samples?: Vec[];
  best: Vec | null;
  color: string;
}) {
  const isClient = useIsClient();
  const heat = useMemo(() => (isClient ? heatmapFor(problem, heatKey, 160) : null), [isClient, problem, heatKey]);
  const { lb, ub } = problem;
  const sx = (x: number) => P + ((x - lb[0]) / (ub[0] - lb[0])) * (S - 2 * P);
  const sy = (y: number) => P + (1 - (y - lb[1]) / (ub[1] - lb[1])) * (S - 2 * P);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-lg" role="img">
      <rect width={S} height={S} fill="#1e0b47" />
      {heat && <image href={heat.url} x={P} y={P} width={S - 2 * P} height={S - 2 * P} preserveAspectRatio="none" />}
      {samples?.map((x, i) => (
        <circle
          key={i}
          cx={sx(x[0])}
          cy={sy(x[1])}
          r={2.2}
          fill={color}
          stroke="#0c0a14"
          strokeWidth="0.8"
          opacity={0.25 + 0.75 * ((i + 1) / samples.length) ** 2}
        />
      ))}
      {sources?.map((x, i) => (
        <g key={i} transform={`translate(${sx(x[0])},${sy(x[1])})`}>
          <FlowerGlyph size={5} />
        </g>
      ))}
      {best && (
        <g transform={`translate(${sx(best[0])},${sy(best[1])})`}>
          <StarGlyph r={8} />
        </g>
      )}
      <rect x={1} y={1} width={S - 2} height={S - 2} fill="none" stroke={color} strokeWidth="2" rx="8" />
    </svg>
  );
}
