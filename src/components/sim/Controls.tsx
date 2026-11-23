"use client";

import type { Phase, Step } from "@/lib/abc/types";
import { PHASE_META } from "./Explanation";

const I = {
  reset: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  back: "M15 18l-6-6 6-6",
  fwd: "M9 18l6-6-6-6",
  play: "M7 5l12 7-12 7z",
  pause: "M7 5h4v14H7zM13 5h4v14h-4z",
  phase: "M5 5l7 7-7 7M12 5l7 7-7 7",
  cycle: "M4 12h12M12 6l6 6-6 6M20 5v14",
  end: "M5 5l7 7-7 7M13 5l7 7-7 7M21 5v14",
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
  const block = atEnd || quizPending;
  // log-scale speed slider: 0.5 .. 40 steps/s
  const toSlider = (s: number) => Math.log(s / 0.5) / Math.log(80);
  const fromSlider = (v: number) => +(0.5 * Math.pow(80, v)).toFixed(2);
  return (
    <div className="card sticky top-[61px] z-20 flex flex-wrap items-center gap-2 px-3 py-2.5">
      <button className="btn" onClick={onReset} title="Reset (R)" data-testid="reset">
        <Icon d={I.reset} /> Reset
      </button>
      <button className="btn" onClick={onBack} disabled={idx === 0} title="Step back (←)" data-testid="back">
        <Icon d={I.back} /> Back
      </button>
      {playing ? (
        <button className="btn btn-primary w-[92px] justify-center" onClick={onPause} title="Pause (Space)" data-testid="pause">
          <Icon d={I.pause} fill /> Pause
        </button>
      ) : (
        <button className="btn btn-primary w-[92px] justify-center" onClick={onPlay} disabled={block} title="Play (Space)" data-testid="play">
          <Icon d={I.play} fill /> Play
        </button>
      )}
      <button className="btn" onClick={onStep} disabled={block} title="Step (→)" data-testid="step">
        Step <Icon d={I.fwd} />
      </button>
      <button className="btn" onClick={onPhase} disabled={block} title="Next phase (N)" data-testid="next-phase">
        <Icon d={I.phase} /> Phase
      </button>
      <button className="btn" onClick={onCycle} disabled={block} title="Next cycle (C)" data-testid="next-cycle">
        <Icon d={I.cycle} /> Cycle
      </button>
      <button className="btn" onClick={onEnd} disabled={atEnd} title="Run to the end (E)" data-testid="to-end">
        <Icon d={I.end} /> End
      </button>

      <label className="ml-2 flex items-center gap-2 text-xs text-hive-muted">
        Speed
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={toSlider(speed)}
          onChange={(e) => onSpeed(fromSlider(+e.target.value))}
          className="w-28"
          aria-label="Playback speed"
          data-testid="speed"
        />
        <span className="num w-16 text-hive-text">{speed < 10 ? speed.toFixed(1) : Math.round(speed)} steps/s</span>
      </label>

      <div className="ml-auto flex items-center gap-1">
        {PHASES.map((p) => {
          const active = step?.phase === p || (p === "memorize" && step?.phase === "done");
          const m = PHASE_META[p];
          return (
            <span
              key={p}
              className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
              style={active ? { background: `${m.color}26`, color: m.color } : { color: "#6b6385" }}
            >
              {m.label.replace(" bees", "").replace(" best", "")}
            </span>
          );
        })}
        <span className="num ml-2 text-xs text-hive-muted">
          cycle <span className="text-hive-text">{step?.cycle ?? 0}</span>/{maxCycles} · evals{" "}
          <span className="text-hive-text">{step?.snap.evals ?? 0}</span>
        </span>
      </div>
    </div>
  );
}
