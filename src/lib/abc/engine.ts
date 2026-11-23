import { fitness } from "./problems";
import type { RandomSource } from "./random";
import type {
  AbcConfig,
  Best,
  CandidateDetail,
  ConvergencePoint,
  Phase,
  Snapshot,
  Step,
  StepEvent,
  Vec,
} from "./types";

/** Pseudocode shown in the UI (follows "General Algorithm", slide 7). */
export const PSEUDOCODE = [
  { text: "Initialization Phase", indent: 0 },
  { text: "x_mi = l_i + rand(0,1)·(u_i − l_i),   t_m = 0", indent: 1 },
  { text: "REPEAT", indent: 0 },
  { text: "Employed Bees Phase  (one bee per food source m)", indent: 1 },
  { text: "v_mi = x_mi + φ_mi·(x_mi − x_ki)", indent: 2 },
  { text: "greedy selection between v_m and x_m → update t_m", indent: 2 },
  { text: "p_m = 0.9·fit_m / max(fit) + 0.1", indent: 1 },
  { text: "Onlooker Bees Phase  (until Np onlookers are placed)", indent: 1 },
  { text: "choose a food source m using p_m", indent: 2 },
  { text: "v_mi = x_mi + φ_mi·(x_mi − x_ki),  greedy selection", indent: 2 },
  { text: "Scout Bees Phase:  if t_m > limit → new random x_m", indent: 1 },
  { text: "Memorize the best solution achieved so far", indent: 1 },
  { text: "UNTIL cycle = Maximum Cycle Number (T)", indent: 0 },
] as const;

export const LINE = {
  init: 1,
  employedCandidate: 4,
  employedSelect: 5,
  prob: 6,
  onlookerChoice: 8,
  onlookerSearch: 9,
  scout: 10,
  memorize: 11,
  done: 12,
} as const;

const clone2 = (a: Vec[]) => a.map((r) => r.slice());

export class AbcRun {
  readonly Np: number;
  readonly D: number;
  X: Vec[] = [];
  f: number[] = [];
  fit: number[] = [];
  trial: number[] = [];
  prob: number[] | null = null;
  best!: Best;
  abandoned: Snapshot["abandoned"] = null;
  cycle = 0;
  evals = 0;
  onlookersPlaced = 0;
  convergence: ConvergencePoint[] = [];
  private id = 0;

  constructor(
    readonly cfg: AbcConfig,
    readonly rng: RandomSource,
    /** lite = do not build snapshots (fast batch runs) */
    readonly lite = false,
  ) {
    this.Np = Math.max(2, Math.floor(cfg.colonySize / 2));
    this.D = cfg.problem.lb.length;
  }

  private evaluate(x: Vec): number {
    this.evals++;
    return this.cfg.problem.f(x);
  }

  snapshot(): Snapshot {
    return {
      X: clone2(this.X),
      f: this.f.slice(),
      fit: this.fit.slice(),
      trial: this.trial.slice(),
      prob: this.prob ? this.prob.slice() : null,
      best: { ...this.best, x: this.best.x.slice() },
      abandoned: this.abandoned ? { ...this.abandoned, x: this.abandoned.x.slice() } : null,
      cycle: this.cycle,
      evals: this.evals,
      convergenceLen: this.convergence.length,
      onlookersPlaced: this.onlookersPlaced,
    };
  }

  private emit(ev: StepEvent, phase: Phase, line: number): Step {
    return {
      ...ev,
      id: this.id++,
      phase,
      cycle: this.cycle,
      line,
      offScript: this.rng.offScript || undefined,
      snap: this.lite ? (null as unknown as Snapshot) : this.snapshot(),
    } as Step;
  }

  private bestOfPopulation(): Best {
    let bi = 0;
    for (let m = 1; m < this.Np; m++) if (this.f[m] < this.f[bi]) bi = m;
    return { x: this.X[bi].slice(), f: this.f[bi], fit: this.fit[bi], cycle: this.cycle };
  }

  /** Neighbour search used by employed AND onlooker bees (slide 9). */
  private neighbour(m: number, bee: "employed" | "onlooker", onlookerNo?: number): CandidateDetail {
    const { lb, ub } = this.cfg.problem;
    const j = this.rng.variable(this.D);
    const k = this.rng.partner(m, this.Np);
    const phi = this.rng.phi();
    const xOld = this.X[m].slice();
    const xk = this.X[k].slice();
    const raw = xOld[j] + phi * (xOld[j] - xk[j]);
    const clamped = Math.min(ub[j], Math.max(lb[j], raw));
    const v = xOld.slice();
    v[j] = clamped;
    const fNew = this.evaluate(v);
    return {
      bee,
      m,
      j,
      k,
      phi,
      xOld,
      xk,
      raw,
      clamped,
      wasClamped: clamped !== raw,
      v,
      fOld: this.f[m],
      fitOld: this.fit[m],
      fNew,
      fitNew: fitness(fNew),
      onlookerNo,
    };
  }

  private greedy(c: CandidateDetail) {
    const trialBefore = this.trial[c.m];
    const accepted = c.fitNew > c.fitOld;
    if (accepted) {
      this.X[c.m] = c.v.slice();
      this.f[c.m] = c.fNew;
      this.fit[c.m] = c.fitNew;
      this.trial[c.m] = 0;
    } else {
      this.trial[c.m] += 1;
    }
    return { ...c, accepted, trialBefore, trialAfter: this.trial[c.m] };
  }

  *steps(): Generator<Step, void, undefined> {
    const { problem, initialPopulation, maxCycles, limit } = this.cfg;
    const { lb, ub } = problem;
    const Np = this.Np;
    const useOnlookers = this.cfg.useOnlookers !== false;
    const useScouts = this.cfg.useScouts !== false;

    // ---------- Initialization Phase (slide 8) ----------
    let rands: number[][] | null = null;
    if (initialPopulation) {
      this.X = clone2(initialPopulation.slice(0, Np));
    } else {
      rands = [];
      this.X = [];
      for (let m = 0; m < Np; m++) {
        const rr: number[] = [];
        const x: Vec = [];
        for (let i = 0; i < this.D; i++) {
          const r = this.rng.init();
          rr.push(r);
          x.push(lb[i] + r * (ub[i] - lb[i]));
        }
        rands.push(rr);
        this.X.push(x);
      }
    }
    this.f = this.X.map((x) => this.evaluate(x));
    this.fit = this.f.map(fitness);
    this.trial = new Array(Np).fill(0);
    this.best = this.bestOfPopulation();
    this.convergence.push({ cycle: 0, evals: this.evals, bestF: this.best.f, X: clone2(this.X) });
    yield this.emit({ kind: "init", detail: { given: !!initialPopulation, rands } }, "init", LINE.init);

    for (this.cycle = 1; this.cycle <= maxCycles; this.cycle++) {
      this.prob = null;
      this.onlookersPlaced = 0;

      // ---------- Employed Bees Phase (slides 9–10) ----------
      for (let m = 0; m < Np; m++) {
        const c = this.neighbour(m, "employed");
        yield this.emit({ kind: "candidate", detail: c }, "employed", LINE.employedCandidate);
        const s = this.greedy(c);
        yield this.emit({ kind: "select", detail: s }, "employed", LINE.employedSelect);
      }

      // ---------- Onlooker Bees Phase (slide 11) ----------
      if (useOnlookers) {
        let maxIdx = 0;
        for (let m = 1; m < Np; m++) if (this.fit[m] > this.fit[maxIdx]) maxIdx = m;
        const maxFit = this.fit[maxIdx];
        this.prob = this.fit.map((ft) => 0.9 * (ft / maxFit) + 0.1);
        yield this.emit(
          { kind: "probabilities", detail: { p: this.prob.slice(), maxFit, maxIdx } },
          "onlooker",
          LINE.prob,
        );

        if (this.cfg.selection === "sweep") {
          // Karaboga's rule, as used in the solved example: visit sources in
          // turn; an onlooker is recruited to source m when r < p_m.
          let m = 0;
          while (this.onlookersPlaced < Np) {
            const r = this.rng.r();
            const p = this.prob[m];
            const recruited = r < p;
            if (recruited) this.onlookersPlaced++;
            yield this.emit(
              {
                kind: "onlooker-choice",
                detail: {
                  method: "sweep",
                  m,
                  r,
                  p,
                  recruited,
                  onlookerNo: recruited ? this.onlookersPlaced : this.onlookersPlaced + 1,
                },
              },
              "onlooker",
              LINE.onlookerChoice,
            );
            if (recruited) {
              yield* this.onlookerSearch(m, this.onlookersPlaced);
            }
            m = (m + 1) % Np;
          }
        } else {
          // Roulette wheel: slice sizes p_m / Σp
          const total = this.prob.reduce((a, b) => a + b, 0);
          const cumulative: number[] = [];
          this.prob.reduce((acc, p, i) => (cumulative[i] = acc + p), 0);
          while (this.onlookersPlaced < Np) {
            const r = this.rng.r();
            const spin = r * total;
            let m = cumulative.findIndex((c) => spin < c);
            if (m < 0) m = Np - 1;
            this.onlookersPlaced++;
            yield this.emit(
              {
                kind: "onlooker-choice",
                detail: {
                  method: "roulette",
                  r,
                  spin,
                  total,
                  cumulative: cumulative.slice(),
                  m,
                  onlookerNo: this.onlookersPlaced,
                },
              },
              "onlooker",
              LINE.onlookerChoice,
            );
            yield* this.onlookerSearch(m, this.onlookersPlaced);
          }
        }
      }

      // ---------- Scout Bees Phase (slide 12) ----------
      if (useScouts) {
        const abandon: number[] = [];
        for (let m = 0; m < Np; m++) if (this.trial[m] > limit) abandon.push(m);
        yield this.emit(
          { kind: "scout-check", detail: { trial: this.trial.slice(), limit, abandon } },
          "scout",
          LINE.scout,
        );
        for (const m of abandon) {
          const old = this.X[m].slice();
          const oldF = this.f[m];
          const oldFit = this.fit[m];
          const oldTrial = this.trial[m];
          // keep the abandoned source in memory B (slide 19)
          this.abandoned = { m, x: old, f: oldF, fit: oldFit };
          const rr: number[] = [];
          const nx: Vec = [];
          for (let i = 0; i < this.D; i++) {
            const r = this.rng.scout();
            rr.push(r);
            nx.push(lb[i] + r * (ub[i] - lb[i]));
          }
          this.X[m] = nx;
          this.f[m] = this.evaluate(nx);
          this.fit[m] = fitness(this.f[m]);
          this.trial[m] = 0;
          yield this.emit(
            {
              kind: "scout-replace",
              detail: { m, old, oldF, oldFit, oldTrial, rands: rr, newX: nx.slice(), f: this.f[m], fit: this.fit[m] },
            },
            "scout",
            LINE.scout,
          );
        }
      }

      // ---------- Memorize best ----------
      const previous = this.best;
      let candidate = this.bestOfPopulation();
      let source: "population" | "memoryB" = "population";
      if (this.abandoned && this.abandoned.f < candidate.f) {
        candidate = { x: this.abandoned.x.slice(), f: this.abandoned.f, fit: this.abandoned.fit, cycle: this.cycle };
        source = "memoryB";
      }
      const improved = candidate.f < previous.f;
      if (improved) this.best = candidate;
      this.convergence.push({ cycle: this.cycle, evals: this.evals, bestF: this.best.f, X: clone2(this.X) });
      yield this.emit(
        { kind: "memorize", detail: { best: this.best, previous, improved, source } },
        "memorize",
        LINE.memorize,
      );
    }
    this.cycle = maxCycles;
    yield this.emit({ kind: "done", detail: { reason: "maxCycles" } }, "done", LINE.done);
  }

  private *onlookerSearch(m: number, onlookerNo: number): Generator<Step, void, undefined> {
    const c = this.neighbour(m, "onlooker", onlookerNo);
    yield this.emit({ kind: "candidate", detail: c }, "onlooker", LINE.onlookerSearch);
    const s = this.greedy(c);
    yield this.emit({ kind: "select", detail: s }, "onlooker", LINE.onlookerSearch);
  }
}

/** Run to completion without snapshots; returns the convergence log. */
export function runToEnd(cfg: AbcConfig, rng: RandomSource) {
  const run = new AbcRun(cfg, rng, true);
  for (const _ of run.steps()) void _;
  return run;
}
