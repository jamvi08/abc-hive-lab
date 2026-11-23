/**
 * The solved example from the course slides (slides 14–19):
 *   Minimize f(x) = x1² + x2²,  −5 ≤ x1, x2 ≤ 5
 *   S = 10, Np = 5, T = 10, limit = 1
 *
 * The slides print the random numbers only for food source 1 (employed and
 * onlooker phase) and for the scout. For the other bees we back-calculated
 * random numbers that reproduce the slides' matrices exactly; they are marked
 * `from: "derived"`.
 */
import { AbcRun } from "./engine";
import { PROBLEMS } from "./problems";
import { ScriptedRandom, type ScriptedDraw } from "./random";
import type { AbcConfig, Snapshot, Step, Vec } from "./types";

export const TEXTBOOK_X0: Vec[] = [
  [2, -1],
  [-3, 2],
  [1, -4],
  [-5, 3],
  [3, 0],
];

export const TEXTBOOK_CONFIG: AbcConfig = {
  problem: PROBLEMS[0],
  colonySize: 10,
  limit: 1,
  maxCycles: 10,
  selection: "sweep",
  initialPopulation: TEXTBOOK_X0,
};

export interface TextbookDraw extends ScriptedDraw {
  from: "slide" | "derived";
  /** human label shown in the verification page */
  label: string;
}

const d = (kind: ScriptedDraw["kind"], value: number, from: "slide" | "derived", label: string): TextbookDraw => ({
  kind,
  value,
  from,
  label,
});

/** Indices are 0-based in code; labels are 1-based like the slides. */
export const TEXTBOOK_SCRIPT: TextbookDraw[] = [
  // Employed bees phase
  d("variable", 0, "slide", "Employed bee 1: variable j = 1"),
  d("partner", 3, "slide", "Employed bee 1: partner k = 4"),
  d("phi", 0.81, "slide", "Employed bee 1: φ = 0.81"),
  d("variable", 0, "derived", "Employed bee 2: variable j = 1"),
  d("partner", 4, "derived", "Employed bee 2: partner k = 5"),
  d("phi", -0.5, "derived", "Employed bee 2: φ = −0.5"),
  d("variable", 1, "derived", "Employed bee 3: variable j = 2"),
  d("partner", 4, "derived", "Employed bee 3: partner k = 5"),
  d("phi", -0.63, "derived", "Employed bee 3: φ = −0.63"),
  d("variable", 1, "derived", "Employed bee 4: variable j = 2"),
  d("partner", 0, "derived", "Employed bee 4: partner k = 1"),
  d("phi", -0.07, "derived", "Employed bee 4: φ = −0.07"),
  d("variable", 0, "derived", "Employed bee 5: variable j = 1"),
  d("partner", 2, "derived", "Employed bee 5: partner k = 3"),
  d("phi", 0.5, "derived", "Employed bee 5: φ = 0.5"),
  // Onlooker bees phase (sweep: source 1, 2, 3, ...)
  d("r", 0.39, "slide", "Onlooker at source 1: r = 0.39"),
  d("variable", 0, "slide", "Onlooker 1: variable j = 1"),
  d("partner", 4, "slide", "Onlooker 1: partner k = 5"),
  d("phi", 0.68, "slide", "Onlooker 1: φ = 0.68"),
  d("r", 0.62, "derived", "Onlooker at source 2: r = 0.62"),
  d("variable", 0, "derived", "Onlooker 2: variable j = 1"),
  d("partner", 3, "derived", "Onlooker 2: partner k = 4"),
  d("phi", 0.2, "derived", "Onlooker 2: φ = 0.2"),
  d("r", 0.15, "derived", "Onlooker at source 3: r = 0.15"),
  d("variable", 0, "derived", "Onlooker 3: variable j = 1"),
  d("partner", 1, "derived", "Onlooker 3: partner k = 2"),
  d("phi", -0.12, "derived", "Onlooker 3: φ = −0.12"),
  d("r", 0.1, "derived", "Onlooker at source 4: r = 0.10"),
  d("variable", 0, "derived", "Onlooker 4: variable j = 1"),
  d("partner", 4, "derived", "Onlooker 4: partner k = 5"),
  d("phi", -0.11, "derived", "Onlooker 4: φ = −0.11"),
  d("r", 0.27, "derived", "Onlooker at source 5: r = 0.27"),
  d("variable", 0, "derived", "Onlooker 5: variable j = 1"),
  d("partner", 1, "derived", "Onlooker 5: partner k = 2"),
  d("phi", 0.1, "derived", "Onlooker 5: φ = 0.1"),
  // Scout bees phase
  d("scout", 0.43, "slide", "Scout (source 5): rand = 0.43 for x1"),
  d("scout", 0.58, "slide", "Scout (source 5): rand = 0.58 for x2"),
];

export function textbookRandom(seed = 2005) {
  return new ScriptedRandom(TEXTBOOK_SCRIPT, seed);
}

export function newTextbookRun(seed = 2005) {
  return new AbcRun(TEXTBOOK_CONFIG, textbookRandom(seed));
}

/** Run cycle 1 of the textbook example and collect the key states. */
export function runTextbookCycle1() {
  const run = newTextbookRun();
  const steps: Step[] = [];
  for (const s of run.steps()) {
    steps.push(s);
    if (s.kind === "memorize") break;
  }
  const lastOf = (pred: (s: Step) => boolean): Snapshot => {
    const hit = [...steps].reverse().find(pred);
    if (!hit) throw new Error("state not found");
    return hit.snap;
  };
  const afterInit = steps[0].snap;
  const afterEmployed = lastOf((s) => s.phase === "employed");
  const probStep = steps.find((s) => s.kind === "probabilities")!;
  const afterOnlooker = lastOf((s) => s.phase === "onlooker");
  const afterScout = lastOf((s) => s.phase === "scout");
  const memorize = steps.find((s) => s.kind === "memorize")!;
  return { steps, afterInit, afterEmployed, probStep, afterOnlooker, afterScout, memorize };
}

export type TextbookResult = ReturnType<typeof runTextbookCycle1>;

export type CheckStatus = "match" | "rounding" | "differs";

export interface SlideCheck {
  id: string;
  slide: number;
  group: string;
  label: string;
  /** value printed on the slide */
  slideValue: number;
  /** decimals printed on the slide */
  decimals: number;
  get: (r: TextbookResult) => number;
  note?: string;
}

const emp = (r: TextbookResult, m: number, kind: "candidate" | "select") =>
  r.steps.find((s) => s.kind === kind && s.phase === "employed" && s.detail.m === m)!;
const onl = (r: TextbookResult, m: number, kind: "candidate" | "select") =>
  r.steps.find((s) => s.kind === kind && s.phase === "onlooker" && s.detail.m === m)!;

function vec(
  group: string,
  slide: number,
  name: string,
  values: number[],
  decimals: number[] | number,
  get: (r: TextbookResult) => number[],
  notes: Record<number, string> = {},
): SlideCheck[] {
  return values.map((v, i) => ({
    id: `${group}-${name}-${i + 1}`,
    slide,
    group,
    label: `${name}${sub(i + 1)}`,
    slideValue: v,
    decimals: Array.isArray(decimals) ? decimals[i] : decimals,
    get: (r) => get(r)[i],
    note: notes[i],
  }));
}

function sub(n: number) {
  return String(n)
    .split("")
    .map((c) => "₀₁₂₃₄₅₆₇₈₉"[+c])
    .join("");
}

const col = (X: Vec[], j: number) => X.map((r) => r[j]);

export const SLIDE_CHECKS: SlideCheck[] = [
  // ---- Step 1: initialisation (slide 14)
  ...vec("Step 1 · Initialization", 14, "f", [5, 13, 17, 34, 9], 0, (r) => r.afterInit.f),
  ...vec("Step 1 · Initialization", 14, "fit", [0.167, 0.071, 0.056, 0.028, 0.1], 3, (r) => r.afterInit.fit, {
    3: "1/35 = 0.02857. The slide truncates it to 0.028 instead of rounding to 0.029.",
  }),

  // ---- Step 2: employed bee 1 (slide 15)
  {
    id: "e1-raw",
    slide: 15,
    group: "Step 2 · Employed bee 1",
    label: "X_new¹·¹ = 2 + 0.81·(2 − (−5))",
    slideValue: 7.67,
    decimals: 2,
    get: (r) => (emp(r, 0, "candidate").detail as { raw: number }).raw,
  },
  {
    id: "e1-clamp",
    slide: 15,
    group: "Step 2 · Employed bee 1",
    label: "after bound check",
    slideValue: 5,
    decimals: 0,
    get: (r) => (emp(r, 0, "candidate").detail as { clamped: number }).clamped,
    note: "The value is clipped to the upper bound: min(7.67, 5) = 5. The slide writes this as max[X_new, ub].",
  },
  {
    id: "e1-f",
    slide: 15,
    group: "Step 2 · Employed bee 1",
    label: "f(X_new¹)",
    slideValue: 26,
    decimals: 0,
    get: (r) => (emp(r, 0, "candidate").detail as { fNew: number }).fNew,
  },
  {
    id: "e1-fit",
    slide: 15,
    group: "Step 2 · Employed bee 1",
    label: "fit(X_new¹)",
    slideValue: 0.037,
    decimals: 3,
    get: (r) => (emp(r, 0, "candidate").detail as { fitNew: number }).fitNew,
  },
  {
    id: "e1-t",
    slide: 15,
    group: "Step 2 · Employed bee 1",
    label: "t₁ after greedy selection (rejected)",
    slideValue: 1,
    decimals: 0,
    get: (r) => (emp(r, 0, "select").detail as { trialAfter: number }).trialAfter,
  },

  // ---- After employed phase (slide 16)
  ...vec("After Employed Phase", 16, "x₁ of X", [2, 0, 1, -5, 3], 0, (r) => col(r.afterEmployed.X, 0)),
  ...vec("After Employed Phase", 16, "x₂ of X", [-1, 2, -1.48, 2.72, 0], [0, 0, 2, 2, 0], (r) => col(r.afterEmployed.X, 1)),
  ...vec("After Employed Phase", 16, "f", [5, 4, 3.19, 32.4, 9], [0, 0, 2, 2, 0], (r) => r.afterEmployed.f),
  ...vec("After Employed Phase", 16, "fit", [0.167, 0.2, 0.239, 0.03, 0.1], 3, (r) => r.afterEmployed.fit),
  ...vec("After Employed Phase", 16, "t", [1, 0, 0, 0, 1], 0, (r) => r.afterEmployed.trial),
  ...vec(
    "After Employed Phase",
    16,
    "p",
    [0.729, 0.859, 1, 0.213, 0.476],
    3,
    (r) => (r.probStep.detail as { p: number[] }).p,
    {
      1: "Exact value: 0.9 × 0.2 / 0.2386 + 0.1 = 0.854. The slide's 0.859 looks like a typo. It doesn't change anything, because r = 0.62 is below both values.",
      4: "Exact value 0.4771. The slide shows it truncated to 0.476.",
    },
  ),

  // ---- Step 3: onlooker 1 (slide 17)
  {
    id: "o1-v",
    slide: 17,
    group: "Step 3 · Onlooker at source 1",
    label: "X_new¹·¹ = 2 + 0.68·(2 − 3)",
    slideValue: 1.32,
    decimals: 2,
    get: (r) => (onl(r, 0, "candidate").detail as { raw: number }).raw,
  },
  {
    id: "o1-f",
    slide: 17,
    group: "Step 3 · Onlooker at source 1",
    label: "f(X_new¹)",
    slideValue: 2.74,
    decimals: 2,
    get: (r) => (onl(r, 0, "candidate").detail as { fNew: number }).fNew,
  },
  {
    id: "o1-fit",
    slide: 17,
    group: "Step 3 · Onlooker at source 1",
    label: "fit(X_new¹)",
    slideValue: 0.267,
    decimals: 3,
    get: (r) => (onl(r, 0, "candidate").detail as { fitNew: number }).fitNew,
  },

  // ---- After onlooker phase (slide 18)
  ...vec("After Onlooker Phase", 18, "x₁ of X", [1.32, 0, 0.88, -4.12, 3], [2, 0, 2, 2, 0], (r) => col(r.afterOnlooker.X, 0)),
  ...vec("After Onlooker Phase", 18, "x₂ of X", [-1, 2, -1.48, 2.72, 0], [0, 0, 2, 2, 0], (r) => col(r.afterOnlooker.X, 1)),
  ...vec(
    "After Onlooker Phase",
    18,
    "f",
    [2.742, 4, 2.96, 24.38, 9],
    [3, 0, 2, 2, 0],
    (r) => r.afterOnlooker.f,
    { 3: "Exact: 4.12² + 2.72² = 16.9744 + 7.3984 = 24.3728, which rounds to 24.37." },
  ),
  ...vec("After Onlooker Phase", 18, "fit", [0.267, 0.2, 0.252, 0.039, 0.1], 3, (r) => r.afterOnlooker.fit),
  ...vec("After Onlooker Phase", 18, "t", [0, 1, 0, 0, 2], 0, (r) => r.afterOnlooker.trial),

  // ---- Step 4: scout (slide 19)
  {
    id: "s-which",
    slide: 19,
    group: "Step 4 · Scout Bee Phase",
    label: "source abandoned (t > limit)",
    slideValue: 5,
    decimals: 0,
    get: (r) => {
      const s = r.steps.find((x) => x.kind === "scout-replace");
      return s && s.kind === "scout-replace" ? s.detail.m + 1 : NaN;
    },
  },
  {
    id: "s-x1",
    slide: 19,
    group: "Step 4 · Scout Bee Phase",
    label: "X_new⁵·¹ = −5 + 0.43·10",
    slideValue: -0.7,
    decimals: 1,
    get: (r) => r.afterScout.X[4][0],
  },
  {
    id: "s-x2",
    slide: 19,
    group: "Step 4 · Scout Bee Phase",
    label: "X_new⁵·² = −5 + 0.58·10",
    slideValue: -0.8,
    decimals: 1,
    get: (r) => r.afterScout.X[4][1],
    note: "−5 + 0.58 × 10 = −5 + 5.8 = +0.8, so the slide has a sign slip. f and fit don't change because the value is squared.",
  },
  {
    id: "s-f",
    slide: 19,
    group: "Step 4 · Scout Bee Phase",
    label: "f(X_new⁵)",
    slideValue: 1.13,
    decimals: 2,
    get: (r) => r.afterScout.f[4],
  },
  {
    id: "s-fit",
    slide: 19,
    group: "Step 4 · Scout Bee Phase",
    label: "fit(X_new⁵)",
    slideValue: 0.469,
    decimals: 3,
    get: (r) => r.afterScout.fit[4],
  },
  ...vec("Step 4 · Scout Bee Phase", 19, "t", [0, 1, 0, 0, 0], 0, (r) => r.afterScout.trial),
  {
    id: "s-B-f",
    slide: 19,
    group: "Step 4 · Scout Bee Phase",
    label: "memory B: f",
    slideValue: 9,
    decimals: 0,
    get: (r) => r.afterScout.abandoned?.f ?? NaN,
  },
  {
    id: "s-B-fit",
    slide: 19,
    group: "Step 4 · Scout Bee Phase",
    label: "memory B: fit",
    slideValue: 0.1,
    decimals: 1,
    get: (r) => r.afterScout.abandoned?.fit ?? NaN,
  },
  {
    id: "s-x12",
    slide: 19,
    group: "Step 4 · Scout Bee Phase",
    label: "x₂ of X₁ in slide 19's matrix",
    slideValue: -0.92,
    decimals: 2,
    get: (r) => r.afterScout.X[0][1],
    note: "Slide 19's matrix shows X₁ = (1.32, −0.92), f = 2.589. None of the steps shown changes x₂ of source 1. The fit printed next to it (0.267) belongs to (1.32, −1), f = 2.742, which is the value the tool keeps.",
  },
];

export function judge(check: SlideCheck, tool: number): CheckStatus {
  if (!Number.isFinite(tool)) return "differs";
  const unit = Math.pow(10, -check.decimals);
  const rounded = Math.round(tool / unit) * unit;
  if (Math.abs(rounded - check.slideValue) < unit / 10) return "match";
  if (Math.abs(tool - check.slideValue) <= 2 * unit) return "rounding";
  return "differs";
}
