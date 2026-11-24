"use client";

import { useEffect, useMemo, useState } from "react";
import { runToEnd } from "@/lib/abc/engine";
import { fmt, vecStr } from "@/lib/abc/format";
import { getProblem, PROBLEMS } from "@/lib/abc/problems";
import { SeededRandom } from "@/lib/abc/random";
import { runRandomSearch } from "@/lib/abc/randomSearch";
import type { Problem, Vec } from "@/lib/abc/types";
import { LineChart } from "../charts/LineChart";
import { MiniSpace } from "./MiniSpace";

type LaneId = "abc" | "random" | "noScout" | "noOnlooker";

// validated with the dataviz palette checker on the white surface; every line also has a direct label + legend
const LANES: Record<LaneId, { label: string; color: string; blurb: string }> = {
  abc: { label: "ABC", color: "#d97706", blurb: "The full colony: employed, onlooker and scout bees" },
  random: { label: "Random search", color: "#2a78d6", blurb: "Just tries random points and keeps the best" },
  noScout: { label: "ABC, no scouts", color: "#e34948", blurb: "Never abandons a flower, so it can get stuck" },
  noOnlooker: { label: "ABC, no onlookers", color: "#1baf7a", blurb: "No recruiting, so good flowers get no extra help" },
};

interface Frame {
  evals: number;
  bestF: number;
  bestX: Vec | null;
  sources?: Vec[];
  samples?: Vec[];
}

interface LaneData {
  id: LaneId;
  frames: Frame[]; // index = cycle
  curve: { x: number; y: number }[];
}

function simulate(problem: Problem, colonySize: number, cycles: number, seed: number, lanes: LaneId[]) {
  const Np = colonySize / 2;
  const limit = Np * 2;
  const base = { problem, colonySize, limit, maxCycles: cycles, selection: "sweep" as const };
  const optF = problem.optimum?.f ?? 0;
  const err = (f: number) => Math.max(f - optF, 1e-16);

  const abcRun = (over: object, s: number) => runToEnd({ ...base, ...over }, new SeededRandom(s));
  const full = abcRun({}, seed);
  const budget = full.evals;

  const out: LaneData[] = [];
  for (const id of lanes) {
    if (id === "random") {
      const rs = runRandomSearch(problem, budget, new SeededRandom(seed + 7919), 1);
      // running arg-min: bestIdx[n-1] = index of the best point among the first n samples
      const bestIdx: number[] = [];
      let bi = 0,
        bf = Infinity;
      rs.points.forEach((x, i) => {
        const fx = problem.f(x);
        if (fx < bf) {
          bf = fx;
          bi = i;
        }
        bestIdx.push(bi);
      });
      const frames: Frame[] = full.convergence.map((c) => {
        const n = Math.min(c.evals, budget);
        return {
          evals: n,
          bestF: rs.curve[n - 1].bestF,
          bestX: rs.points[bestIdx[n - 1]],
          samples: rs.points.slice(Math.max(0, n - 400), n),
        };
      });
      const step = Math.max(1, Math.floor(budget / 300));
      const curve = rs.curve.filter((_, i) => i % step === 0 || i === budget - 1).map((c) => ({ x: c.evals, y: err(c.bestF) }));
      out.push({ id, frames, curve });
    } else {
      const run =
        id === "abc" ? full : abcRun(id === "noScout" ? { useScouts: false } : { useOnlookers: false }, seed);
      const frames: Frame[] = run.convergence.map((c) => {
        let bi = 0;
        c.X.forEach((x, i) => {
          if (problem.f(x) < problem.f(c.X[bi])) bi = i;
        });
        return { evals: c.evals, bestF: c.bestF, bestX: c.X[bi], sources: c.X };
      });
      const curve = run.convergence.map((c) => ({ x: c.evals, y: err(c.bestF) }));
      out.push({ id, frames, curve });
    }
  }
  return { lanes: out, budget, optF };
}

function finalErrors(problem: Problem, colonySize: number, cycles: number, seed0: number, runs: number, lanes: LaneId[]) {
  const res: Record<string, number[]> = {};
  lanes.forEach((l) => (res[l] = []));
  const optF = problem.optimum?.f ?? 0;
  for (let r = 0; r < runs; r++) {
    const seed = seed0 + r * 101;
    const Np = colonySize / 2;
    const base = { problem, colonySize, limit: Np * 2, maxCycles: cycles, selection: "sweep" as const };
    const full = runToEnd(base, new SeededRandom(seed));
    for (const l of lanes) {
      let f: number;
      if (l === "abc") f = full.best.f;
      else if (l === "random") f = runRandomSearch(problem, full.evals, new SeededRandom(seed + 7919), full.evals).best.f;
      else f = runToEnd({ ...base, ...(l === "noScout" ? { useScouts: false } : { useOnlookers: false }) }, new SeededRandom(seed)).best.f;
      res[l].push(Math.max(f - optF, 1e-16));
    }
  }
  return res;
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export function Race() {
  const [problemId, setProblemId] = useState("rastrigin");
  const [colonySize, setColonySize] = useState(20);
  const [cycles, setCycles] = useState(60);
  const [seed, setSeed] = useState(7);
  const [lanes, setLanes] = useState<LaneId[]>(["abc", "random"]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [stats, setStats] = useState<Record<string, number[]> | null>(null);
  const [more, setMore] = useState(false);
  const problem = getProblem(problemId);
  const heatKey = JSON.stringify([problem.id]);

  const sim = useMemo(() => simulate(problem, colonySize, cycles, seed, lanes), [problem, colonySize, cycles, seed, lanes]);

  // reset animation when inputs change (render-time state adjustment, no effect needed)
  const simKey = `${problemId}|${colonySize}|${cycles}|${seed}|${lanes.join()}`;
  const [lastKey, setLastKey] = useState(simKey);
  if (lastKey !== simKey) {
    setLastKey(simKey);
    setFrame(0);
    setPlaying(false);
    setStats(null);
  }

  useEffect(() => {
    if (!playing) return;
    if (frame >= cycles) {
      const t = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setFrame((f) => Math.min(cycles, f + 1)), 140);
    return () => clearTimeout(t);
  }, [playing, frame, cycles]);

  const evalsNow = sim.lanes[0]?.frames[frame]?.evals ?? 0;
  const series = sim.lanes.map((l) => ({
    id: l.id,
    label: LANES[l.id].label,
    color: LANES[l.id].color,
    points: l.curve.filter((p) => p.x <= evalsNow),
  }));

  const leader = [...sim.lanes].sort((a, b) => a.frames[frame].bestF - b.frames[frame].bestF)[0];

  const toggleLane = (id: LaneId) =>
    setLanes((ls) => (ls.includes(id) ? (ls.length > 1 ? ls.filter((x) => x !== id) : ls) : (Object.keys(LANES) as LaneId[]).filter((k) => k === id || ls.includes(k))));

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-5">
      <div className="px-1">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">Race: ABC vs random guessing</h1>
        <p className="max-w-3xl text-sm text-hive-muted">
          Does the bees&apos; teamwork really help? Both get <strong className="text-stone-900">exactly the same number of tries</strong> (function
          evaluations). Press <b className="text-stone-800">Race</b> and watch who finds the lower point.
        </p>
      </div>

      <div className="card px-4 py-3 text-[13px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-stone-600">
            Problem
            <select value={problemId} onChange={(e) => setProblemId(e.target.value)} className="rounded-lg border border-hive-border bg-white px-2 py-1.5" data-testid="race-problem">
              {PROBLEMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {playing ? (
            <button className="btn btn-primary w-24 justify-center" onClick={() => setPlaying(false)}>❚❚ Pause</button>
          ) : (
            <button className="btn btn-primary w-24 justify-center" onClick={() => { if (frame >= cycles) setFrame(0); setPlaying(true); }} data-testid="race-play">
              ▶ {frame >= cycles ? "Again" : "Race"}
            </button>
          )}
          <button className="btn" onClick={() => { setFrame(0); setPlaying(false); }}>Reset</button>
          <button className="btn" onClick={() => { setFrame(cycles); setPlaying(false); }}>Finish</button>
          <input type="range" min={0} max={cycles} value={frame} onChange={(e) => { setFrame(+e.target.value); setPlaying(false); }} className="w-44" aria-label="Cycle" />
          <span className="num text-hive-muted">
            cycle <span className="text-stone-900">{frame}</span>/{cycles} · <span className="text-stone-900">{evalsNow}</span> tries each
          </span>
          <div className="ml-auto flex items-center gap-3">
            {frame > 0 && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${LANES[leader.id].color}1f`, color: LANES[leader.id].color }}>
                🏁 Leading: {LANES[leader.id].label}
              </span>
            )}
            <button className="font-medium text-stone-600 hover:text-stone-900" onClick={() => setMore(!more)} aria-expanded={more} data-testid="race-more">
              {more ? "Fewer options ▴" : "More options ▾"}
            </button>
          </div>
        </div>
        {more && (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-hive-border pt-3">
            <label className="flex items-center gap-2 text-stone-600">
              Bees S = <span className="num font-semibold text-stone-900">{colonySize}</span>
              <input type="range" min={6} max={40} step={2} value={colonySize} onChange={(e) => setColonySize(+e.target.value)} className="w-24" />
            </label>
            <label className="flex items-center gap-2 text-stone-600">
              Cycles T = <span className="num font-semibold text-stone-900">{cycles}</span>
              <input type="range" min={10} max={200} step={5} value={cycles} onChange={(e) => setCycles(+e.target.value)} className="w-28" />
            </label>
            <label className="flex items-center gap-2 text-stone-600">
              seed
              <input type="number" value={seed} onChange={(e) => setSeed(+e.target.value || 0)} className="num w-20 rounded-lg border border-hive-border bg-white px-2 py-1.5" />
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-stone-600">Racers:</span>
              {(Object.keys(LANES) as LaneId[]).map((id) => {
                const on = lanes.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleLane(id)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${on ? "border-stone-400 text-stone-900" : "border-hive-border text-hive-muted"}`}
                    aria-pressed={on}
                    data-testid={`lane-${id}`}
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: on ? LANES[id].color : "transparent", outline: `1.5px solid ${LANES[id].color}` }} />
                    {LANES[id].label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={`grid gap-4 ${["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-2 xl:grid-cols-4"][sim.lanes.length]}`}>
        {sim.lanes.map((l) => {
          const fr = l.frames[frame];
          return (
            <section key={l.id} className="card p-3" data-testid={`lane-card-${l.id}`}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: LANES[l.id].color }} />
                <span className="font-semibold">{LANES[l.id].label}</span>
                <span className="ml-auto num text-xs text-hive-muted">
                  best f = <span className="text-hive-text">{fmt(fr.bestF, 6)}</span>
                </span>
              </div>
              <div className="mx-auto max-w-[400px]">
                <MiniSpace problem={problem} heatKey={heatKey} sources={fr.sources} samples={fr.samples} best={fr.bestX} color={LANES[l.id].color} />
              </div>
              <p className="mt-2 px-1 text-[12px] text-hive-muted">
                {LANES[l.id].blurb}
                {fr.bestX && <span className="num"> · best at {vecStr(fr.bestX, 3)}</span>}
              </p>
            </section>
          );
        })}
      </div>

      <section className="card p-4">
        <div className="mb-1 text-[13px] text-stone-700">How far each racer&apos;s best answer is from the true minimum (lower is better, log scale)</div>
        <LineChart series={series} xDomain={[0, sim.budget]} log xLabel="tries (function evaluations)" width={1150} height={280} yFormat={(v) => fmt(v, 6)} />
        <div className="mt-2 flex flex-wrap gap-4 px-1 text-xs text-hive-muted">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-[15px] font-semibold text-stone-900">Was it just luck?</div>
            <p className="text-[13px] text-hive-muted">Run the same race 30 times with different random numbers.</p>
          </div>
          <button className="btn btn-primary ml-auto" onClick={() => setStats(finalErrors(problem, colonySize, cycles, seed, 30, lanes))} data-testid="race-stats">
            Run 30 races
          </button>
        </div>
        {stats && <Stats stats={stats} lanes={lanes} />}
      </section>
    </div>
  );
}

function Stats({ stats, lanes }: { stats: Record<string, number[]>; lanes: LaneId[] }) {
  const [showTable, setShowTable] = useState(false);
  const all = lanes.flatMap((l) => stats[l]);
  const lo = Math.floor(Math.log10(Math.min(...all))),
    hi = Math.ceil(Math.log10(Math.max(...all)));
  const W = 900,
    L = 140,
    R = 16,
    rowH = 34;
  const sx = (v: number) => L + ((Math.log10(v) - lo) / (hi - lo || 1)) * (W - L - R);
  const abcWins = lanes.includes("random") && lanes.includes("abc") ? stats.abc.filter((v, i) => v < stats.random[i]).length : null;
  return (
    <div className="mt-4 space-y-3">
      {abcWins !== null && (
        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-[15px] text-amber-900" data-testid="race-verdict">
          🐝 ABC found a better answer than random search in <strong>{abcWins} of 30</strong> races.
        </p>
      )}
      <svg viewBox={`0 0 ${W} ${lanes.length * rowH + 34}`} className="w-full max-w-[900px]">
        {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((e) => (
          <g key={e}>
            <line x1={sx(10 ** e)} x2={sx(10 ** e)} y1={0} y2={lanes.length * rowH} stroke="#e7e5e0" />
            <text x={sx(10 ** e)} y={lanes.length * rowH + 16} textAnchor="middle" fontSize="11" fill="#6b675f">
              1e{e}
            </text>
          </g>
        ))}
        <text x={(L + W) / 2} y={lanes.length * rowH + 31} textAnchor="middle" fontSize="11" fill="#6b675f">
          final distance from the true minimum (further left = better)
        </text>
        {lanes.map((l, r) => (
          <g key={l}>
            <text x={L - 10} y={r * rowH + rowH / 2 + 4} textAnchor="end" fontSize="12" fill="#1f1d1a">
              {LANES[l].label}
            </text>
            {stats[l].map((v, i) => (
              <circle key={i} cx={sx(v)} cy={r * rowH + rowH / 2 + ((i % 5) - 2) * 2.5} r="4" fill={LANES[l].color} stroke="#ffffff" strokeWidth="1.5" opacity="0.9">
                <title>{`${LANES[l].label}, race ${i + 1}: ${fmt(v, 8)}`}</title>
              </circle>
            ))}
            <line x1={sx(median(stats[l]))} x2={sx(median(stats[l]))} y1={r * rowH + 6} y2={r * rowH + rowH - 6} stroke="#1f1d1a" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <p className="text-xs text-hive-muted">Each dot is one race. The black tick is the middle (median) result.</p>
      <p className="max-w-3xl text-[13.5px] leading-relaxed text-stone-600">
        <b className="text-stone-800">Why ABC wins:</b> bees keep searching <em>near</em> good flowers, onlookers crowd onto the best ones
        (positive feedback), and scouts restart flowers that are stuck (negative feedback). Random search never learns from what it already
        found.
      </p>
      <button className="text-[13px] font-medium text-amber-700 hover:underline" onClick={() => setShowTable(!showTable)}>
        {showTable ? "Hide the numbers ▴" : "Show the numbers ▾"}
      </button>
      {showTable && (
        <table className="num w-full max-w-[700px] text-right text-[13px]">
          <thead className="text-[11px] uppercase tracking-wider text-hive-muted">
            <tr>
              <th className="py-1.5 text-left">racer</th>
              <th>median</th>
              <th>mean</th>
              <th>best</th>
              <th>worst</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((l) => {
              const v = stats[l];
              return (
                <tr key={l} className="border-t border-hive-border">
                  <td className="py-1.5 text-left">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: LANES[l].color }} />
                    {LANES[l].label}
                  </td>
                  <td>{fmt(median(v), 6)}</td>
                  <td>{fmt(v.reduce((a, b) => a + b, 0) / v.length, 6)}</td>
                  <td>{fmt(Math.min(...v), 6)}</td>
                  <td>{fmt(Math.max(...v), 6)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
