"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getProblem, makeCustomProblem } from "@/lib/abc/problems";
import { SeededRandom } from "@/lib/abc/random";
import { TEXTBOOK_CONFIG, textbookRandom } from "@/lib/abc/textbook";
import { fmt } from "@/lib/abc/format";
import type { AbcConfig, Problem, Step } from "@/lib/abc/types";
import { LineChart } from "../charts/LineChart";
import { Controls } from "./Controls";
import { Explanation } from "./Explanation";
import { OnlookerWheel } from "./OnlookerWheel";
import { Pseudocode } from "./Pseudocode";
import { QuizCard } from "./QuizCard";
import { SearchSpace } from "./SearchSpace";
import { StateTable } from "./StateTable";
import { DEFAULT_SETTINGS, TopBar, type Settings } from "./TopBar";
import { useAbcPlayer } from "./useAbcPlayer";

type Tab = "table" | "wheel" | "chart" | "code";
const TABS: { id: Tab; label: string }[] = [
  { id: "table", label: "Flowers table" },
  { id: "wheel", label: "Onlooker wheel" },
  { id: "chart", label: "Progress" },
  { id: "code", label: "Algorithm" },
];

function focusOf(step: Step | undefined): number | null {
  if (!step) return null;
  switch (step.kind) {
    case "candidate":
    case "select":
    case "onlooker-choice":
    case "scout-replace":
      return step.detail.m;
    default:
      return null;
  }
}

export function Simulator() {
  const params = useSearchParams();
  const [s, setS] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    mode: params.get("mode") === "textbook" ? "textbook" : "free",
  }));
  const set = useCallback((patch: Partial<Settings>) => setS((p) => ({ ...p, ...patch })), []);
  const [view, setView] = useState<"table" | "matrix">("table");
  const [tab, setTab] = useState<Tab>("table");
  const [showMath, setShowMath] = useState(false);
  const [logScale, setLogScale] = useState(true);

  const tb = s.mode === "textbook";

  const { problem, customError } = useMemo((): { problem: Problem; customError: string | null } => {
    if (tb) return { problem: TEXTBOOK_CONFIG.problem, customError: null };
    if (s.problemId === "custom") {
      try {
        return { problem: makeCustomProblem(s.customExpr, s.customLb, s.customUb), customError: null };
      } catch (e) {
        return { problem: getProblem("sphere"), customError: (e as Error).message };
      }
    }
    return { problem: getProblem(s.problemId), customError: null };
  }, [tb, s.problemId, s.customExpr, s.customLb, s.customUb]);

  const Np = tb ? 5 : Math.floor(s.colonySize / 2);
  const effectiveLimit = tb ? 1 : s.limitAuto ? Np * problem.lb.length : s.limit;

  const cfg: AbcConfig = useMemo(
    () =>
      tb
        ? TEXTBOOK_CONFIG
        : { problem, colonySize: s.colonySize, limit: effectiveLimit, maxCycles: s.maxCycles, selection: s.selection },
    [tb, problem, s.colonySize, effectiveLimit, s.maxCycles, s.selection],
  );

  const resetKey = JSON.stringify([s.mode, problem.id, s.customExpr, s.customLb, s.customUb, cfg.colonySize, cfg.limit, cfg.maxCycles, cfg.selection, s.seed]);
  const heatKey = JSON.stringify([problem.id, s.customExpr, s.customLb, s.customUb]);
  const makeRng = useCallback(() => (tb ? textbookRandom(s.seed) : new SeededRandom(s.seed)), [tb, s.seed]);
  const quizTypes = useMemo(() => new Set(s.quizTypes), [s.quizTypes]);

  const P = useAbcPlayer(cfg, makeRng, resetKey, s.quizOn, quizTypes);
  const { player, step, prev, steps, idx } = P;

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      // text fields own every key; radios/checkboxes/sliders keep Space and arrows
      if (t.closest('textarea, select, [contenteditable], input[type="text"], input[type="number"], input:not([type])')) return;
      if (t.closest("input") && (e.key === " " || e.key.startsWith("Arrow"))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") {
        e.preventDefault();
        if (P.playing) player.pause();
        else player.play();
      } else if (e.key === "ArrowRight") {
        player.pause();
        player.stepForward();
      } else if (e.key === "ArrowLeft") player.stepBack();
      else if (e.key === "n" || e.key === "N") player.nextPhase();
      else if (e.key === "c" || e.key === "C") player.nextCycle();
      else if (e.key === "e" || e.key === "E") player.toEnd();
      else if (e.key === "r" || e.key === "R") player.reset(cfg, makeRng());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player, P.playing, cfg, makeRng]);

  // onlookers recruited per flower in the current cycle (for the wheel)
  const tally = useMemo(() => {
    const t = new Array(Np).fill(0);
    if (!step) return t;
    for (let i = idx; i >= 0; i--) {
      const st = steps[i];
      if (!st || st.cycle !== step.cycle) break;
      if (st.kind === "candidate" && st.detail.bee === "onlooker") t[st.detail.m]++;
    }
    return t;
  }, [steps, idx, step, Np]);

  const convergence = useMemo(() => (P.run && step ? P.run.convergence.slice(0, step.snap.convergenceLen) : []), [P.run, step]);

  const dur = P.playing ? Math.max(80, Math.min(550, 750 / P.speed)) : 450;
  const optF = problem.optimum?.f;
  const canLog = optF !== undefined || convergence.every((c) => c.bestF > 0);
  const useLog = logScale && canLog;
  const chartPoints = convergence.map((c) => ({ x: c.cycle, y: optF !== undefined ? Math.max(c.bestF - optF, 1e-16) : c.bestF }));
  const feedback = P.lastFeedback && step && P.lastFeedback.stepId === step.id ? P.lastFeedback : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">Artificial Bee Colony, step by step</h1>
        <p className="text-[13px] text-hive-muted">
          Press <b className="text-stone-800">Step</b> for one move at a time, or <b className="text-stone-800">Play</b> to watch.{" "}
          <Link href="/learn" className="text-amber-700 hover:underline">
            New to ABC? Read the primer →
          </Link>
        </p>
      </div>

      <TopBar s={s} set={set} customError={customError} score={P.score} Np={Np} effectiveLimit={effectiveLimit} />

      <Controls
        step={step}
        idx={idx}
        maxCycles={cfg.maxCycles}
        playing={P.playing}
        atEnd={P.atEnd}
        speed={P.speed}
        quizPending={!!P.pending}
        onReset={() => player.reset(cfg, makeRng())}
        onBack={player.stepBack}
        onPlay={player.play}
        onPause={player.pause}
        onStep={() => {
          player.pause();
          player.stepForward();
        }}
        onPhase={player.nextPhase}
        onCycle={player.nextCycle}
        onEnd={player.toEnd}
        onSpeed={player.setSpeed}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <SearchSpace cfg={cfg} heatKey={heatKey} step={step} convergence={convergence} showTrails={s.showTrails} showOptimum={s.showOptimum} dur={dur} />

        <div className="min-w-0 space-y-3">
          {P.pending ? (
            <QuizCard key={P.pending.step.id} quiz={P.pending.quiz} score={P.score} onAnswer={player.answer} onSkip={player.skipQuiz} />
          ) : (
            step && <Explanation step={step} cfg={cfg} textbook={tb} feedback={feedback} showMath={showMath} onToggleMath={() => setShowMath(!showMath)} />
          )}

          <section className="card overflow-hidden">
            <div className="flex border-b border-hive-border bg-hive-panel2/60 px-2 pt-2" role="tablist">
              {TABS.map((t) => {
                const hint = t.id === "wheel" && step?.phase === "onlooker" && tab !== "wheel";
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative rounded-t-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${tab === t.id ? "border border-b-0 border-hive-border bg-white text-stone-900" : "text-hive-muted hover:text-stone-800"}`}
                    data-testid={`tab-${t.id}`}
                  >
                    {t.label}
                    {hint && <span className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-500" title="Onlookers are choosing now" />}
                  </button>
                );
              })}
            </div>
            <div className="p-4">
              {tab === "table" && step && (
                <StateTable snap={step.snap} prev={prev?.snap} stepId={step.id} focusM={focusOf(step)} limit={cfg.limit} view={view} onView={setView} />
              )}
              {tab === "wheel" && step && <OnlookerWheel step={step} prob={step.snap.prob} selection={cfg.selection} tally={tally} dur={dur} />}
              {tab === "chart" && (
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <div className="text-[13px] text-stone-700">
                      {optF !== undefined ? "How far the best answer is from the true minimum" : "Best answer found so far"}
                    </div>
                    {canLog && (
                      <button className="ml-auto text-[12px] text-hive-muted hover:text-stone-800" onClick={() => setLogScale(!logScale)}>
                        {useLog ? "log scale ✓" : "linear scale"}
                      </button>
                    )}
                  </div>
                  <LineChart
                    series={[{ id: "best", label: "best so far", color: "#d97706", points: chartPoints }]}
                    xDomain={[0, cfg.maxCycles]}
                    log={useLog}
                    xLabel="cycle"
                    height={230}
                    yFormat={(v) => fmt(v, 6)}
                  />
                </div>
              )}
              {tab === "code" && <Pseudocode line={P.pending ? P.pending.step.line : (step?.line ?? 0)} selection={cfg.selection} />}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
