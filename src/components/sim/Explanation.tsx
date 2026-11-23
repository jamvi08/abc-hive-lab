"use client";

import { explain, textbookNote } from "@/lib/abc/explain";
import type { AbcConfig, Phase, Step } from "@/lib/abc/types";
import { Rich, Tex } from "../Tex";

export const PHASE_META: Record<Phase, { label: string; color: string }> = {
  init: { label: "Initialization", color: "#a78bfa" },
  employed: { label: "Employed bees", color: "#f59e0b" },
  onlooker: { label: "Onlooker bees", color: "#38bdf8" },
  scout: { label: "Scout bees", color: "#fb7185" },
  memorize: { label: "Memorize best", color: "#fde047" },
  done: { label: "Finished", color: "#34d399" },
};

export function Explanation({
  step,
  cfg,
  textbook,
  feedback,
}: {
  step: Step;
  cfg: AbcConfig;
  textbook: boolean;
  feedback: { correct: boolean; why: string } | null;
}) {
  const e = explain(step, cfg);
  const note = textbook ? textbookNote(step) : null;
  const meta = PHASE_META[step.phase];
  return (
    <section className="card relative overflow-hidden p-5" aria-live="polite">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: meta.color }} />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
        {step.cycle > 0 && step.kind !== "done" && <span className="text-xs text-hive-muted">Cycle {step.cycle}</span>}
        {step.offScript && textbook && (
          <span className="rounded-full bg-hive-panel2 px-2 py-0.5 text-[11px] text-hive-muted">beyond the slides · seeded random</span>
        )}
      </div>
      <h2 className="mb-3 text-lg font-semibold leading-snug">{e.title}</h2>

      {feedback && (
        <div
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            feedback.correct ? "border-good/40 bg-good/10 text-emerald-200" : "border-bad/40 bg-bad/10 text-red-200"
          }`}
        >
          <strong>{feedback.correct ? "✓ Correct prediction!" : "✗ Not quite."}</strong> {feedback.why}
        </div>
      )}

      <div className="space-y-2 text-[14.5px] leading-relaxed text-zinc-300">
        {e.body.map((b, i) => (
          <p key={i}>
            <Rich text={b} />
          </p>
        ))}
      </div>

      {e.math.length > 0 && (
        <div className="mt-4 space-y-1.5 overflow-x-auto rounded-lg border border-hive-border bg-hive-bg/60 px-4 py-3">
          {e.math.map((m, i) => (
            <div key={i} className="math-line">
              <Tex tex={m} />
            </div>
          ))}
        </div>
      )}

      {e.verdict && (
        <div
          className={`mt-3 inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[13px] font-medium ${
            e.verdict.tone === "good"
              ? "bg-good/10 text-emerald-300"
              : e.verdict.tone === "bad"
                ? "bg-bad/10 text-red-300"
                : "bg-hive-panel2 text-hive-muted"
          }`}
        >
          {e.verdict.tone === "good" ? "▲" : e.verdict.tone === "bad" ? "▼" : "●"} {e.verdict.text}
        </div>
      )}

      {note && (
        <div className="mt-4 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-[13px] text-violet-100">
          <span className="font-semibold">📖 Slide {note.slide}</span>
          {note.derived && (
            <span className="ml-2 rounded bg-violet-400/20 px-1.5 py-0.5 text-[11px]">back-calculated random numbers</span>
          )}
          <div className="mt-1 text-violet-200/90">{note.text}</div>
        </div>
      )}
    </section>
  );
}
