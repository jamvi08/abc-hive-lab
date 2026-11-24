"use client";

import Link from "next/link";
import { useState } from "react";
import { fmt } from "@/lib/abc/format";
import { HAND_CALC } from "@/lib/abc/handcalc";
import { judge, runTextbookCycle1, SLIDE_CHECKS, TEXTBOOK_SCRIPT, type CheckStatus, type TextbookResult } from "@/lib/abc/textbook";
import { Tex } from "../Tex";

const STATUS: Record<CheckStatus, { icon: string; label: string; cls: string }> = {
  match: { icon: "✓", label: "same", cls: "bg-emerald-50 text-emerald-700" },
  rounding: { icon: "≈", label: "rounding", cls: "bg-amber-50 text-amber-800" },
  differs: { icon: "!", label: "slide slip", cls: "bg-rose-50 text-rose-700" },
};

function Fold({ title, right, children, testid }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; testid?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-hive-panel2/60" onClick={() => setOpen(!open)} aria-expanded={open} data-testid={testid}>
        <span className="text-hive-muted">{open ? "▾" : "▸"}</span>
        <span className="font-medium text-stone-900">{title}</span>
        <span className="ml-auto">{right}</span>
      </button>
      {open && <div className="border-t border-hive-border px-5 py-4">{children}</div>}
    </div>
  );
}

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
  const errata = SLIDE_CHECKS.filter((c) => c.id === "After Employed Phase-p-2" || c.id === "s-x2" || c.id === "s-x12");

  return (
    <div className="mx-auto max-w-[1000px] space-y-4 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Does the tool match the slides?</h1>
        <p className="max-w-3xl text-[15px] leading-relaxed text-stone-600">
          The slides solve one example by hand (slides 14–19): minimize f = x₁² + x₂² with 5 flowers and limit = 1. This page runs the same
          example in the tool, with the same starting flowers and random numbers, and checks every number.
        </p>
      </header>

      <section className="card flex flex-wrap items-center gap-4 p-5">
        <button className="btn btn-primary px-4 py-2 text-[14px]" onClick={() => setRes(runTextbookCycle1())} data-testid="run-check">
          {res ? "Check again" : "▶ Run the check"}
        </button>
        {res ? (
          <div className="flex flex-wrap gap-2 text-[14px]" data-testid="verify-summary">
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-800">
              ✓ <strong>{handOk}/{handChecks.length}</strong> hand-calculated values match
            </span>
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-800">
              ✓ <strong>{count("match") + count("rounding")}/{rows.length}</strong> slide values match
            </span>
            <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-rose-700">
              <strong>{count("differs")}</strong> small slips found on the slides
            </span>
          </div>
        ) : (
          <p className="text-sm text-hive-muted">It takes less than a second.</p>
        )}
        <Link href="/?mode=textbook" className="ml-auto text-[13px] font-medium text-amber-700 hover:underline">
          Watch it step by step →
        </Link>
      </section>

      {res && (
        <section className="card border-rose-200 p-5">
          <h2 className="mb-1 font-semibold text-stone-900">3 small slips on the slides (none of them changes the result)</h2>
          <ul className="mt-2 space-y-2 text-[14px] text-stone-700">
            {errata.map((c) => (
              <li key={c.id} className="flex gap-3">
                <span className="mt-0.5 shrink-0 rounded bg-rose-50 px-1.5 text-[12px] font-medium text-rose-700">slide {c.slide}</span>
                <span>{c.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Fold
        title="Every slide value, side by side"
        right={res ? <span className="text-[13px] text-emerald-700">✓ {count("match") + count("rounding")} of {rows.length} match</span> : <span className="text-[13px] text-hive-muted">{rows.length} values</span>}
        testid="fold-table"
      >
        <div className="overflow-x-auto">
          <table className="num w-full text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-hive-muted">
              <tr>
                <th className="py-2 pr-2 text-left">slide</th>
                <th className="px-2 py-2 text-left">value</th>
                <th className="px-2 py-2 text-right">slide says</th>
                <th className="px-2 py-2 text-right">tool says</th>
                <th className="px-2 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows key={g} group={g}>
                  {rows
                    .filter((r) => r.c.group === g)
                    .map(({ c, tool, status }) => (
                      <tr key={c.id} className="border-t border-hive-border/60 align-top" title={c.note}>
                        <td className="py-1.5 pr-2 text-hive-muted">{c.slide}</td>
                        <td className="px-2 py-1.5">{c.label}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(c.slideValue, 3)}</td>
                        <td className="px-2 py-1.5 text-right">{tool === null ? <span className="text-hive-muted">?</span> : fmt(tool, 4)}</td>
                        <td className="px-2 py-1.5">
                          {status && (
                            <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11.5px] ${STATUS[status].cls}`}>
                              {STATUS[status].icon} {STATUS[status].label}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </GroupRows>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-hive-muted">Hover a row with ≈ or ! to see why. ≈ means the slide rounded or truncated the number.</p>
        </div>
      </Fold>

      {HAND_CALC.map((sec, si) => {
        const ok = res ? sec.lines.every((l) => l.checks.every((h) => Math.abs(h.get(res) - h.expect) < 1e-9)) : null;
        return (
          <Fold
            key={sec.title}
            title={
              <>
                Hand calculation · {sec.title.split(":")[0]} <span className="text-[12px] font-normal text-hive-muted">({sec.slides})</span>
              </>
            }
            right={ok === null ? null : ok ? <span className="text-[13px] text-emerald-700">✓ tool agrees</span> : <span className="text-[13px] text-red-700">✗ mismatch</span>}
            testid={`fold-hand-${si}`}
          >
            <div className="space-y-3">
              {sec.lines.map((l, i) => (
                <div key={i} className="grid gap-2 border-t border-hive-border/50 pt-3 first:border-0 first:pt-0 md:grid-cols-[150px_minmax(0,1fr)]">
                  <div className="text-[13px] font-medium text-stone-800">
                    {l.who}
                    {l.derived && <div className="mt-1 text-[11px] font-normal text-violet-700">back-calculated numbers</div>}
                  </div>
                  <div className="space-y-1 overflow-x-auto text-[14px]">
                    {l.tex.map((t, k) => (
                      <div key={k} className="math-line">
                        <Tex tex={t} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Fold>
        );
      })}

      <Fold title="Which random numbers were used?" right={<span className="text-[13px] text-hive-muted">{TEXTBOOK_SCRIPT.length} numbers</span>}>
        <p className="mb-3 text-[13px] text-stone-600">
          The slides print the random numbers only for flower 1 and the scout. For the other bees we worked the numbers out backwards from the
          slides&apos; matrices, so the results match exactly.
        </p>
        <div className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
          {TEXTBOOK_SCRIPT.map((d, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-hive-border/50 py-1">
              <span className="flex-1 text-stone-700">{d.label}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10.5px] ${d.from === "slide" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>
                {d.from === "slide" ? "on slide" : "worked out"}
              </span>
            </div>
          ))}
        </div>
      </Fold>

      <p className="px-1 text-[13px] text-hive-muted">
        The same checks also run automatically as 168 unit tests (<code className="text-stone-800">npm test</code>) every time the site is deployed.
      </p>
    </div>
  );
}

function GroupRows({ group, children }: { group: string; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={5} className="pb-1 pt-3 font-sans text-[12px] font-semibold text-stone-800">
          {group}
        </td>
      </tr>
      {children}
    </>
  );
}
