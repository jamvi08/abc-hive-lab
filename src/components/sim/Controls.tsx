"use client";

import { useState } from "react";
import type { Phase, Step } from "@/lib/abc/types";
import { PHASE_META } from "./Explanation";

const I = {
  reset: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  back: "M15 18l-6-6 6-6",
  fwd: "M9 18l6-6-6-6",
  play: "M7 5l12 7-12 7z",
  pause: "M7 5h4v14H7zM13 5h4v14h-4z",
};

function Icon({ d, fill = false }: { d: string; fill?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path d={d} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={fill ? 0 : 2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PHASES: Phase[] = ["init", "employed", "onlooker", "scout", "memorize"];

export function Controls({
  step,
  idx,
  maxCycles,
  playing,
  atEnd,
  speed,
  quizPending,
  onReset,
  onBack,
  onPlay,
  onPause,
  onStep,
  onPhase,
  onCycle,
  onEnd,
  onSpeed,
}: {
  step: Step | undefined;
  idx: number;
  maxCycles: number;
  playing: boolean;
  atEnd: boolean;
  speed: number;
  quizPending: boolean;
  onReset: () => void;
  onBack: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onPhase: () => void;
  onCycle: () => void;
  onEnd: () => void;
  onSpeed: (s: number) => void;
}) {
  const [skipOpen, setSkipOpen] = useState(false);
  const block = atEnd || quizPending;
  // log-scale speed slider: 0.5 .. 40 steps/s
  const toSlider = (s: number) => Math.log(s / 0.5) / Math.log(80);
  const fromSlider = (v: number) => +(0.5 * Math.pow(80, v)).toFixed(2);
  const skip = (fn: () => void) => () => {
    setSkipOpen(false);
    fn();
  };

  return (
    <div className="card sticky top-[61px] z-20 flex flex-wrap items-center gap-2 px-3 py-2">
      <button className="btn" onClick={onReset} title="Start again (R)" data-testid="reset">
        <Icon d={I.reset} /> Reset
      </button>
      <button className="btn" onClick={onBack} disabled={idx === 0} title="Step back (←)" data-testid="back">
        <Icon d={I.back} /> Back
      </button>
      {playing ? (
        <button className="btn btn-primary w-[88px] justify-center" onClick={onPause} title="Pause (Space)" data-testid="pause">
          <Icon d={I.pause} fill /> Pause
        </button>
      ) : (
        <button className="btn btn-primary w-[88px] justify-center" onClick={onPlay} disabled={block} title="Play (Space)" data-testid="play">
          <Icon d={I.play} fill /> Play
        </button>
      )}
      <button className="btn" onClick={onStep} disabled={block} title="One step (→)" data-testid="step">
        Step <Icon d={I.fwd} />
      </button>

      <div className="relative">
        <button className="btn" onClick={() => setSkipOpen(!skipOpen)} disabled={block && !atEnd} aria-expanded={skipOpen} data-testid="skip">
          Skip ▾
        </button>
        {skipOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setSkipOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-hive-border bg-white py-1 text-[13px] shadow-lg">
              <button className="block w-full px-3 py-2 text-left hover:bg-hive-panel2 disabled:opacity-40" disabled={block} onClick={skip(onPhase)} data-testid="next-phase">
                to the next phase <span className="float-right text-hive-muted">N</span>
              </button>
              <button className="block w-full px-3 py-2 text-left hover:bg-hive-panel2 disabled:opacity-40" disabled={block} onClick={skip(onCycle)} data-testid="next-cycle">
                to the next cycle <span className="float-right text-hive-muted">C</span>
              </button>
              <button className="block w-full px-3 py-2 text-left hover:bg-hive-panel2 disabled:opacity-40" disabled={atEnd} onClick={skip(onEnd)} data-testid="to-end">
                to the end <span className="float-right text-hive-muted">E</span>
              </button>
            </div>
          </>
        )}
      </div>

      <label className="ml-1 flex items-center gap-1.5 text-xs text-hive-muted" title={`${speed} steps per second`}>
        <span aria-hidden>🐢</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={toSlider(speed)}
          onChange={(e) => onSpeed(fromSlider(+e.target.value))}
          className="w-24"
          aria-label="Playback speed"
          data-testid="speed"
        />
        <span aria-hidden>🐇</span>
      </label>

      <div className="ml-auto flex items-center gap-1 text-[12px]">
        {PHASES.map((p, i) => {
          const active = step?.phase === p || (p === "memorize" && step?.phase === "done");
          const m = PHASE_META[p];
          return (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && <span className="text-stone-300">›</span>}
              <span
                className="rounded-md px-1.5 py-0.5 font-medium transition-colors"
                style={active ? { background: m.soft, color: m.ink } : { color: "#a8a29e" }}
              >
                {m.short}
              </span>
            </span>
          );
        })}
        <span className="num ml-3 text-hive-muted">
          cycle <span className="font-semibold text-stone-900">{step?.cycle ?? 0}</span>/{maxCycles}
        </span>
      </div>
    </div>
  );
}
