import { describe, expect, it } from "vitest";
import { AbcRun, runToEnd } from "../engine";
import { fitness, getProblem, PROBLEMS } from "../problems";
import { SeededRandom } from "../random";
import { runRandomSearch } from "../randomSearch";
import type { AbcConfig } from "../types";

const cfg = (over: Partial<AbcConfig> = {}): AbcConfig => ({
  problem: getProblem("sphere"),
  colonySize: 20,
  limit: 20,
  maxCycles: 100,
  selection: "sweep",
  ...over,
});

describe("fitness (slide 10)", () => {
  it("uses 1/(1+f) for f ≥ 0 and 1+|f| for f < 0", () => {
    expect(fitness(0)).toBe(1);
    expect(fitness(9)).toBeCloseTo(0.1);
    expect(fitness(-1.5)).toBe(2.5);
  });
  it("is monotone: smaller f ⇒ larger fitness", () => {
    const fs = [-3, -1, -0.1, 0, 0.1, 1, 10];
    for (let i = 1; i < fs.length; i++) expect(fitness(fs[i])).toBeLessThan(fitness(fs[i - 1]));
  });
});

describe("ABC engine", () => {
  it("is deterministic for a given seed", () => {
    const a = runToEnd(cfg(), new SeededRandom(7));
    const b = runToEnd(cfg(), new SeededRandom(7));
    expect(a.best).toEqual(b.best);
  });

  it("solves the sphere function", () => {
    const run = runToEnd(cfg({ maxCycles: 200 }), new SeededRandom(1));
    expect(run.best.f).toBeLessThan(1e-6);
  });

  it("best-so-far never gets worse", () => {
    const run = runToEnd(cfg({ problem: getProblem("rastrigin") }), new SeededRandom(3));
    for (let i = 1; i < run.convergence.length; i++)
      expect(run.convergence[i].bestF).toBeLessThanOrEqual(run.convergence[i - 1].bestF);
  });

  it("changes exactly one variable, never picks itself as partner, respects bounds", () => {
    for (const problem of PROBLEMS) {
      const run = new AbcRun(cfg({ problem, maxCycles: 15 }), new SeededRandom(11));
      for (const s of run.steps()) {
        if (s.kind === "candidate") {
          const d = s.detail;
          expect(d.k).not.toBe(d.m);
          const changed = d.v.filter((x, i) => x !== d.xOld[i]).length;
          expect(changed).toBeLessThanOrEqual(1);
          d.v.forEach((x, i) => {
            expect(x).toBeGreaterThanOrEqual(problem.lb[i]);
            expect(x).toBeLessThanOrEqual(problem.ub[i]);
          });
        }
      }
    }
  });

  it("places exactly Np onlookers per cycle (sweep and roulette)", () => {
    for (const selection of ["sweep", "roulette"] as const) {
      const run = new AbcRun(cfg({ selection, maxCycles: 5 }), new SeededRandom(5));
      const perCycle = new Map<number, number>();
      for (const s of run.steps())
        if (s.kind === "candidate" && s.detail.bee === "onlooker")
          perCycle.set(s.cycle, (perCycle.get(s.cycle) ?? 0) + 1);
      expect([...perCycle.values()]).toEqual([10, 10, 10, 10, 10]);
    }
  });

  it("counts evaluations: Np + T·2Np + scouts", () => {
    const run = new AbcRun(cfg({ maxCycles: 30, limit: 3 }), new SeededRandom(2));
    let scouts = 0;
    for (const s of run.steps()) if (s.kind === "scout-replace") scouts++;
    expect(run.evals).toBe(10 + 30 * 20 + scouts);
  });

  it("abandons only when t > limit and resets t", () => {
    const run = new AbcRun(cfg({ limit: 2, maxCycles: 40 }), new SeededRandom(9));
    for (const s of run.steps()) {
      if (s.kind === "scout-check")
        s.detail.abandon.forEach((m) => expect(s.detail.trial[m]).toBeGreaterThan(2));
      if (s.kind === "scout-replace") expect(s.snap.trial[s.detail.m]).toBe(0);
    }
  });

  it("handles negative objective values (six-hump camel)", () => {
    const run = runToEnd(cfg({ problem: getProblem("camel"), maxCycles: 150 }), new SeededRandom(4));
    expect(run.best.f).toBeLessThan(-1.03);
    expect(run.best.fit).toBeCloseTo(1 + Math.abs(run.best.f));
  });

  it("ablations: no onlookers / no scouts", () => {
    const a = new AbcRun(cfg({ useOnlookers: false, maxCycles: 3 }), new SeededRandom(1));
    const kinds = new Set([...a.steps()].map((s) => s.kind));
    expect(kinds.has("onlooker-choice")).toBe(false);
    const b = new AbcRun(cfg({ useScouts: false, maxCycles: 3 }), new SeededRandom(1));
    expect([...b.steps()].some((s) => s.kind === "scout-check")).toBe(false);
  });
});

describe("random search baseline", () => {
  it("uses the requested evaluation budget and never gets worse", () => {
    const rs = runRandomSearch(getProblem("sphere"), 500, new SeededRandom(1), 50);
    expect(rs.evals).toBe(500);
    for (let i = 1; i < rs.curve.length; i++) expect(rs.curve[i].bestF).toBeLessThanOrEqual(rs.curve[i - 1].bestF);
  });
});
