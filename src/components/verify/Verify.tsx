"use client";

import Link from "next/link";
import { useState } from "react";
import { fmt } from "@/lib/abc/format";
import { HAND_CALC } from "@/lib/abc/handcalc";
import { judge, runTextbookCycle1, SLIDE_CHECKS, TEXTBOOK_SCRIPT, TEXTBOOK_X0, type CheckStatus, type TextbookResult } from "@/lib/abc/textbook";
import { Tex } from "../Tex";

const STATUS: Record<CheckStatus, { icon: string; label: string; cls: string }> = {
  match: { icon: "✓", label: "exact", cls: "bg-good/10 text-emerald-300" },
  rounding: { icon: "≈", label: "rounding", cls: "bg-amber-400/10 text-amber-200" },
  differs: { icon: "⚠", label: "slide erratum", cls: "bg-rose-400/10 text-rose-200" },
};

export function Verify() {
  const [res, setRes] = useState<TextbookResult | null>(null);

  const rows = SLIDE_CHECKS.map((c) => {
    const tool = res ? c.get(res) : null;
    return { c, tool, status: tool === null ? null : judge(c, tool) };
  });
  const count = (s: CheckStatus) => rows.filter((r) => r.status === s).length;
  const handChecks = HAND_CALC.flatMap((s) => s.lines.flatMap((l) => l.checks));
  const handOk = res ? handChecks.filter((h) => Math.abs(h.get(res) - h.expect) < 1e-9).length : 0;

  const groups = Array.from(new Set(SLIDE_CHECKS.map((c) => c.group)));
  let rowNo = 0;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6">
      <header className="space-y-2">
        <div className="label">Checked against a hand calculation</div>
        <h1 className="text-2xl font-semibold tracking-tight">Textbook check: the solved example from the slides</h1>
        <p className="max-w-3xl text-[14.5px] leading-relaxed text-hive-muted">
          <span className="text-hive-text">Question (slide 14):</span> minimize f(x) = x₁² + x₂² with −5 ≤ x₁, x₂ ≤ 5, colony size
          S = 10 (Np = 5), T = 10 cycles, limit = 1. Below, the tool runs this example with the same initial population and the same
          random numbers. It then compares <strong className="text-hive-text">every value</strong> with the slides and with an
          independent hand calculation.
        </p>
      </header>

      <section className="card flex flex-wrap items-center gap-4 p-5">
        <div className="flex items-center gap-3">
          <Tex tex={`X_0=\\begin{bmatrix}${TEXTBOOK_X0.map((r) => r.join(" & ")).join("\\\\")}\\end{bmatrix}`} />
        </div>
        <div className="min-w-[260px] flex-1 space-y-2">
          {!res ? (
            <p className="text-sm text-hive-muted">Press the button to run cycle 1 of the example and check it.</p>
          ) : (
            <div className="flex flex-wrap gap-2 text-sm" data-testid="verify-summary">
              <span className={`rounded-lg px-3 py-1.5 ${STATUS.match.cls}`}>
                ✓ <strong>{count("match")}</strong> exact matches
              </span>
              <span className={`rounded-lg px-3 py-1.5 ${STATUS.rounding.cls}`}>
                ≈ <strong>{count("rounding")}</strong> differ only by the slide&apos;s rounding
              </span>
              <span className={`rounded-lg px-3 py-1.5 ${STATUS.differs.cls}`}>
                ⚠ <strong>{count("differs")}</strong> slide errata (explained)
              </span>
              <span className={`rounded-lg px-3 py-1.5 ${STATUS.match.cls}`}>
                ✓ <strong>
                  {handOk}/{handChecks.length}
                </strong>{" "}
                hand-calculated values reproduced
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setRes(runTextbookCycle1())} data-testid="run-check">
            {res ? "Run again" : "▶ Run the textbook check"}
          </button>
          <Link href="/?mode=textbook" className="btn">
            Replay step by step →
          </Link>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-hive-border px-5 py-3">
          <div className="label">Slide values vs tool values</div>
        </div>
        <div className="overflow-x-auto">
          <table className="num w-full text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-hive-muted">
              <tr className="border-b border-hive-border">
                <th className="px-4 py-2 text-left">slide</th>
                <th className="px-2 py-2 text-left">quantity</th>
                <th className="px-2 py-2 text-right">on the slide</th>
                <th className="px-2 py-2 text-right">tool</th>
                <th className="px-2 py-2 text-left">status</th>
                <th className="px-4 py-2 text-left">note</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows key={g} group={g}>
                  {rows
                    .filter((r) => r.c.group === g)
                    .map(({ c, tool, status }) => {
                      const delay = rowNo++ * 18;
                      return (
                        <tr key={c.id} className="border-t border-hive-border/50 align-top">
                          <td className="px-4 py-1.5 text-hive-muted">{c.slide}</td>
                          <td className="px-2 py-1.5">{c.label}</td>
                          <td className="px-2 py-1.5 text-right">{fmt(c.slideValue, 3)}</td>
                          <td className="px-2 py-1.5 text-right">
                            {tool === null ? <span className="text-hive-muted">?</span> : <span className="text-hive-text">{fmt(tool, 4)}</span>}
                          </td>
                          <td className="px-2 py-1.5">
                            {status && (
                              <span
                                className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11.5px] ${STATUS[status].cls}`}
                                style={{ animation: `flash 0.6s ease-out ${delay}ms both` }}
                              >
                                {STATUS[status].icon} {STATUS[status].label}
                              </span>
                            )}
                          </td>
                          <td className="max-w-[380px] px-4 py-1.5 font-sans text-[12px] leading-snug text-hive-muted">{c.note}</td>
                        </tr>
                      );
                    })}
                </GroupRows>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="label">The hand calculation (cycle 1)</div>
          <p className="mt-1 max-w-3xl text-[13.5px] text-hive-muted">
            Worked out by hand, independently of the code. Lines marked{" "}
            <span className="rounded bg-violet-400/20 px-1.5 py-0.5 text-[11px] text-violet-100">back-calculated</span> use random
            numbers the slides don&apos;t print. They were chosen so the result matches the slide&apos;s matrix exactly.
          </p>
        </div>
        {HAND_CALC.map((sec) => (
          <div key={sec.title} className="card p-5">
            <div className="mb-3 flex flex-wrap items-baseline gap-2">
              <h2 className="font-semibold">{sec.title}</h2>
              <span className="text-xs text-hive-muted">({sec.slides})</span>
            </div>
            <div className="space-y-3">
              {sec.lines.map((l, i) => {
                const ok = res ? l.checks.every((h) => Math.abs(h.get(res) - h.expect) < 1e-9) : null;
                return (
                  <div key={i} className="grid gap-2 border-t border-hive-border/50 pt-3 md:grid-cols-[170px_minmax(0,1fr)_150px]">
                    <div className="text-[13px] font-medium">
                      {l.who}
                      {l.derived && (
                        <div className="mt-1">
                          <span className="rounded bg-violet-400/20 px-1.5 py-0.5 text-[10.5px] text-violet-100">back-calculated</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 overflow-x-auto text-[14px]">
                      {l.tex.map((t, k) => (
                        <div key={k} className="math-line">
                          <Tex tex={t} />
                        </div>
                      ))}
                    </div>
                    <div className="text-[12px]">
                      {ok === null ? (
                        <span className="text-hive-muted">not run yet</span>
                      ) : ok ? (
                        <span className="rounded bg-good/10 px-2 py-1 text-emerald-300">✓ tool agrees ({l.checks.length} values)</span>
                      ) : (
                        <span className="rounded bg-bad/10 px-2 py-1 text-red-300">✗ mismatch</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <div className="label mb-3">Random numbers used, in the order the algorithm asks for them</div>
        <div className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {TEXTBOOK_SCRIPT.map((d, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-hive-border/40 py-1">
              <span className="num w-6 text-right text-hive-muted">{i + 1}</span>
              <span className="flex-1">{d.label}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10.5px] ${d.from === "slide" ? "bg-good/10 text-emerald-300" : "bg-violet-400/20 text-violet-100"}`}
              >
                {d.from === "slide" ? "on slide" : "back-calc."}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 text-[13.5px] leading-relaxed text-hive-muted">
        <div className="label mb-2">Also checked by automated tests</div>
        <p>
          The same comparisons run as unit tests (<code className="text-hive-text">npm test</code>, 168 tests). Every slide value,
          every hand-calculated value (to 9 decimal places), and general properties of the algorithm are covered. For example:
          exactly one variable changes per move, the partner is never the bee itself, values stay inside the bounds, there are
          exactly Np onlookers per cycle, a source is abandoned only when t &gt; limit, and the best-so-far never gets worse.
        </p>
      </section>
    </div>
  );
}

function GroupRows({ group, children }: { group: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-hive-panel2/60">
        <td colSpan={6} className="px-4 py-1.5 font-sans text-[12px] font-semibold text-zinc-200">
          {group}
        </td>
      </tr>
      {children}
    </>
  );
}
