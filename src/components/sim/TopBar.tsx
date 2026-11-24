"use client";

import { useState } from "react";
import { PROBLEMS } from "@/lib/abc/problems";
import { QUIZ_TYPES, type QuizType } from "@/lib/abc/quiz";
import type { Selection } from "@/lib/abc/types";

export interface Settings {
  mode: "free" | "textbook";
  problemId: string;
  customExpr: string;
  customLb: [number, number];
  customUb: [number, number];
  colonySize: number;
  limit: number;
  limitAuto: boolean;
  maxCycles: number;
  selection: Selection;
  seed: number;
  quizOn: boolean;
  quizTypes: QuizType[];
  showTrails: boolean;
  showOptimum: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: "free",
  problemId: "sphere",
  customExpr: "(x1 - 1)^2 + (x2 + 2)^2 + 3*sin(x1*x2)",
  customLb: [-5, -5],
  customUb: [5, 5],
  colonySize: 20,
  limit: 20,
  limitAuto: true,
  maxCycles: 50,
  selection: "sweep",
  seed: 42,
  quizOn: false,
  quizTypes: ["select", "onlooker", "scout"],
  showTrails: false,
  showOptimum: true,
};

const input =
  "num rounded-lg border border-hive-border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-honey disabled:opacity-50";

function Switch({ on, onChange, label, testid }: { on: boolean; onChange: (v: boolean) => void; label: string; testid?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center gap-2 text-[13px]" data-testid={testid}>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-honey" : "bg-stone-300"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      <span className="text-stone-700">{label}</span>
    </button>
  );
}

export function TopBar({
  s,
  set,
  customError,
  score,
  Np,
  effectiveLimit,
}: {
  s: Settings;
  set: (patch: Partial<Settings>) => void;
  customError: string | null;
  score: { right: number; total: number };
  Np: number;
  effectiveLimit: number;
}) {
  const [more, setMore] = useState(false);
  const [draft, setDraft] = useState({ expr: s.customExpr, lb: s.customLb, ub: s.customUb });
  const tb = s.mode === "textbook";

  return (
    <section className="card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* mode */}
        <div className="flex rounded-lg border border-hive-border bg-hive-panel2 p-0.5 text-[13px]">
          {(
            [
              ["free", "Free run"],
              ["textbook", "Slide example"],
            ] as const
          ).map(([m, l]) => (
            <button
              key={m}
              onClick={() => set({ mode: m })}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${s.mode === m ? "bg-white text-stone-900 shadow-sm" : "text-hive-muted hover:text-stone-800"}`}
              data-testid={`mode-${m}`}
            >
              {l}
            </button>
          ))}
        </div>

        {tb ? (
          <p className="text-[13.5px] text-stone-600">
            Same numbers as the solved example on <strong className="text-stone-900">slides 14–19</strong>: f = x₁² + x₂², S = 10 (5 flowers), limit = 1, T = 10.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-[13px] text-stone-600">
              Problem
              <select value={s.problemId} onChange={(e) => set({ problemId: e.target.value })} className={`${input} w-44`} data-testid="problem">
                {PROBLEMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="custom">Your own function…</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px] text-stone-600" title="Colony size S. Half are employed bees (one per flower), half are onlookers.">
              Bees <span className="num w-6 font-semibold text-stone-900">{s.colonySize}</span>
              <input type="range" min={4} max={40} step={2} value={s.colonySize} onChange={(e) => set({ colonySize: +e.target.value })} className="w-20" data-testid="colony" />
              <span className="text-[12px] text-hive-muted">= {Np} flowers</span>
            </label>
            <label className="flex items-center gap-2 text-[13px] text-stone-600" title="A flower is abandoned when it fails to improve more than limit times in a row.">
              limit
              <input
                type="number"
                min={0}
                max={500}
                value={effectiveLimit}
                onChange={(e) => set({ limit: Math.max(0, +e.target.value), limitAuto: false })}
                className={`${input} w-16`}
                data-testid="limit"
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-stone-600" title="Maximum number of cycles (MCN)">
              Cycles <span className="num w-7 font-semibold text-stone-900">{s.maxCycles}</span>
              <input type="range" min={1} max={200} value={s.maxCycles} onChange={(e) => set({ maxCycles: +e.target.value })} className="w-20" data-testid="cycles" />
            </label>
          </>
        )}

        <div className="ml-auto flex items-center gap-4">
          <Switch on={s.quizOn} onChange={(v) => set({ quizOn: v })} label="Quiz me" testid="quiz-toggle" />
          {s.quizOn && (
            <span className="num rounded-full bg-amber-100 px-2 py-0.5 text-[12px] font-medium text-amber-800" data-testid="score">
              {score.right}/{score.total} correct
            </span>
          )}
          <button className="text-[13px] font-medium text-stone-600 hover:text-stone-900" onClick={() => setMore(!more)} aria-expanded={more} data-testid="more-options">
            {more ? "Fewer options ▴" : "More options ▾"}
          </button>
        </div>
      </div>

      {!tb && s.problemId === "custom" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hive-border pt-3 text-[13px]">
          <span className="text-stone-600">f(x) =</span>
          <input value={draft.expr} onChange={(e) => setDraft({ ...draft, expr: e.target.value })} className={`${input} w-80 font-mono`} placeholder="e.g. x1^2 + 2*x2^2" data-testid="custom-expr" />
          {([0, 1] as const).map((i) => (
            <span key={i} className="flex items-center gap-1 text-stone-600">
              x{i + 1} ∈ [
              <input type="number" value={draft.lb[i]} onChange={(e) => { const v = [...draft.lb] as [number, number]; v[i] = +e.target.value; setDraft({ ...draft, lb: v }); }} className={`${input} w-16`} />,
              <input type="number" value={draft.ub[i]} onChange={(e) => { const v = [...draft.ub] as [number, number]; v[i] = +e.target.value; setDraft({ ...draft, ub: v }); }} className={`${input} w-16`} />]
            </span>
          ))}
          <button className="btn btn-primary" onClick={() => set({ customExpr: draft.expr, customLb: draft.lb, customUb: draft.ub })} data-testid="custom-apply">
            Use it
          </button>
          {customError ? <span className="text-red-700">⚠ {customError}</span> : <span className="text-[12px] text-hive-muted">use x1, x2, + − * / ^, sin, cos, exp, sqrt, abs…</span>}
        </div>
      )}

      {more && (
        <div className="mt-3 grid gap-x-8 gap-y-3 border-t border-hive-border pt-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <div className="label">How onlookers choose</div>
            {(
              [
                ["sweep", "r < p, flower by flower (slides)"],
                ["roulette", "Roulette wheel"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className={`flex items-center gap-2 ${tb ? "opacity-50" : "cursor-pointer"}`}>
                <input type="radio" name="sel" checked={(tb ? "sweep" : s.selection) === v} disabled={tb} onChange={() => set({ selection: v })} className="accent-amber-500" data-testid={`sel-${v}`} />
                <span className="text-stone-700">{l}</span>
              </label>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="label">Random seed</div>
            <div className="flex gap-2">
              <input type="number" value={s.seed} onChange={(e) => set({ seed: +e.target.value || 0 })} className={`${input} w-24`} data-testid="seed" />
              <button className="btn" onClick={() => set({ seed: Math.floor(Math.random() * 100000) })} title="New random seed">
                🎲
              </button>
            </div>
            {!tb && !s.limitAuto && (
              <button className="text-[12px] text-amber-700 hover:underline" onClick={() => set({ limitAuto: true })}>
                reset limit to Np × D (slide 14)
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div className="label">Map</div>
            <Switch on={s.showTrails} onChange={(v) => set({ showTrails: v })} label="Show trails" testid="trails" />
            <Switch on={s.showOptimum} onChange={(v) => set({ showOptimum: v })} label="Mark the true minimum" />
          </div>
          <div className="space-y-1">
            <div className="label">Quiz questions</div>
            {QUIZ_TYPES.map((q) => (
              <label key={q.id} className="flex cursor-pointer items-center gap-2 text-stone-700">
                <input
                  type="checkbox"
                  className="accent-amber-500"
                  checked={s.quizTypes.includes(q.id)}
                  onChange={(e) => set({ quizTypes: e.target.checked ? [...s.quizTypes, q.id] : s.quizTypes.filter((x) => x !== q.id) })}
                  data-testid={`quiztype-${q.id}`}
                />
                {q.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
