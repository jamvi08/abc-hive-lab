/**
 * Plain-language explanation for every step, plus the formula with the real
 * numbers substituted (rendered with KaTeX by the UI).
 * Body strings may contain **bold** segments.
 */
import { fitness } from "./problems";
import { fmt, sub, sup, tnum, tpar, tvec, vecStr } from "./format";
import type { AbcConfig, Step } from "./types";

export interface Explanation {
  title: string;
  body: string[];
  math: string[];
  verdict?: { tone: "good" | "bad" | "info"; text: string };
}

const fitTex = (f: number, label = "\\text{fit}") =>
  f >= 0
    ? `${label}=\\dfrac{1}{1+${tnum(f)}}=${tnum(fitness(f))}`
    : `${label}=1+\\lvert ${tnum(f)}\\rvert=${tnum(fitness(f))}`;

const fitWords = (f: number) =>
  f >= 0 ? `fit = 1 / (1 + f) = ${fmt(fitness(f))}` : `f is negative, so fit = 1 + |f| = ${fmt(fitness(f))}`;

export function explain(step: Step, cfg: AbcConfig): Explanation {
  const Np = Math.max(2, Math.floor(cfg.colonySize / 2));
  const { lb, ub } = cfg.problem;
  const D = lb.length;

  switch (step.kind) {
    case "init": {
      const s = step.snap;
      const body = [
        `The colony has **S = ${cfg.colonySize}** bees: **Np = ${Np}** employed bees (one per food source) and ${Np} onlooker bees.`,
      ];
      const math: string[] = [];
      if (step.detail.given) {
        body.push(
          "The starting food sources are the ones given on the slide. For each one we compute the objective value f and its fitness (the nectar amount).",
        );
      } else {
        body.push(
          `Scout bees discover ${Np} food sources at random inside the bounds, one random number per variable. Each source is a candidate solution.`,
        );
        const r = step.detail.rands![0];
        math.push(`x_{m,i}=l_i+\\text{rand}(0,1)\\cdot(u_i-l_i)`);
        for (let i = 0; i < D; i++)
          math.push(
            `x_{1,${i + 1}}=${tnum(lb[i])}+${tnum(r[i])}\\times(${tnum(ub[i])}-${tpar(lb[i])})=${tnum(s.X[0][i])}`,
          );
      }
      math.push(`f(X^1)=f${tvec(s.X[0])}=${tnum(s.f[0])}`);
      math.push(fitTex(s.f[0], "\\text{fit}_1"));
      body.push("Every trial counter t starts at **0**.");
      return {
        title: "Initialization phase",
        body,
        math,
        verdict: { tone: "info", text: `Best so far: f = ${fmt(s.best.f)} at ${vecStr(s.best.x)}` },
      };
    }

    case "candidate": {
      const d = step.detail;
      const m1 = d.m + 1,
        j1 = d.j + 1,
        k1 = d.k + 1;
      const who = d.bee === "employed" ? `Employed bee ${m1}` : `Onlooker #${d.onlookerNo}`;
      const body = [
        d.bee === "employed"
          ? `${who} is at food source ${m1}, X${sup(m1)} = ${vecStr(d.xOld)} with f = ${fmt(d.fOld)}. It looks for a better source nearby.`
          : `${who} has been recruited to food source ${m1}, X${sup(m1)} = ${vecStr(d.xOld)}. It searches near this source, the same way an employed bee does.`,
        `Only **one variable** changes: j = ${j1}, chosen at random. The partner food source is k = ${k1}, X${sup(k1)} = ${vecStr(d.xk)}, also chosen at random, and φ = ${fmt(d.phi)} is a random number in [−1, 1].`,
      ];
      const math = [
        `v_{${m1},${j1}}=x_{${m1},${j1}}+\\phi\\,(x_{${m1},${j1}}-x_{${k1},${j1}})`,
        `=${tnum(d.xOld[d.j])}+${tpar(d.phi)}\\times(${tnum(d.xOld[d.j])}-${tpar(d.xk[d.j])})=${tnum(d.raw)}`,
      ];
      if (d.wasClamped) {
        const hitUpper = d.raw > ub[d.j];
        body.push(
          `${fmt(d.raw)} is outside the bounds [${fmt(lb[d.j])}, ${fmt(ub[d.j])}], so it is clipped to the ${hitUpper ? "upper" : "lower"} bound, ${fmt(d.clamped)}.`,
        );
        math.push(
          hitUpper
            ? `v_{${m1},${j1}}=\\min(${tnum(d.raw)},\\ ${tnum(ub[d.j])})=${tnum(d.clamped)}`
            : `v_{${m1},${j1}}=\\max(${tnum(d.raw)},\\ ${tnum(lb[d.j])})=${tnum(d.clamped)}`,
        );
      }
      body.push(`The candidate is v = ${vecStr(d.v)}. Its objective is f(v) = ${fmt(d.fNew)}, and ${fitWords(d.fNew)}.`);
      math.push(`f(v)=${tnum(d.fNew)}`, fitTex(d.fNew, "\\text{fit}(v)"));
      return {
        title: d.bee === "employed" ? `Employed bee ${m1} explores its neighbourhood` : `Onlooker #${d.onlookerNo} explores source ${m1}`,
        body,
        math,
      };
    }

    case "select": {
      const d = step.detail;
      const m1 = d.m + 1;
      const body = [
        `**Greedy selection**: the bee compares the nectar of the candidate v with the nectar of its current source X${sup(m1)} and keeps the richer one.`,
      ];
      const math: string[] = [];
      if (d.accepted) {
        body.push(
          `fit(v) = ${fmt(d.fitNew)} is greater than fit(X${sup(m1)}) = ${fmt(d.fitOld)}, so the bee **moves to v** and forgets the old source. Its trial counter is reset to 0.`,
        );
        math.push(
          `\\text{fit}(v)=${tnum(d.fitNew)}>\\text{fit}(X^{${m1}})=${tnum(d.fitOld)}\\ \\Rightarrow\\ X^{${m1}}\\leftarrow v,\\ t_{${m1}}=0`,
        );
      } else {
        body.push(
          `fit(v) = ${fmt(d.fitNew)} is not better than fit(X${sup(m1)}) = ${fmt(d.fitOld)}, so the bee **stays** where it is. The source failed to improve, so its trial counter goes up from ${d.trialBefore} to **${d.trialAfter}**.`,
        );
        math.push(
          `\\text{fit}(v)=${tnum(d.fitNew)}\\le\\text{fit}(X^{${m1}})=${tnum(d.fitOld)}\\ \\Rightarrow\\ t_{${m1}}=${d.trialBefore}+1=${d.trialAfter}`,
        );
        if (d.trialAfter > cfg.limit)
          body.push(`t${sub(m1)} = ${d.trialAfter} is now above limit = ${cfg.limit}, so a scout will replace this source in the scout phase.`);
      }
      return {
        title: `Greedy selection for food source ${m1}`,
        body,
        math,
        verdict: d.accepted
          ? { tone: "good", text: `Improved: f ${fmt(d.fOld)} → ${fmt(d.fNew)}` }
          : { tone: "bad", text: `Rejected: trial t${sub(m1)} = ${d.trialAfter}` },
      };
    }

    case "probabilities": {
      const { p, maxFit, maxIdx } = step.detail;
      const fit = step.snap.fit;
      const show = Array.from(new Set([0, maxIdx, fit.indexOf(Math.min(...fit))])).slice(0, 3);
      return {
        title: "Employed bees dance and share what they found",
        body: [
          "Every employed bee returns to the hive and does a waggle dance. The richer its food source (the higher its fitness), the more convincing the dance.",
          `Onlookers turn fitness into a probability. The richest source is **${maxIdx + 1}** (fit = ${fmt(maxFit)}), so it gets p = 1. Every p is at least 0.1, so even a poor source still has some chance of being picked.`,
        ],
        math: [
          `p_m=0.9\\cdot\\dfrac{\\text{fit}_m}{\\max(\\text{fit})}+0.1`,
          ...show.map((i) => `p_{${i + 1}}=0.9\\times\\dfrac{${tnum(fit[i])}}{${tnum(maxFit)}}+0.1=${tnum(p[i])}`),
        ],
      };
    }

    case "onlooker-choice": {
      const d = step.detail;
      if (d.method === "sweep") {
        const m1 = d.m + 1;
        return {
          title: d.recruited ? `Onlooker #${d.onlookerNo} is recruited to source ${m1}` : `Source ${m1} is skipped this time`,
          body: [
            `Onlookers go through the food sources one after another. For source ${m1} a random number r is drawn and compared with its probability p${sub(m1)}.`,
            d.recruited
              ? `r = ${fmt(d.r)} < p${sub(m1)} = ${fmt(d.p)}, so **onlooker #${d.onlookerNo} flies to source ${m1}** and searches there.`
              : `r = ${fmt(d.r)} ≥ p${sub(m1)} = ${fmt(d.p)}, so no onlooker goes there now. The next source is checked. (${step.snap.onlookersPlaced} of ${Np} onlookers placed so far.)`,
          ],
          math: [
            d.recruited
              ? `r=${tnum(d.r)}<p_{${m1}}=${tnum(d.p)}\\ \\Rightarrow\\ \\text{recruit}`
              : `r=${tnum(d.r)}\\ge p_{${m1}}=${tnum(d.p)}\\ \\Rightarrow\\ \\text{skip}`,
          ],
          verdict: d.recruited
            ? { tone: "good", text: `Onlooker #${d.onlookerNo} → source ${m1}` }
            : { tone: "info", text: `Skip source ${m1}` },
        };
      }
      const lo = d.m === 0 ? 0 : d.cumulative[d.m - 1];
      return {
        title: `Roulette wheel: onlooker #${d.onlookerNo} lands on source ${d.m + 1}`,
        body: [
          `Each source gets a slice of the wheel proportional to its p. The whole wheel adds up to Σp = ${fmt(d.total)}.`,
          `The pointer stops at r × Σp = ${fmt(d.r)} × ${fmt(d.total)} = ${fmt(d.spin)}. That lies in the slice of **source ${d.m + 1}** (from ${fmt(lo)} to ${fmt(d.cumulative[d.m])}), so the onlooker flies there.`,
        ],
        math: [
          `P_m=\\dfrac{p_m}{\\sum_k p_k}`,
          `r\\cdot\\textstyle\\sum p=${tnum(d.r)}\\times${tnum(d.total)}=${tnum(d.spin)}\\in[${tnum(lo)},\\ ${tnum(d.cumulative[d.m])})`,
        ],
        verdict: { tone: "good", text: `Onlooker #${d.onlookerNo} → source ${d.m + 1}` },
      };
    }

    case "scout-check": {
      const { trial, limit, abandon } = step.detail;
      const list = abandon.map((m) => m + 1).join(", ");
      return {
        title: abandon.length ? `Scout check: food source ${list} is exhausted` : "Scout check: no food source is abandoned",
        body: [
          `A food source is abandoned when its trial counter is **greater than limit = ${limit}**, which means it failed to improve too many times in a row.`,
          `Trial counters now: t = [${trial.join(", ")}].`,
          abandon.length
            ? `Source ${list} went over the limit. Its employed bee abandons it and becomes a **scout**.`
            : "No counter is above the limit, so no scouts are sent out this cycle. (The scout phase doesn't happen in every cycle.)",
        ],
        math: abandon.length
          ? abandon.map((m) => `t_{${m + 1}}=${trial[m]}>\\text{limit}=${limit}\\ \\Rightarrow\\ \\text{abandon }X^{${m + 1}}`)
          : [`\\max_m t_m=${Math.max(...trial)}\\le\\text{limit}=${limit}`],
      };
    }

    case "scout-replace": {
      const d = step.detail;
      const m1 = d.m + 1;
      return {
        title: `Employed bee ${m1} becomes a scout`,
        body: [
          `Before leaving, the old source is stored in memory **B = ${vecStr(d.old)}** (f = ${fmt(d.oldF)}, fit = ${fmt(d.oldFit)}), in case it turns out to be useful later.`,
          `The scout then flies to a **completely random** new place in the search space. It uses the same formula as initialization.`,
          `New source: X${sup(m1)} = ${vecStr(d.newX)}, f = ${fmt(d.f)}, fit = ${fmt(d.fit)}. Its trial counter restarts at 0.`,
        ],
        math: [
          ...d.rands.map(
            (r, i) =>
              `x_{${m1},${i + 1}}=${tnum(lb[i])}+${tnum(r)}\\times(${tnum(ub[i])}-${tpar(lb[i])})=${tnum(d.newX[i])}`,
          ),
          `f=${tnum(d.f)},\\quad ${fitTex(d.f)}`,
        ],
        verdict: { tone: "info", text: `Abandoned ${vecStr(d.old)} → scouted ${vecStr(d.newX)}` },
      };
    }

    case "memorize": {
      const { best, previous, improved, source } = step.detail;
      return {
        title: `Memorize the best solution (end of cycle ${step.cycle})`,
        body: [
          improved
            ? `**New best!** x* = ${vecStr(best.x)} with f = ${fmt(best.f)}${source === "memoryB" ? " (taken from memory B)" : ""}. Before this cycle the best was f = ${fmt(previous.f)}.`
            : `No source beat the best so far, so it stays at x* = ${vecStr(best.x)}, f = ${fmt(best.f)}.`,
          `Cycle ${step.cycle} of ${cfg.maxCycles} is complete. ${step.snap.evals} function evaluations so far.`,
        ],
        math: [`f^*=${tnum(best.f, 6)}\\quad x^*=${tvec(best.x, 4)}`],
        verdict: improved ? { tone: "good", text: `Best f = ${fmt(best.f, 6)}` } : { tone: "info", text: `Best f = ${fmt(best.f, 6)}` },
      };
    }

    case "done": {
      const b = step.snap.best;
      const opt = cfg.problem.optimum;
      return {
        title: "Done: the maximum cycle number has been reached",
        body: [
          `After ${cfg.maxCycles} cycles and ${step.snap.evals} function evaluations, the colony's best food source is x* = ${vecStr(b.x, 4)} with f = ${fmt(b.f, 6)}.`,
          opt
            ? `The true minimum is f = ${fmt(opt.f, 4)}, so the error is ${fmt(b.f - opt.f, 6)}.`
            : "Press Reset to try other parameters, or switch on quiz mode and run it again.",
        ],
        math: [`f^*=${tnum(b.f, 6)}`],
        verdict: { tone: "good", text: "Finished" },
      };
    }
  }
}

/** Notes connecting cycle 1 of the textbook run to the slides. */
export function textbookNote(step: Step): { slide: number; text: string; derived?: boolean } | null {
  if (step.cycle > 1) return null;
  switch (step.kind) {
    case "init":
      return { slide: 14, text: "Step 1 on the slides: X, f, fit and t = 0 should match exactly." };
    case "candidate":
    case "select": {
      const d = step.detail;
      if (d.bee === "employed")
        return d.m === 0
          ? { slide: 15, text: "Slide 15 works this out by hand: variable 1, partner X⁴, φ = 0.81 → 7.67, clipped to 5, f = 26, fit = 0.037, rejected, t₁ = 1." }
          : {
              slide: 16,
              derived: true,
              text: "The slides only print the final matrix for this bee (slide 16). The random numbers here (j, k, φ) were back-calculated so that the result matches it exactly.",
            };
      return d.m === 0
        ? { slide: 17, text: "Slide 17: variable 1, partner X⁵, φ = 0.68 → 1.32, f = 2.74, fit = 0.267 > 0.167, so the new solution is kept." }
        : {
            slide: 18,
            derived: true,
            text: "The slides only show the result after the whole onlooker phase (slide 18). These random numbers were back-calculated to reproduce it.",
          };
    }
    case "probabilities":
      return {
        slide: 16,
        text: "The slide lists p = [0.729, 0.859, 1, 0.213, 0.476]. The exact value of p₂ is 0.854 (0.859 looks like a typo), and p₅ = 0.4771. Neither affects the outcome.",
      };
    case "onlooker-choice":
      return step.detail.method === "sweep" && step.detail.m === 0
        ? { slide: 17, text: "Slide 17: food source 1, r = 0.39 < 0.729, so the onlooker explores it." }
        : { slide: 18, derived: true, text: "r is back-calculated. Every onlooker passes the check, giving one onlooker per source, as in slide 18's matrix." };
    case "scout-check":
      return { slide: 19, text: "Slide 19: t = [0, 1, 0, 0, 2] and limit = 1, so only source 5 has t > limit." };
    case "scout-replace":
      return {
        slide: 19,
        text: "Slide 19 uses rand = 0.43 and 0.58. Note: −5 + 0.58 × 10 = +0.8 (the slide prints −0.8), and f = 1.13 and fit = 0.469 are the same either way. The abandoned source is stored as B = [3 0].",
      };
    case "memorize":
      return { slide: 19, text: "This is where the slides stop. From cycle 2 on, the random numbers come from the seed." };
    default:
      return null;
  }
}

