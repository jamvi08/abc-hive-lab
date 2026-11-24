"use client";

import { useState } from "react";
import type { Quiz } from "@/lib/abc/quiz";

export function QuizCard({
  quiz,
  score,
  onAnswer,
  onSkip,
}: {
  quiz: Quiz;
  score: { right: number; total: number };
  onAnswer: (a: string | string[] | number) => void;
  onSkip: () => void;
}) {
  const [multi, setMulti] = useState<string[]>([]);
  const [num, setNum] = useState("");
  return (
    <section className="card relative overflow-hidden border-amber-300 p-5 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]" data-testid="quiz">
      <div className="absolute inset-y-0 left-0 w-1 bg-honey" />
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
          🐝 Quiz: what happens next?
        </span>
        <span className="ml-auto text-xs text-hive-muted">
          Score <span className="num text-hive-text">{score.right}</span>/{score.total}
        </span>
      </div>
      <div className="space-y-1.5 text-[14.5px] leading-relaxed text-stone-800">
        {quiz.prompt.map((p, i) => (
          <p key={i} className={i === quiz.prompt.length - 1 ? "pt-1 font-semibold text-stone-900" : "text-stone-700"}>
            {p}
          </p>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quiz.kind === "choice" &&
          quiz.options.map((o) => (
            <button key={o.value} className="btn hover:border-honey" onClick={() => onAnswer(o.value)} data-testid={`quiz-${o.value}`}>
              {o.label}
            </button>
          ))}
        {quiz.kind === "multi" && (
          <>
            {quiz.options.map((o) => {
              const on = multi.includes(o.value);
              return (
                <button
                  key={o.value}
                  className={`btn ${on ? "border-scout bg-rose-50 text-rose-800" : ""}`}
                  onClick={() => setMulti((m) => (on ? m.filter((x) => x !== o.value) : [...m, o.value]))}
                  aria-pressed={on}
                  data-testid={`quiz-opt-${o.value}`}
                >
                  {o.label}
                </button>
              );
            })}
            <button className="btn btn-primary" onClick={() => onAnswer(multi)} data-testid="quiz-submit">
              Submit {multi.length === 0 ? "(none)" : ""}
            </button>
          </>
        )}
        {quiz.kind === "numeric" && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = parseFloat(num.replace("−", "-"));
              if (Number.isFinite(v)) onAnswer(v);
            }}
          >
            <input
              autoFocus
              value={num}
              onChange={(e) => setNum(e.target.value)}
              placeholder="v = ?"
              className="num w-32 rounded-lg border border-hive-border bg-hive-bg px-3 py-1.5 text-sm outline-none focus:border-honey"
              data-testid="quiz-number"
            />
            <button className="btn btn-primary" type="submit">
              Check
            </button>
          </form>
        )}
        <button className="ml-auto text-xs text-hive-muted underline-offset-2 hover:underline" onClick={onSkip}>
          skip question
        </button>
      </div>
    </section>
  );
}
