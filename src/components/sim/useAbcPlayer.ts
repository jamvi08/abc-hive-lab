"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AbcRun } from "@/lib/abc/engine";
import { checkAnswer, quizFor, type Quiz, type QuizType } from "@/lib/abc/quiz";
import type { RandomSource } from "@/lib/abc/random";
import type { AbcConfig, Step } from "@/lib/abc/types";

const MAX_HISTORY = 8000;
const TRIM = 2000;

export interface QuizRecord {
  correct: boolean | null; // null = skipped
  given?: string | string[] | number;
}

export interface Pending {
  step: Step;
  quiz: Quiz;
}

export interface PlayerState {
  steps: Step[];
  idx: number;
  step: Step | undefined;
  prev: Step | undefined;
  atEnd: boolean;
  playing: boolean;
  speed: number;
  pending: Pending | null;
  answers: Map<number, QuizRecord>;
  lastFeedback: { stepId: number; correct: boolean; why: string } | null;
  score: { right: number; total: number };
  run: AbcRun | null;
}

/**
 * Imperative player around the ABC step generator: history (for stepping
 * back), autoplay timer, jumps and quiz gating. Exposed to React through
 * useSyncExternalStore.
 */
export class Player {
  private listeners = new Set<() => void>();
  private run: AbcRun | null = null;
  private gen: Generator<Step> | null = null;
  private steps: Step[] = [];
  private finished = false;
  private idx = 0;
  private playing = false;
  private speed = 2;
  private pending: Pending | null = null;
  private answers = new Map<number, QuizRecord>();
  private lastFeedback: PlayerState["lastFeedback"] = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private resumeAfterQuiz = false;
  private quizOn = false;
  private quizTypes = new Set<QuizType>();
  private state: PlayerState = this.build();

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.state;

  private build(): PlayerState {
    const steps = this.steps;
    const idx = Math.min(this.idx, Math.max(0, steps.length - 1));
    let right = 0,
      total = 0;
    this.answers.forEach((a) => {
      if (a.correct === null) return;
      total++;
      if (a.correct) right++;
    });
    return {
      steps,
      idx,
      step: steps[idx],
      prev: idx > 0 ? steps[idx - 1] : undefined,
      atEnd: this.finished && idx >= steps.length - 1,
      playing: this.playing,
      speed: this.speed,
      pending: this.pending,
      answers: this.answers,
      lastFeedback: this.lastFeedback,
      score: { right, total },
      run: this.run,
    };
  }

  private emit() {
    this.state = this.build();
    this.listeners.forEach((l) => l());
  }

  setQuiz(on: boolean, types: Set<QuizType>) {
    this.quizOn = on;
    this.quizTypes = types;
    if (!on && this.pending) {
      this.pending = null;
    }
    this.emit();
  }

  reset(cfg: AbcConfig, rng: RandomSource) {
    this.stopTimer();
    this.run = new AbcRun(cfg, rng);
    this.gen = this.run.steps();
    this.finished = false;
    const first = this.gen.next();
    this.steps = first.done ? [] : [first.value];
    this.idx = 0;
    this.playing = false;
    this.pending = null;
    this.answers = new Map();
    this.lastFeedback = null;
    this.emit();
  }

  /** make sure step i exists; returns false if it does not (end of run) */
  private ensure(i: number): boolean {
    while (this.steps.length <= i && !this.finished) {
      const r = this.gen?.next();
      if (!r || r.done) {
        this.finished = true;
        break;
      }
      this.steps.push(r.value);
    }
    if (this.steps.length > MAX_HISTORY) {
      this.steps = this.steps.slice(TRIM);
      this.idx = Math.max(0, this.idx - TRIM);
      return this.ensure(i - TRIM);
    }
    return i < this.steps.length;
  }

  private quizFor(s: Step) {
    return this.quizOn ? quizFor(s, this.quizTypes) : null;
  }

  /** Advance until stop(step) or max steps. Returns false at the end or at a quiz. */
  private advance(stop: (s: Step) => boolean, max = Infinity, skipQuiz = false): boolean {
    if (this.pending) return false;
    let moved = 0;
    let ok = true;
    while (moved < max) {
      if (!this.ensure(this.idx + 1)) {
        ok = false;
        break;
      }
      const next = this.steps[this.idx + 1];
      const q = skipQuiz ? null : this.quizFor(next);
      if (q && !this.answers.has(next.id)) {
        this.pending = { step: next, quiz: q };
        ok = false;
        break;
      }
      this.idx++;
      moved++;
      if (stop(next)) break;
    }
    this.emit();
    return ok;
  }

  stepForward = () => this.advance(() => true, 1);

  stepBack = () => {
    this.pause();
    this.pending = null;
    this.idx = Math.max(0, this.idx - 1);
    this.emit();
  };

  nextPhase = () => {
    const cur = this.steps[this.idx];
    if (!cur) return;
    this.advance((s) => s.phase !== cur.phase || s.cycle !== cur.cycle);
  };

  nextCycle = () => {
    this.advance((s) => s.kind === "memorize" || s.kind === "done");
  };

  toEnd = () => {
    this.pause();
    this.advance((s) => s.kind === "done", Infinity, true);
  };

  answer = (given: string | string[] | number) => {
    const p = this.pending;
    if (!p) return;
    const correct = checkAnswer(p.quiz, given);
    this.answers = new Map(this.answers).set(p.step.id, { correct, given });
    this.lastFeedback = { stepId: p.step.id, correct, why: p.quiz.why };
    this.pending = null;
    const i = this.steps.indexOf(p.step);
    if (i >= 0) this.idx = i;
    this.emit();
    if (this.resumeAfterQuiz) this.play();
  };

  skipQuiz = () => {
    const p = this.pending;
    if (!p) return;
    this.answers = new Map(this.answers).set(p.step.id, { correct: null });
    this.lastFeedback = null;
    this.pending = null;
    const i = this.steps.indexOf(p.step);
    if (i >= 0) this.idx = i;
    this.emit();
    if (this.resumeAfterQuiz) this.play();
  };

  setSpeed = (s: number) => {
    this.speed = s;
    this.emit();
  };

  play = () => {
    if (this.state.atEnd) return;
    this.resumeAfterQuiz = true;
    this.playing = true;
    this.emit();
    this.schedule();
  };

  pause = () => {
    this.resumeAfterQuiz = false;
    this.playing = false;
    this.stopTimer();
    this.emit();
  };

  private schedule() {
    this.stopTimer();
    if (!this.playing) return;
    this.timer = setTimeout(() => {
      const ok = this.stepForward();
      if (!ok) {
        this.playing = false;
        if (!this.pending) this.resumeAfterQuiz = false;
        this.emit();
        return;
      }
      this.schedule();
    }, 1000 / this.speed);
  }

  private stopTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** stop the timer (listeners are managed by useSyncExternalStore) */
  dispose() {
    this.playing = false;
    this.stopTimer();
  }
}

export function useAbcPlayer(
  cfg: AbcConfig,
  makeRng: () => RandomSource,
  resetKey: string,
  quizOn: boolean,
  quizTypes: Set<QuizType>,
) {
  const [player] = useState(() => new Player());
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);

  useEffect(() => {
    player.reset(cfg, makeRng());
    // cfg/makeRng are captured by resetKey on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, resetKey]);

  useEffect(() => {
    player.setQuiz(quizOn, quizTypes);
  }, [player, quizOn, quizTypes]);

  useEffect(() => () => player.dispose(), [player]);

  return { player, ...state };
}
