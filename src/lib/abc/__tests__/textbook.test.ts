import { describe, expect, it } from "vitest";
import { HAND_CALC } from "../handcalc";
import { judge, runTextbookCycle1, SLIDE_CHECKS, TEXTBOOK_SCRIPT, newTextbookRun } from "../textbook";

/** Known errata on the slides; everything else must match. */
const KNOWN_SLIDE_ERRATA = new Set([
  "After Employed Phase-p-2", // 0.859 printed, exact 0.854
  "s-x2", // −0.8 printed, −5 + 0.58·10 = +0.8
  "s-x12", // slide 19 shows (1.32, −0.92) without any step producing it
]);

describe("textbook example (slides 14–19)", () => {
  const r = runTextbookCycle1();

  for (const c of SLIDE_CHECKS) {
    it(`${c.group}: ${c.label} (slide ${c.slide})`, () => {
      const status = judge(c, c.get(r));
      if (KNOWN_SLIDE_ERRATA.has(c.id)) expect(status).toBe("differs");
      else expect(["match", "rounding"]).toContain(status);
    });
  }

  it("hand calculation of employed bee 1", () => {
    const s = r.steps.find((x) => x.kind === "candidate" && x.phase === "employed")!;
    if (s.kind !== "candidate") throw new Error();
    expect(s.detail.raw).toBeCloseTo(2 + 0.81 * (2 - -5), 10); // 7.67
    expect(s.detail.clamped).toBe(5);
    expect(s.detail.fNew).toBe(26);
    expect(s.detail.fitNew).toBeCloseTo(1 / 27, 10);
  });

  it("probabilities use p = 0.9·fit/max(fit) + 0.1", () => {
    const p = (r.probStep.detail as { p: number[] }).p;
    const fit = r.afterEmployed.fit;
    const mx = Math.max(...fit);
    fit.forEach((ft, i) => expect(p[i]).toBeCloseTo(0.9 * (ft / mx) + 0.1, 12));
    expect(p[1]).toBeCloseTo(0.854272, 6); // exact value of the slide's "0.859"
  });

  it("scout replaces source 5 with (−0.7, 0.8), f = 1.13", () => {
    expect(r.afterScout.X[4][0]).toBeCloseTo(-0.7, 10);
    expect(r.afterScout.X[4][1]).toBeCloseTo(0.8, 10);
    expect(r.afterScout.f[4]).toBeCloseTo(1.13, 10);
    expect(r.afterScout.abandoned).toEqual({ m: 4, x: [3, 0], f: 9, fit: 0.1 });
  });

  it("best solution memorised after cycle 1 is the scout's new source", () => {
    const m = r.memorize;
    if (m.kind !== "memorize") throw new Error();
    expect(m.detail.best.f).toBeCloseTo(1.13, 10);
    expect(m.detail.improved).toBe(true);
  });

  it("consumes the scripted numbers exactly during cycle 1 and stays on-script", () => {
    expect(r.steps.every((s) => !s.offScript)).toBe(true);
    const run = newTextbookRun();
    let n = 0;
    for (const s of run.steps()) {
      n++;
      if (s.kind === "memorize") break;
    }
    expect((run.rng as unknown as { position: number }).position).toBe(TEXTBOOK_SCRIPT.length);
    expect(n).toBeGreaterThan(0);
  });

  it("continues past the slides with seeded random numbers", () => {
    const run = newTextbookRun();
    const all = [...run.steps()];
    expect(all.at(-1)!.kind).toBe("done");
    expect(all.some((s) => s.offScript)).toBe(true);
    expect(run.convergence).toHaveLength(11); // cycle 0 + 10 cycles
  });
});


describe("independent hand calculation of cycle 1", () => {
  const r = runTextbookCycle1();
  for (const sec of HAND_CALC)
    for (const line of sec.lines)
      for (const c of line.checks)
        it(`${sec.slides} · ${line.who} · ${c.label} = ${c.expect}`, () => {
          expect(c.get(r)).toBeCloseTo(c.expect, 9);
        });
});
