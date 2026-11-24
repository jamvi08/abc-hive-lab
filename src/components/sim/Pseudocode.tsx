"use client";

import { PSEUDOCODE } from "@/lib/abc/engine";
import type { Selection } from "@/lib/abc/types";

export function Pseudocode({ line, selection }: { line: number; selection: Selection }) {
  return (
    <section>
      <div className="label mb-2">General algorithm (slide 7)</div>
      <ol className="font-mono text-[12.5px] leading-6">
        {PSEUDOCODE.map((l, i) => {
          const text =
            i === 8 && selection === "roulette" ? "choose a food source m by roulette wheel (p_m / Σp)" : i === 8 ? "choose a food source m: recruit if r < p_m" : l.text;
          const active = i === line;
          const header = i === 0 || i === 2 || i === 3 || i === 7 || i === 10 || i === 11 || i === 12;
          return (
            <li
              key={i}
              className={`rounded-md px-2 transition-colors ${active ? "bg-amber-100 text-amber-700" : header ? "text-stone-800" : "text-hive-muted"}`}
              style={{ paddingLeft: 8 + l.indent * 18 }}
            >
              <span className="mr-2 inline-block w-3 text-right text-[10px] text-hive-muted/60">{active ? "▶" : ""}</span>
              {text}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
