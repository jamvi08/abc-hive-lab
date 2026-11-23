export type Vec = number[];

export interface Problem {
  id: string;
  name: string;
  /** KaTeX source for the objective */
  tex: string;
  /** one-line plain description */
  blurb: string;
  f: (x: Vec) => number;
  lb: Vec;
  ub: Vec;
  /** known global minimiser(s) and minimum value, if any */
  optimum?: { xs: Vec[]; f: number };
}

export type Selection = "sweep" | "roulette";

export interface AbcConfig {
  problem: Problem;
  /** colony size S. Np = S / 2 food sources = employed bees = onlooker bees */
  colonySize: number;
  limit: number;
  maxCycles: number;
  selection: Selection;
  /** ablation switches (used by the Race page) */
  useOnlookers?: boolean;
  useScouts?: boolean;
  /** optional fixed starting population (textbook example) */
  initialPopulation?: Vec[];
}

export interface Best {
  x: Vec;
  f: number;
  fit: number;
  /** cycle in which it was found (0 = initialisation) */
  cycle: number;
}

export interface Snapshot {
  X: Vec[];
  f: number[];
  fit: number[];
  trial: number[];
  /** p_m, only after probabilities have been computed in this cycle */
  prob: number[] | null;
  best: Best;
  /** memory B of the last abandoned source (slide 19) */
  abandoned: { m: number; x: Vec; f: number; fit: number } | null;
  cycle: number;
  evals: number;
  /** how many entries of the run's convergence log are valid at this step */
  convergenceLen: number;
  onlookersPlaced: number;
}

export type BeeRole = "employed" | "onlooker";

export interface CandidateDetail {
  bee: BeeRole;
  m: number;
  j: number;
  k: number;
  phi: number;
  xOld: Vec;
  xk: Vec;
  raw: number;
  clamped: number;
  wasClamped: boolean;
  v: Vec;
  fOld: number;
  fitOld: number;
  fNew: number;
  fitNew: number;
  onlookerNo?: number;
}

export interface SelectDetail extends CandidateDetail {
  accepted: boolean;
  trialBefore: number;
  trialAfter: number;
}

export type OnlookerChoiceDetail =
  | {
      method: "sweep";
      m: number;
      r: number;
      p: number;
      recruited: boolean;
      onlookerNo: number; // number of the onlooker being placed (1-based)
    }
  | {
      method: "roulette";
      r: number;
      spin: number; // r * total
      total: number;
      cumulative: number[];
      m: number;
      onlookerNo: number;
    };

export interface ScoutCheckDetail {
  trial: number[];
  limit: number;
  abandon: number[];
}

export interface ScoutReplaceDetail {
  m: number;
  old: Vec;
  oldF: number;
  oldFit: number;
  oldTrial: number;
  rands: number[];
  newX: Vec;
  f: number;
  fit: number;
}

export interface InitDetail {
  given: boolean;
  /** rand(0,1) draws per source/variable, when generated */
  rands: number[][] | null;
}

export interface MemorizeDetail {
  best: Best;
  previous: Best;
  improved: boolean;
  source: "population" | "memoryB";
}

export type StepEvent =
  | { kind: "init"; detail: InitDetail }
  | { kind: "candidate"; detail: CandidateDetail }
  | { kind: "select"; detail: SelectDetail }
  | { kind: "probabilities"; detail: { p: number[]; maxFit: number; maxIdx: number } }
  | { kind: "onlooker-choice"; detail: OnlookerChoiceDetail }
  | { kind: "scout-check"; detail: ScoutCheckDetail }
  | { kind: "scout-replace"; detail: ScoutReplaceDetail }
  | { kind: "memorize"; detail: MemorizeDetail }
  | { kind: "done"; detail: { reason: "maxCycles" } };

export type Phase = "init" | "employed" | "onlooker" | "scout" | "memorize" | "done";

export type Step = StepEvent & {
  id: number;
  phase: Phase;
  cycle: number;
  /** pseudocode line to highlight */
  line: number;
  /** true when this step used a random number beyond the textbook script */
  offScript?: boolean;
  snap: Snapshot;
};

export interface ConvergencePoint {
  cycle: number;
  evals: number;
  bestF: number;
  /** positions of all food sources at the end of this cycle (for trails) */
  X: Vec[];
}
