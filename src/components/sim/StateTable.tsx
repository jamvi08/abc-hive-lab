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
    <section>
      <div className="mb-2 flex items-center gap-2">
        <div className="text-[13px] text-stone-700">Every flower the colony remembers, updated at each step.</div>
        <div className="ml-auto flex rounded-lg border border-hive-border p-0.5 text-xs">
          {(["table", "matrix"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={`rounded-md px-2.5 py-1 ${view === v ? "bg-hive-panel2 text-amber-700" : "text-hive-muted"}`}
              data-testid={`view-${v}`}
            >
              {v === "table" ? "Table" : "As on slides"}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="max-h-[340px] overflow-auto">
          <table className="num w-full text-right text-[13px]">
            <thead className="sticky top-0 bg-hive-panel text-[11px] uppercase tracking-wider text-hive-muted">
              <tr>
                <th className="px-2 py-1.5 text-left">flower</th>
                <th className="px-2 py-1.5">x₁</th>
                <th className="px-2 py-1.5">x₂</th>
                <th className="px-2 py-1.5">f(x)</th>
                <th className="px-2 py-1.5">fitness</th>
                <th className="px-2 py-1.5 text-left">failed t</th>
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
                    className={`border-t border-hive-border/60 ${focusM === m ? "bg-amber-50" : ""}`}
                    data-testid={`row-${m + 1}`}
                  >
                    <td className="px-2 py-1 text-left font-semibold">
                      {m + 1}
                      {m === bestIdx && <span className="ml-1 text-amber-500">★</span>}
                    </td>
                    {cell("x1", fmt(x[0]), changed(x[0], p?.X[m]?.[0]))}
                    {cell("x2", fmt(x[1]), changed(x[1], p?.X[m]?.[1]))}
                    {cell("f", fmt(snap.f[m]), changed(snap.f[m], p?.f[m]))}
                    {cell("fit", fmt(snap.fit[m]), changed(snap.fit[m], p?.fit[m]))}
                    <td key={changed(tr, p?.trial[m]) ? `t${stepId}` : "t"} className={`px-2 py-1 text-left ${changed(tr, p?.trial[m]) ? "flash" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-5 text-right ${tr > limit ? "font-semibold text-red-600" : ""}`}>{tr}</span>
                        <div className="relative h-1.5 w-16 rounded-full bg-hive-border">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${tr > limit ? "bg-red-500" : "bg-amber-400"}`}
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

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-hive-border pt-2 text-[12.5px] text-hive-muted">
        <span>
          <span className="text-amber-500">★</span> best so far:{" "}
          <span className="num text-stone-900">
            f = {fmt(snap.best.f, 6)} at {vecStr(snap.best.x, 4)}
          </span>
        </span>
        {snap.abandoned && (
          <span>
            last abandoned (memory B): <span className="num text-stone-900">{vecStr(snap.abandoned.x)}, f = {fmt(snap.abandoned.f)}</span>
          </span>
        )}
        <span>
          limit = <span className="num text-stone-900">{limit}</span>
        </span>
      </div>
    </section>
  );
}
