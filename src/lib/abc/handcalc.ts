/**
 * The hand calculation of cycle 1 of the slide example, written out
 * independently of the engine. Every `expect` was computed by hand; the
 * Verify page (and a unit test) compares them with what the engine produces.
 * Lines marked `derived` use back-calculated random numbers (not printed on the slides).
 */
import type { TextbookResult } from "./textbook";
import type { CandidateDetail, SelectDetail } from "./types";

export interface HandCheck {
  label: string;
  expect: number;
  get: (r: TextbookResult) => number;
}

export interface HandLine {
  who: string;
  tex: string[];
  derived?: boolean;
  checks: HandCheck[];
}

export interface HandSection {
  title: string;
  slides: string;
  lines: HandLine[];
}

const cand = (r: TextbookResult, phase: "employed" | "onlooker", m: number) =>
  r.steps.find((s) => s.kind === "candidate" && s.phase === phase && s.detail.m === m)!.detail as CandidateDetail;
const sel = (r: TextbookResult, phase: "employed" | "onlooker", m: number) =>
  r.steps.find((s) => s.kind === "select" && s.phase === phase && s.detail.m === m)!.detail as SelectDetail;

const initLine = (m: number, x: [number, number], f: number): HandLine => ({
  who: `X${"¹²³⁴⁵"[m]} = (${x[0]}, ${x[1]})`,
  tex: [
    `f(X^{${m + 1}})=(${x[0]})^2+(${x[1]})^2=${f}`,
    `\\text{fit}_{${m + 1}}=\\dfrac{1}{1+${f}}=${(1 / (1 + f)).toFixed(4)}`,
  ],
  checks: [
    { label: "f", expect: f, get: (r) => r.afterInit.f[m] },
    { label: "fit", expect: 1 / (1 + f), get: (r) => r.afterInit.fit[m] },
  ],
});

interface NB {
  m: number;
  phase: "employed" | "onlooker";
  j: number;
  k: number;
  phi: number;
  xmj: number;
  xkj: number;
  v: number;
  clampTo?: number;
  vec: string;
  f: number;
  fitOld: number;
  accept: boolean;
  t: number;
  r?: [number, number];
  derived?: boolean;
}

function nbLine(n: NB): HandLine {
  const m1 = n.m + 1;
  const fit = 1 / (1 + n.f);
  const par = (x: number) => (x < 0 ? `(${x})` : `${x}`);
  const tex = [
    ...(n.r ? [`r=${n.r[0]}<p_{${m1}}=${n.r[1]}\\ \\Rightarrow\\ \\text{onlooker recruited}`] : []),
    `j=${n.j + 1},\\ k=${n.k + 1},\\ \\phi=${n.phi}:\\quad v=${n.xmj}+${par(n.phi)}\\,(${n.xmj}-${par(n.xkj)})=${n.v}${
      n.clampTo !== undefined ? `\\ \\to\\ \\min(${n.v},\\,${n.clampTo})=${n.clampTo}` : ""
    }`,
    `f${n.vec}=${n.f},\\quad \\text{fit}=\\dfrac{1}{1+${n.f}}=${fit.toFixed(4)}\\ ${n.accept ? ">" : "<"}\\ ${n.fitOld.toFixed(4)}\\ \\Rightarrow\\ ${
      n.accept ? `\\text{replace},\\ t_{${m1}}=0` : `\\text{keep},\\ t_{${m1}}=${n.t}`
    }`,
  ];
  return {
    who: n.phase === "employed" ? `Employed bee ${m1}` : `Onlooker at source ${m1}`,
    tex,
    derived: n.derived,
    checks: [
      { label: "v (before clipping)", expect: n.v, get: (r) => cand(r, n.phase, n.m).raw },
      { label: "f(v)", expect: n.f, get: (r) => cand(r, n.phase, n.m).fNew },
      { label: "fit(v)", expect: fit, get: (r) => cand(r, n.phase, n.m).fitNew },
      { label: `t${m1}`, expect: n.t, get: (r) => sel(r, n.phase, n.m).trialAfter },
    ],
  };
}

const fit = (f: number) => 1 / (1 + f);

export const HAND_CALC: HandSection[] = [
  {
    title: "Step 1 · Initialization: f = x₁² + x₂², fit = 1/(1+f)",
    slides: "slide 14",
    lines: [
      initLine(0, [2, -1], 5),
      initLine(1, [-3, 2], 13),
      initLine(2, [1, -4], 17),
      initLine(3, [-5, 3], 34),
      initLine(4, [3, 0], 9),
    ],
  },
  {
    title: "Step 2 · Employed bees: v = x_mj + φ(x_mj − x_kj), then greedy selection",
    slides: "slides 15–16",
    lines: [
      nbLine({ m: 0, phase: "employed", j: 0, k: 3, phi: 0.81, xmj: 2, xkj: -5, v: 7.67, clampTo: 5, vec: "(5,\\,-1)", f: 26, fitOld: fit(5), accept: false, t: 1 }),
      nbLine({ m: 1, phase: "employed", j: 0, k: 4, phi: -0.5, xmj: -3, xkj: 3, v: 0, vec: "(0,\\,2)", f: 4, fitOld: fit(13), accept: true, t: 0, derived: true }),
      nbLine({ m: 2, phase: "employed", j: 1, k: 4, phi: -0.63, xmj: -4, xkj: 0, v: -1.48, vec: "(1,\\,-1.48)", f: 3.1904, fitOld: fit(17), accept: true, t: 0, derived: true }),
      nbLine({ m: 3, phase: "employed", j: 1, k: 0, phi: -0.07, xmj: 3, xkj: -1, v: 2.72, vec: "(-5,\\,2.72)", f: 32.3984, fitOld: fit(34), accept: true, t: 0, derived: true }),
      nbLine({ m: 4, phase: "employed", j: 0, k: 2, phi: 0.5, xmj: 3, xkj: 1, v: 4, vec: "(4,\\,0)", f: 16, fitOld: fit(9), accept: false, t: 1, derived: true }),
    ],
  },
  {
    title: "Probabilities: p_m = 0.9 · fit_m / max(fit) + 0.1, with max(fit) = fit₃ = 1/4.1904",
    slides: "slide 16",
    lines: [1 / 6, 0.2, 1 / 4.1904, 1 / 33.3984, 0.1].map((ft, m) => {
      const p = 0.9 * (ft / (1 / 4.1904)) + 0.1;
      return {
        who: `p${"₁₂₃₄₅"[m]}`,
        tex: [`p_{${m + 1}}=0.9\\times\\dfrac{${ft.toFixed(4)}}{0.2386}+0.1=${p.toFixed(4)}`],
        checks: [{ label: `p${m + 1}`, expect: p, get: (r: TextbookResult) => (r.probStep.detail as { p: number[] }).p[m] }],
      };
    }),
  },
  {
    title: "Step 3 · Onlooker bees: visit sources in turn, recruit when r < p_m",
    slides: "slides 17–18",
    lines: [
      nbLine({ m: 0, phase: "onlooker", j: 0, k: 4, phi: 0.68, xmj: 2, xkj: 3, v: 1.32, vec: "(1.32,\\,-1)", f: 2.7424, fitOld: fit(5), accept: true, t: 0, r: [0.39, 0.729] }),
      nbLine({ m: 1, phase: "onlooker", j: 0, k: 3, phi: 0.2, xmj: 0, xkj: -5, v: 1, vec: "(1,\\,2)", f: 5, fitOld: fit(4), accept: false, t: 1, r: [0.62, 0.854], derived: true }),
      nbLine({ m: 2, phase: "onlooker", j: 0, k: 1, phi: -0.12, xmj: 1, xkj: 0, v: 0.88, vec: "(0.88,\\,-1.48)", f: 2.9648, fitOld: fit(3.1904), accept: true, t: 0, r: [0.15, 1], derived: true }),
      nbLine({ m: 3, phase: "onlooker", j: 0, k: 4, phi: -0.11, xmj: -5, xkj: 3, v: -4.12, vec: "(-4.12,\\,2.72)", f: 24.3728, fitOld: fit(32.3984), accept: true, t: 0, r: [0.1, 0.213], derived: true }),
      nbLine({ m: 4, phase: "onlooker", j: 0, k: 1, phi: 0.1, xmj: 3, xkj: 0, v: 3.3, vec: "(3.3,\\,0)", f: 10.89, fitOld: fit(9), accept: false, t: 2, r: [0.27, 0.477], derived: true }),
    ],
  },
  {
    title: "Step 4 · Scout bee: t = [0, 1, 0, 0, 2], limit = 1, so only source 5 has t > limit",
    slides: "slide 19",
    lines: [
      {
        who: "Scout at source 5",
        tex: [
          `\\text{memory } B=(3,\\,0),\\ f=9,\\ \\text{fit}=0.1`,
          `x_{5,1}=-5+0.43\\times(5-(-5))=-0.7,\\qquad x_{5,2}=-5+0.58\\times(5-(-5))=0.8`,
          `f(-0.7,\\,0.8)=0.49+0.64=1.13,\\quad \\text{fit}=\\dfrac{1}{2.13}=0.4695,\\quad t_5=0`,
        ],
        checks: [
          { label: "x₅,₁", expect: -0.7, get: (r) => r.afterScout.X[4][0] },
          { label: "x₅,₂", expect: 0.8, get: (r) => r.afterScout.X[4][1] },
          { label: "f", expect: 1.13, get: (r) => r.afterScout.f[4] },
          { label: "fit", expect: 1 / 2.13, get: (r) => r.afterScout.fit[4] },
          { label: "t₅", expect: 0, get: (r) => r.afterScout.trial[4] },
        ],
      },
      {
        who: "Memorize best",
        tex: [`f^*=\\min(2.7424,\\ 4,\\ 2.9648,\\ 24.3728,\\ 1.13)=1.13\\quad\\text{at } X^5=(-0.7,\\,0.8)`],
        checks: [{ label: "best f", expect: 1.13, get: (r) => (r.memorize.kind === "memorize" ? r.memorize.detail.best.f : NaN) }],
      },
    ],
  },
];
