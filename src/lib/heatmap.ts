import type { Problem } from "./abc/types";

/**
 * Renders the objective landscape as a single-hue (violet) sequential image:
 * light = low f (rich nectar), dark = high f. Iso-lines are drawn where the
 * quantised level changes, which gives a contour-plot look.
 */
const STOPS = ["#f5f3ff", "#ddd6fe", "#a78bfa", "#7c3aed", "#5b21b6", "#3b0f7a", "#1e0b47", "#110726"];

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const RGB = STOPS.map(hexToRgb);

export function ramp(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t)) * (RGB.length - 1);
  const i = Math.min(RGB.length - 2, Math.floor(x));
  const u = x - i;
  const a = RGB[i],
    b = RGB[i + 1];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

export const RAMP_CSS = `linear-gradient(to right, ${STOPS.join(", ")})`;

const cache = new Map<string, { url: string; lo: number; hi: number }>();

export function heatmapFor(problem: Problem, key: string, size = 240) {
  const hit = cache.get(key);
  if (hit) return hit;
  const { lb, ub, f } = problem;
  const vals = new Float64Array(size * size);
  let min = Infinity;
  for (let py = 0; py < size; py++) {
    const x2 = ub[1] - ((py + 0.5) / size) * (ub[1] - lb[1]);
    for (let px = 0; px < size; px++) {
      const x1 = lb[0] + ((px + 0.5) / size) * (ub[0] - lb[0]);
      const v = f([x1, x2]);
      vals[py * size + px] = Number.isFinite(v) ? v : NaN;
      if (v < min) min = v;
    }
  }
  // log-compress so that both bowls and spiky functions show structure
  const g = new Float64Array(vals.length);
  const sorted: number[] = [];
  for (let i = 0; i < vals.length; i++) {
    g[i] = Number.isNaN(vals[i]) ? NaN : Math.log1p(vals[i] - min);
    if (!Number.isNaN(g[i])) sorted.push(g[i]);
  }
  sorted.sort((a, b) => a - b);
  const hi = sorted[Math.floor(sorted.length * 0.985)] || 1;
  const LEVELS = 16;
  const level = new Int16Array(vals.length);
  for (let i = 0; i < g.length; i++) level[i] = Math.min(LEVELS - 1, Math.floor((g[i] / hi) * LEVELS));

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = py * size + px;
      const t = Number.isNaN(g[i]) ? 1 : g[i] / hi;
      let [r, gg, b] = ramp(t);
      const edge =
        (px + 1 < size && level[i + 1] !== level[i]) || (py + 1 < size && level[i + size] !== level[i]);
      if (edge) {
        const k = t < 0.35 ? 0.82 : 1.25;
        r = Math.min(255, r * k);
        gg = Math.min(255, gg * k);
        b = Math.min(255, b * k);
      }
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = gg;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const out = { url: canvas.toDataURL("image/png"), lo: min, hi: Math.expm1(hi) + min };
  cache.set(key, out);
  return out;
}
