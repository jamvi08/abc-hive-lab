"use client";

import { fmt, tnum, vecStr } from "@/lib/abc/format";
import type { Snapshot } from "@/lib/abc/types";
import { Tex } from "../Tex";

function matrix(rows: string[][]) {
  return `\\begin{bmatrix}${rows.map((r) => r.join(" & ")).join("\\\\")}\\end{bmatrix}`;
}

export function StateTable({
  snap,
  prev,
  stepId,
  focusM,
  limit,
  view,
  onView,
}: {
  snap: Snapshot;
  prev: Snapshot | undefined;
  stepId: number;
  focusM: number | null;
  limit: number;
  view: "table" | "matrix";
  onView: (v: "table" | "matrix") => void;
}) {
  const Np = snap.X.length;
  const changed = (a: number | undefined, b: number | undefined) => prev !== undefined && a !== b;
  const bestIdx = snap.f.indexOf(Math.min(...snap.f));

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="label">Colony memory: food sources</div>
        <div className="ml-auto flex rounded-lg border border-hive-border p-0.5 text-xs">
          {(["table", "matrix"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={`rounded-md px-2.5 py-1 ${view === v ? "bg-hive-panel2 text-honey" : "text-hive-muted"}`}
              data-testid={`view-${v}`}
            >
              {v === "table" ? "Table" : "Slide view"}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="max-h-[430px] overflow-auto">
          <table className="num w-full text-right text-[13px]">
            <thead className="sticky top-0 bg-hive-panel text-[11px] uppercase tracking-wider text-hive-muted">
              <tr>
                <th className="px-2 py-1.5 text-left">m</th>
                <th className="px-2 py-1.5">x₁</th>
                <th className="px-2 py-1.5">x₂</th>
                <th className="px-2 py-1.5">f(x)</th>
                <th className="px-2 py-1.5">fit</th>
                <th className="px-2 py-1.5 text-left">trial t</th>
                <th className="px-2 py-1.5">p</th>
              </tr>
            </thead>
            <tbody>
              {snap.X.map((x, m) => {
                const p = prev;
                const cell = (col: string, val: string, ch: boolean, extra = "") => (
                  <td key={`${col}-${ch ? stepId : "s"}`} className={`px-2 py-1 ${ch ? "flash" : ""} ${extra}`}>
                    {val}
                  </td>
                );
                const tr = snap.trial[m];
                return (
                  <tr
                    key={m}
                    className={`border-t border-hive-border/60 ${focusM === m ? "bg-honey/10" : ""}`}
                    data-testid={`row-${m + 1}`}
                  >
                    <td className="px-2 py-1 text-left font-semibold">
                      {m + 1}
                      {m === bestIdx && <span className="ml-1 text-yellow-300">★</span>}
                    </td>
                    {cell("x1", fmt(x[0]), changed(x[0], p?.X[m]?.[0]))}
                    {cell("x2", fmt(x[1]), changed(x[1], p?.X[m]?.[1]))}
                    {cell("f", fmt(snap.f[m]), changed(snap.f[m], p?.f[m]))}
                    {cell("fit", fmt(snap.fit[m]), changed(snap.fit[m], p?.fit[m]))}
                    <td key={changed(tr, p?.trial[m]) ? `t${stepId}` : "t"} className={`px-2 py-1 text-left ${changed(tr, p?.trial[m]) ? "flash" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-5 text-right ${tr > limit ? "font-semibold text-red-400" : ""}`}>{tr}</span>
                        <div className="relative h-1.5 w-16 rounded-full bg-hive-border">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${tr > limit ? "bg-red-400" : "bg-amber-200/80"}`}
                            style={{ width: `${Math.min(100, (tr / (limit + 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    {cell("p", snap.prob ? fmt(snap.prob[m]) : "–", changed(snap.prob?.[m], p?.prob?.[m]), snap.prob ? "" : "text-hive-muted")}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-center gap-3 text-[13px]">
            <Tex tex={`X=${matrix(snap.X.slice(0, 12).map((x) => x.map((v) => tnum(v))))}`} />
            <Tex tex={`f=${matrix(snap.f.slice(0, 12).map((v) => [tnum(v)]))}`} />
            <Tex tex={`\\text{fit}=${matrix(snap.fit.slice(0, 12).map((v) => [tnum(v)]))}`} />
            <Tex tex={`t=${matrix(snap.trial.slice(0, 12).map((v) => [String(v)]))}`} />
            {snap.prob && <Tex tex={`p=${matrix(snap.prob.slice(0, 12).map((v) => [tnum(v)]))}`} />}
          </div>
          {Np > 12 && <div className="mt-1 text-xs text-hive-muted">Showing the first 12 of {Np} food sources.</div>}
        </div>
      )}

      <div className="mt-3 grid gap-1 border-t border-hive-border pt-3 text-[12.5px] text-hive-muted sm:grid-cols-2">
        <div>
          <span className="text-yellow-300">★</span> Best so far:{" "}
          <span className="num text-hive-text">
            f* = {fmt(snap.best.f, 6)} at {vecStr(snap.best.x, 4)}
          </span>
        </div>
        <div>
          Memory B (last abandoned):{" "}
          <span className="num text-hive-text">
            {snap.abandoned ? `${vecStr(snap.abandoned.x)}, f = ${fmt(snap.abandoned.f)}` : "none yet"}
          </span>
        </div>
        <div>
          limit = <span className="num text-hive-text">{limit}</span> · Np = <span className="num text-hive-text">{Np}</span>
        </div>
        <div>
          Function evaluations: <span className="num text-hive-text">{snap.evals}</span>
        </div>
      </div>
    </section>
  );
}
