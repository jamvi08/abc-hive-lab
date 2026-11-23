/**
 * Random number sources.
 *
 * The engine never calls Math.random directly. It asks a RandomSource for a
 * *named* draw (which variable, which partner, phi, r, ...). That lets us
 *  - reproduce a run exactly from a seed, and
 *  - replay the textbook example with the exact numbers from the slides.
 */

export type DrawKind = "init" | "variable" | "partner" | "phi" | "r" | "scout";

export interface RandomSource {
  /** rand(0,1) for initialisation x = l + rand·(u − l) */
  init(): number;
  /** index of the variable j to change, 0..D-1 */
  variable(D: number): number;
  /** index of the partner k ≠ m, 0..Np-1 */
  partner(m: number, Np: number): number;
  /** φ in [-1, 1] */
  phi(): number;
  /** r in [0, 1) used by onlookers */
  r(): number;
  /** rand(0,1) for a scout's new position */
  scout(): number;
  /** true once a scripted source has run out and fallen back to the seed */
  readonly offScript: boolean;
}

/** mulberry32: tiny, fast, good-enough seeded PRNG */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededRandom implements RandomSource {
  private u: () => number;
  readonly offScript = false;
  constructor(seed: number) {
    this.u = mulberry32(seed);
  }
  init() {
    return this.u();
  }
  variable(D: number) {
    return Math.floor(this.u() * D);
  }
  partner(m: number, Np: number) {
    let k = Math.floor(this.u() * (Np - 1));
    if (k >= m) k++;
    return k;
  }
  phi() {
    return this.u() * 2 - 1;
  }
  r() {
    return this.u();
  }
  scout() {
    return this.u();
  }
}

export interface ScriptedDraw {
  kind: DrawKind;
  /** for variable/partner this is a 0-based index; otherwise the number itself */
  value: number;
}

/**
 * Replays a fixed list of draws (e.g. from the slides). When the script runs
 * out it silently continues with a seeded generator and flips `offScript`.
 */
export class ScriptedRandom implements RandomSource {
  private i = 0;
  private fallback: SeededRandom;
  private _off = false;
  constructor(private script: ScriptedDraw[], seed = 1) {
    this.fallback = new SeededRandom(seed);
  }
  get offScript() {
    return this._off;
  }
  get position() {
    return this.i;
  }
  private take(kind: DrawKind): number | null {
    if (this.i >= this.script.length) {
      this._off = true;
      return null;
    }
    const d = this.script[this.i];
    if (d.kind !== kind) {
      throw new Error(
        `Scripted draw #${this.i} expected "${d.kind}" but engine asked for "${kind}"`,
      );
    }
    this.i++;
    return d.value;
  }
  init() {
    return this.take("init") ?? this.fallback.init();
  }
  variable(D: number) {
    return this.take("variable") ?? this.fallback.variable(D);
  }
  partner(m: number, Np: number) {
    return this.take("partner") ?? this.fallback.partner(m, Np);
  }
  phi() {
    return this.take("phi") ?? this.fallback.phi();
  }
  r() {
    return this.take("r") ?? this.fallback.r();
  }
  scout() {
    return this.take("scout") ?? this.fallback.scout();
  }
}
