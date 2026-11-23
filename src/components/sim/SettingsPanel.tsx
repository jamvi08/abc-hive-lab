"use client";

import { useState } from "react";
import { PROBLEMS } from "@/lib/abc/problems";
import { QUIZ_TYPES, type QuizType } from "@/lib/abc/quiz";
import type { Problem, Selection } from "@/lib/abc/types";
import { Tex } from "../Tex";

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

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-zinc-200">{label}</span>
        {hint && <span className="text-[11px] text-hive-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, label, testid }: { on: boolean; onChange: (v: boolean) => void; label: string; testid?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-lg py-1 text-left text-[13px]"
      data-testid={testid}
    >
      <span className="text-zinc-200">{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-honey" : "bg-hive-border"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

const inputCls =
  "num w-full rounded-lg border border-hive-border bg-hive-bg px-2.5 py-1.5 text-sm outline-none focus:border-honey disabled:opacity-50";

export function SettingsPanel({
  s,
  set,
  problem,
  customError,
  score,
  Np,
  effectiveLimit,
}: {
  s: Settings;
  set: (patch: Partial<Settings>) => void;
  problem: Problem;
  customError: string | null;
  score: { right: number; total: number };
  Np: number;
  effectiveLimit: number;
}) {
  const [draft, setDraft] = useState({ expr: s.customExpr, lb: s.customLb, ub: s.customUb });
  const tb = s.mode === "textbook";
  return (
    <aside className="space-y-4">
      <section className="card space-y-3 p-4">
        <div className="label">Mode</div>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-hive-border p-1 text-[13px]">
          {(
            [
              ["free", "Free run"],
              ["textbook", "Textbook example"],
            ] as const
          ).map(([m, l]) => (
            <button
              key={m}
              onClick={() => set({ mode: m })}
              className={`rounded-md px-2 py-1.5 font-medium ${s.mode === m ? "bg-honey text-[#1a1206]" : "text-hive-muted hover:text-hive-text"}`}
              data-testid={`mode-${m}`}
            >
              {l}
            </button>
          ))}
        </div>
        {tb && (
          <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-[12.5px] leading-relaxed text-violet-100">
            Replays the <strong>solved example from the slides</strong> (slides 14–19) with the same initial population and
            random numbers. Every step shows what the slide says.
          </p>
        )}
      </section>

      <section className="card space-y-3 p-4">
        <div className="label">Problem</div>
        <select
          value={tb ? "sphere" : s.problemId}
          disabled={tb}
          onChange={(e) => set({ problemId: e.target.value })}
          className={inputCls}
          data-testid="problem"
        >
          {PROBLEMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="custom">✏️ Custom function…</option>
        </select>
        <div className="overflow-x-auto rounded-lg bg-hive-bg/60 px-3 py-2 text-[13px]">
          <Tex tex={problem.tex} />
        </div>
        <p className="text-[12.5px] leading-relaxed text-hive-muted">
          {problem.blurb} Bounds: x₁ ∈ [{problem.lb[0]}, {problem.ub[0]}], x₂ ∈ [{problem.lb[1]}, {problem.ub[1]}].
        </p>
        {!tb && s.problemId === "custom" && (
          <div className="space-y-2 rounded-lg border border-hive-border p-3">
            <input
              value={draft.expr}
              onChange={(e) => setDraft({ ...draft, expr: e.target.value })}
              className={`${inputCls} font-mono`}
              placeholder="e.g. x1^2 + 2*x2^2"
              data-testid="custom-expr"
            />
            <div className="grid grid-cols-4 gap-1.5 text-[11px] text-hive-muted">
              {(["lb", "ub"] as const).flatMap((b) =>
                [0, 1].map((i) => (
                  <label key={`${b}${i}`} className="space-y-0.5">
                    <span>
                      {b === "lb" ? "min" : "max"} x{i + 1}
                    </span>
                    <input
                      type="number"
                      value={draft[b][i]}
                      onChange={(e) => {
                        const v = [...draft[b]] as [number, number];
                        v[i] = +e.target.value;
                        setDraft({ ...draft, [b]: v });
                      }}
                      className={inputCls}
                    />
                  </label>
                )),
              )}
            </div>
            <button
              className="btn btn-primary w-full justify-center"
              onClick={() => set({ customExpr: draft.expr, customLb: draft.lb, customUb: draft.ub })}
              data-testid="custom-apply"
            >
              Use this function
            </button>
            {customError ? (
              <p className="text-[12px] text-red-300">⚠ {customError}</p>
            ) : (
              <p className="text-[11px] text-hive-muted">Use x1, x2, + − * / ^, sin, cos, exp, sqrt, abs, log, pi…</p>
            )}
          </div>
        )}
      </section>

      <section className="card space-y-4 p-4">
        <div className="label">Parameters</div>
        <Field label="Colony size S" hint={`Np = S/2 = ${Np} food sources`}>
          <input
            type="range"
            min={4}
            max={40}
            step={2}
            value={tb ? 10 : s.colonySize}
            disabled={tb}
            onChange={(e) => set({ colonySize: +e.target.value })}
            className="w-full"
            data-testid="colony"
          />
          <div className="num flex justify-between text-[11px] text-hive-muted">
            <span>S = {tb ? 10 : s.colonySize}</span>
            <span>
              {Np} employed + {Np} onlookers
            </span>
          </div>
        </Field>

        <Field label="limit (abandonment)" hint={s.limitAuto && !tb ? "auto = Np × D" : undefined}>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={500}
              value={effectiveLimit}
              disabled={tb || s.limitAuto}
              onChange={(e) => set({ limit: Math.max(0, +e.target.value) })}
              className={inputCls}
              data-testid="limit"
            />
            <button
              className={`btn shrink-0 ${s.limitAuto && !tb ? "border-honey text-honey" : ""}`}
              disabled={tb}
              onClick={() => set({ limitAuto: !s.limitAuto, limit: effectiveLimit })}
              title="Ideally limit = Np × #decision variables (slide 14)"
              data-testid="limit-auto"
            >
              auto
            </button>
          </div>
          <p className="text-[11px] text-hive-muted">A source is abandoned when its trial counter t &gt; limit.</p>
        </Field>

        <Field label="Max cycles T (MCN)">
          <input
            type="range"
            min={1}
            max={200}
            value={tb ? 10 : s.maxCycles}
            disabled={tb}
            onChange={(e) => set({ maxCycles: +e.target.value })}
            className="w-full"
            data-testid="cycles"
          />
          <div className="num text-[11px] text-hive-muted">T = {tb ? 10 : s.maxCycles}</div>
        </Field>

        <Field label="Onlooker selection">
          <div className="space-y-1 text-[13px]">
            {(
              [
                ["sweep", "r < pₘ, source by source (as on the slides)"],
                ["roulette", "Roulette wheel, pₘ / Σp"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className={`flex items-start gap-2 ${tb ? "opacity-50" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="sel"
                  checked={(tb ? "sweep" : s.selection) === v}
                  disabled={tb}
                  onChange={() => set({ selection: v })}
                  className="mt-1 accent-amber-400"
                  data-testid={`sel-${v}`}
                />
                <span className="text-zinc-300">{l}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Random seed" hint={tb ? "used after the slides end" : "same seed, same run"}>
          <div className="flex gap-2">
            <input type="number" value={s.seed} onChange={(e) => set({ seed: +e.target.value || 0 })} className={inputCls} data-testid="seed" />
            <button className="btn shrink-0" onClick={() => set({ seed: Math.floor(Math.random() * 100000) })} title="New random seed">
              🎲
            </button>
          </div>
        </Field>
      </section>

      <section className="card space-y-2 p-4">
        <div className="flex items-center justify-between">
          <div className="label">Quiz mode</div>
          {s.quizOn && (
            <span className="num rounded-full bg-honey/15 px-2 py-0.5 text-[11px] text-honey" data-testid="score">
              {score.right}/{score.total} correct
            </span>
          )}
        </div>
        <Toggle on={s.quizOn} onChange={(v) => set({ quizOn: v })} label="Predict before each decision" testid="quiz-toggle" />
        {s.quizOn && (
          <div className="space-y-1 pt-1">
            {QUIZ_TYPES.map((q) => (
              <label key={q.id} className="flex cursor-pointer items-center gap-2 text-[12.5px] text-zinc-300">
                <input
                  type="checkbox"
                  className="accent-amber-400"
                  checked={s.quizTypes.includes(q.id)}
                  onChange={(e) =>
                    set({ quizTypes: e.target.checked ? [...s.quizTypes, q.id] : s.quizTypes.filter((x) => x !== q.id) })
                  }
                  data-testid={`quiztype-${q.id}`}
                />
                {q.label}
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="card space-y-1 p-4">
        <div className="label mb-1">Display</div>
        <Toggle on={s.showTrails} onChange={(v) => set({ showTrails: v })} label="Show trails (where sources have been)" testid="trails" />
        <Toggle on={s.showOptimum} onChange={(v) => set({ showOptimum: v })} label="Mark the true minimum" />
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-hive-muted">
        Keyboard: <kbd>Space</kbd> play/pause · <kbd>→</kbd> step · <kbd>←</kbd> back · <kbd>N</kbd> next phase ·{" "}
        <kbd>C</kbd> next cycle · <kbd>R</kbd> reset
      </p>
    </aside>
  );
}
