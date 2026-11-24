/**
 * Predict-the-next-step quiz: turns an upcoming step into a question that the
 * learner answers BEFORE the tool reveals what happens.
 */
import { fmt, sub, vecStr } from "./format";
import type { Step } from "./types";

export type QuizType = "select" | "onlooker" | "scout" | "compute";

export const QUIZ_TYPES: { id: QuizType; label: string }[] = [
  { id: "select", label: "Move or stay? (greedy selection)" },
  { id: "onlooker", label: "Where do onlookers go?" },
  { id: "scout", label: "Which flower is abandoned?" },
  { id: "compute", label: "Calculate the new spot by hand" },
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
          `${d.bee === "employed" ? `Bee ${m1}` : `Onlooker #${d.onlookerNo}`} found a new spot ${vecStr(d.v)}.`,
          `New spot fitness = ${fmt(d.fitNew)}, old flower fitness = ${fmt(d.fitOld)} (higher fitness = more nectar).`,
          "What does the bee do?",
        ],
        options: [
          { value: "move", label: "Move to the new spot" },
          { value: "stay", label: "Stay at the old flower" },
        ],
        answer: d.accepted ? "move" : "stay",
        why: d.accepted
          ? `${fmt(d.fitNew)} > ${fmt(d.fitOld)}: the new spot has more nectar, so the bee moves.`
          : `${fmt(d.fitNew)} is not more than ${fmt(d.fitOld)}, so the bee stays and its failure counter goes up.`,
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
            `Onlookers check the flowers one by one. Now it's flower ${m1}'s turn.`,
            `Random number r = ${fmt(d.r)}, chance p${sub(m1)} = ${fmt(d.p)}.`,
            `Does an onlooker go to flower ${m1}?`,
          ],
          options: [
            { value: "yes", label: "Yes, it goes there" },
            { value: "no", label: "No, it skips this flower" },
          ],
          answer: d.recruited ? "yes" : "no",
          why: d.recruited ? `r < p${sub(m1)}, so an onlooker goes there.` : `r ≥ p${sub(m1)}, so the flower is skipped.`,
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
          `limit = ${d.limit}. How many times each flower failed in a row: t = [${d.trial.join(", ")}].`,
          "Which flowers get abandoned? (Pick none if no flower is.)",
        ],
        options: d.trial.map((t, i) => ({ value: String(i), label: `${i + 1} (t=${t})` })),
        answer: d.abandon.map(String),
        why: d.abandon.length
          ? `A flower is abandoned only when t > limit, so: ${d.abandon.map((m) => m + 1).join(", ")}.`
          : `No t is greater than ${d.limit}, so no flower is abandoned.`,
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
