import type { RandomSource } from "./random";
import type { Problem, Vec } from "./types";

export interface RandomSearchResult {
  best: { x: Vec; f: number };
  evals: number;
  /** best-so-far sampled every `every` evaluations (and at the end) */
  curve: { evals: number; bestF: number }[];
  /** all sampled points (for drawing) */
  points: Vec[];
}

/** Pure random search: sample uniformly inside the bounds, keep the best. */
export function runRandomSearch(problem: Problem, budget: number, rng: RandomSource, every = 1): RandomSearchResult {
  const { lb, ub, f } = problem;
  let best = { x: lb.slice(), f: Infinity };
  const curve: RandomSearchResult["curve"] = [];
  const points: Vec[] = [];
  for (let n = 1; n <= budget; n++) {
    const x = lb.map((l, i) => l + rng.scout() * (ub[i] - l));
    const fx = f(x);
    points.push(x);
    if (fx < best.f) best = { x, f: fx };
    if (n % every === 0 || n === budget) curve.push({ evals: n, bestF: best.f });
  }
  return { best, evals: budget, curve, points };
}
