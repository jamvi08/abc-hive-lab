"use client";

import { explain, summarize, textbookNote } from "@/lib/abc/explain";
import type { AbcConfig, Phase, Step } from "@/lib/abc/types";
import { Rich, Tex } from "../Tex";

export const PHASE_META: Record<Phase, { label: string; short: string; soft: string; ink: string }> = {
  init: { label: "Start", short: "Start", soft: "#ede9fe", ink: "#6d28d9" },
  employed: { label: "Employed bees", short: "Employed", soft: "#fef3c7", ink: "#b45309" },
  onlooker: { label: "Onlooker bees", short: "Onlooker", soft: "#e0f2fe", ink: "#0369a1" },
  scout: { label: "Scout bees", short: "Scout", soft: "#ffe4e6", ink: "#be123c" },
  memorize: { label: "Remember best", short: "Best", soft: "#fef9c3", ink: "#a16207" },
  done: { label: "Finished", short: "Done", soft: "#d1fae5", ink: "#047857" },
};

export function Explanation({
  step,
  cfg,
  textbook,
  feedback,
  showMath,
  onToggleMath,
}: {
  step: Step;
  cfg: AbcConfig;
  textbook: boolean;
  feedback: { correct: boolean; why: string } | null;
  showMath: boolean;
  onToggleMath: () => void;
}) {
  const sum = summarize(step, cfg);
  const note = textbook ? textbookNote(step) : null;
  const meta = PHASE_META[step.phase];
  const detail = showMath ? explain(step, cfg) : null;

  return (
    <section className="card p-5" aria-live="polite" data-testid="explanation">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold" style={{ background: meta.soft, color: meta.ink }}>
          {meta.label}
        </span>
        {step.cycle > 0 && step.kind !== "done" && <span className="text-xs text-hive-muted">cycle {step.cycle}</span>}
      </div>
      <h2 className="text-[19px] font-semibold leading-snug text-stone-900">{sum.title}</h2>

      {feedback && (
        <div className={`mt-3 rounded-lg border px-3 py-2 text-[13.5px] ${feedback.correct ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          <strong>{feedback.correct ? "✓ Correct!" : "✗ Not quite."}</strong> {feedback.why}
        </div>
      )}

      <div className="mt-2 space-y-1.5 text-[15px] leading-relaxed text-stone-700">
        {sum.short.map((t, i) => (
          <p key={i}>
            <Rich text={t} />
          </p>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button className="text-[13px] font-medium text-amber-700 hover:underline" onClick={onToggleMath} aria-expanded={showMath} data-testid="show-math">
          {showMath ? "Hide the math ▴" : "Show the math ▾"}
        </button>
        {note && (
          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[12px] text-violet-800">
            📖 slide {note.slide}
            {note.derived ? " · back-calculated numbers" : " · same numbers"}
          </span>
        )}
        {step.offScript && textbook && <span className="text-[12px] text-hive-muted">past the slides: random numbers from the seed</span>}
      </div>

      {detail && (
        <div className="mt-3 space-y-3 border-t border-hive-border pt-3">
          {detail.math.length > 0 && (
            <div className="space-y-1 overflow-x-auto rounded-lg bg-hive-panel2 px-4 py-3">
              {detail.math.map((m, i) => (
                <div key={i} className="math-line">
                  <Tex tex={m} />
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1.5 text-[13.5px] leading-relaxed text-stone-600">
            {detail.body.map((b, i) => (
              <p key={i}>
                <Rich text={b} />
              </p>
            ))}
          </div>
          {note && <p className="rounded-lg bg-violet-50 px-3 py-2 text-[13px] text-violet-900">📖 {note.text}</p>}
        </div>
      )}
    </section>
  );
}
