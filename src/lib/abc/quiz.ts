/**
 * Predict-the-next-step quiz: turns an upcoming step into a question that the
 * learner answers BEFORE the tool reveals what happens.
 */
import { fmt, sub, sup, vecStr } from "./format";
import type { Step } from "./types";

export type QuizType = "select" | "onlooker" | "scout" | "compute";

export const QUIZ_TYPES: { id: QuizType; label: string }[] = [
  { id: "select", label: "Greedy selection (move or stay?)" },
  { id: "onlooker", label: "Onlooker choice (which source?)" },
  { id: "scout", label: "Scout check (what gets abandoned?)" },
  { id: "compute", label: "Hand-calc: compute v yourself" },
];

export type Quiz =
  | {
      kind: "choice";
      type: QuizType;
      prompt: string[];
      options: { value: string; label: string }[];
      answer: string;
      why: string;
    }
  | {
      kind: "multi";
      type: QuizType;
      prompt: string[];
      options: { value: string; label: string }[];
      answer: string[];
      why: string;
    }
  | { kind: "numeric"; type: QuizType; prompt: string[]; answer: number; tolerance: number; why: string };

export function quizFor(step: Step, enabled: Set<QuizType>): Quiz | null {
  switch (step.kind) {
    case "select": {
      if (!enabled.has("select")) return null;
      const d = step.detail;
      const m1 = d.m + 1;
      return {
        kind: "choice",
        type: "select",
        prompt: [
          `${d.bee === "employed" ? `Employed bee ${m1}` : `Onlooker #${d.onlookerNo}`} found candidate v = ${vecStr(d.v)}.`,
          `fit(v) = ${fmt(d.fitNew)}   vs   fit(X${sup(m1)}) = ${fmt(d.fitOld)}.  Current t${sub(m1)} = ${d.trialBefore}.`,
          "What does greedy selection do?",
        ],
        options: [
          { value: "move", label: `Move to v and reset t${sub(m1)} = 0` },
          { value: "stay", label: `Stay at X${sup(m1)} and set t${sub(m1)} = ${d.trialBefore + 1}` },
        ],
        answer: d.accepted ? "move" : "stay",
        why: d.accepted
          ? `fit(v) = ${fmt(d.fitNew)} > ${fmt(d.fitOld)}: higher fitness means more nectar, so the bee moves.`
          : `fit(v) = ${fmt(d.fitNew)} is not higher than ${fmt(d.fitOld)}, so the bee stays and the source's trial counter goes up.`,
      };
    }
    case "onlooker-choice": {
      if (!enabled.has("onlooker")) return null;
      const d = step.detail;
      if (d.method === "sweep") {
        const m1 = d.m + 1;
        return {
          kind: "choice",
          type: "onlooker",
          prompt: [
            `Onlookers are checking the food sources in turn. Now it's source ${m1}'s turn.`,
            `r = ${fmt(d.r)},   p${sub(m1)} = ${fmt(d.p)}.`,
            `Is an onlooker recruited to source ${m1}?`,
          ],
          options: [
            { value: "yes", label: "Yes, an onlooker flies there" },
            { value: "no", label: "No, skip to the next source" },
          ],
          answer: d.recruited ? "yes" : "no",
          why: d.recruited ? `r < p${sub(m1)}, so it is recruited.` : `r ≥ p${sub(m1)}, so it is skipped.`,
        };
      }
      const bounds = d.cumulative.map((c, i) => `${i + 1}: [${fmt(i ? d.cumulative[i - 1] : 0, 2)}, ${fmt(c, 2)})`);
      return {
        kind: "choice",
        type: "onlooker",
        prompt: [
          `The roulette pointer stops at r·Σp = ${fmt(d.r)} × ${fmt(d.total)} = ${fmt(d.spin)}.`,
          `Slices (cumulative p):  ${bounds.join("   ")}`,
          "Which food source does the onlooker go to?",
        ],
        options: d.cumulative.map((_, i) => ({ value: String(i), label: `Source ${i + 1}` })),
        answer: String(d.m),
        why: `${fmt(d.spin)} falls inside source ${d.m + 1}'s slice.`,
      };
    }
    case "scout-check": {
      if (!enabled.has("scout")) return null;
      const d = step.detail;
      return {
        kind: "multi",
        type: "scout",
        prompt: [
          `limit = ${d.limit}. Trial counters t = [${d.trial.join(", ")}].`,
          "Which food sources will be abandoned? (Select none if no source is abandoned.)",
        ],
        options: d.trial.map((t, i) => ({ value: String(i), label: `${i + 1} (t=${t})` })),
        answer: d.abandon.map(String),
        why: d.abandon.length
          ? `A source is abandoned only when t > limit, so: ${d.abandon.map((m) => m + 1).join(", ")}.`
          : `No t is greater than ${d.limit}, so no source is abandoned.`,
      };
    }
    case "candidate": {
      if (!enabled.has("compute")) return null;
      const d = step.detail;
      const m1 = d.m + 1,
        j1 = d.j + 1,
        k1 = d.k + 1;
      return {
        kind: "numeric",
        type: "compute",
        prompt: [
          `Bee at source ${m1} changes variable j = ${j1}, using partner k = ${k1} and φ = ${fmt(d.phi, 4)}.`,
          `x${sub(m1)},${sub(j1)} = ${fmt(d.xOld[d.j], 4)}   and   x${sub(k1)},${sub(j1)} = ${fmt(d.xk[d.j], 4)}`,
          `Compute v = x${sub(m1)},${sub(j1)} + φ·(x${sub(m1)},${sub(j1)} − x${sub(k1)},${sub(j1)}) before any clipping.`,
        ],
        answer: d.raw,
        tolerance: Math.max(0.01, Math.abs(d.raw) * 0.01),
        why: `${fmt(d.xOld[d.j], 4)} + ${fmt(d.phi, 4)} × (${fmt(d.xOld[d.j], 4)} − ${fmt(d.xk[d.j], 4)}) = ${fmt(d.raw, 4)}`,
      };
    }
    default:
      return null;
  }
}

export function checkAnswer(q: Quiz, given: string | string[] | number): boolean {
  if (q.kind === "choice") return given === q.answer;
  if (q.kind === "multi") {
    const g = new Set(given as string[]);
    return g.size === q.answer.length && q.answer.every((a) => g.has(a));
  }
  return Math.abs((given as number) - q.answer) <= q.tolerance;
}
