import type { Metadata } from "next";
import Link from "next/link";
import { Tex } from "@/components/Tex";
import { BeeGlyph, FlowerGlyph, HiveGlyph } from "@/components/sim/glyphs";
import { PSEUDOCODE } from "@/lib/abc/engine";

export const metadata: Metadata = { title: "Learn ABC · Hive Lab" };

const MAPPING: [string, string][] = [
  ["Food source position", "A candidate solution Xᵐ = (xₘ₁, …, xₘₙ)"],
  ["Nectar amount", "Quality (fitness) of that solution"],
  ["Employed bee", "One per food source, so the number of employed bees = Np = number of solutions"],
  ["Waggle dance", "Sharing a source's fitness with the onlookers in the hive"],
  ["Onlooker bee", "Chooses a source with probability p_m and searches near it"],
  ["Exhausted source", "A solution that has not improved for more than limit trials in a row"],
  ["Scout bee", "Replaces an exhausted source with a random new one"],
];

const FORMULAS: { name: string; tex: string; note: string; slide: number }[] = [
  {
    name: "Initialization",
    tex: String.raw`x_{m i}=l_i+\text{rand}(0,1)\cdot(u_i-l_i)`,
    note: "Each variable starts uniformly at random between its lower bound lᵢ and upper bound uᵢ.",
    slide: 8,
  },
  {
    name: "Neighbour search (employed & onlooker bees)",
    tex: String.raw`x'_{m i}=x_{m i}+\phi_{m i}\,(x_{m i}-x_{k i}),\qquad \phi_{mi}\in[-1,1]`,
    note: "Only ONE randomly chosen variable i changes. k is a randomly chosen partner source with k ≠ m. Values outside the bounds are clipped back to the bound.",
    slide: 9,
  },
  {
    name: "Fitness for minimization",
    tex: String.raw`\text{fit}_m=\begin{cases}\dfrac{1}{1+f_m} & f_m\ge 0\\[4pt] 1+\lvert f_m\rvert & f_m<0\end{cases}`,
    note: "Smaller f means larger fitness, which means more nectar. Greedy selection keeps whichever of x′ and x has the larger fitness.",
    slide: 10,
  },
  {
    name: "Onlooker probability",
    tex: String.raw`p_m=0.9\cdot\frac{\text{fit}_m}{\max(\text{fit})}+0.1`,
    note: "The best source gets p = 1 and every source keeps at least 0.1. An onlooker is recruited to source m when a random r < pₘ. (A roulette wheel can be used instead.)",
    slide: 11,
  },
  {
    name: "Abandonment (scouts)",
    tex: String.raw`t_m>\text{limit}\ \Rightarrow\ X^m\leftarrow\text{random source},\ t_m=0`,
    note: "t_m counts failed improvements in a row. Ideally limit = Np × number of decision variables.",
    slide: 12,
  },
];

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-8">
      <header className="space-y-3">
        <div className="label">2-minute primer</div>
        <h1 className="text-3xl font-semibold tracking-tight">The Artificial Bee Colony algorithm</h1>
        <p className="max-w-3xl text-[15px] leading-relaxed text-zinc-300">
          Introduced by <strong>Dervis Karaboga</strong> (Erciyes University, 2005), ABC is a swarm-based metaheuristic for numerical
          optimization. It is inspired by how honey bees forage and builds on the model of Tereshko and Loengarov. The colony
          turns an optimization problem into a search for the parameter vector that <em>minimizes an objective function</em>. Good
          solutions get exploited (<span className="text-good">positive feedback</span>, through recruitment) and poor ones get
          abandoned (<span className="text-scout">negative feedback</span>).
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/" className="btn btn-primary">
            Open the simulator →
          </Link>
          <Link href="/?mode=textbook" className="btn">
            Step through the slide example
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {(
          [
            ["employed", "Employed bees", "One per food source. Each one searches near its own source, using a random partner, and keeps the better of the two (greedy selection). Back at the hive it dances to share how rich its source is."],
            ["onlooker", "Onlooker bees", "Wait in the hive and watch the dances. They pick sources with probability pₘ, so rich sources attract more onlookers, then they search there just like employed bees."],
            ["scout", "Scout bees", "When a source fails to improve more than limit times, its employed bee abandons it and becomes a scout. The scout flies to a completely random new spot. Onlookers and scouts together are the unemployed bees."],
          ] as const
        ).map(([role, title, text]) => (
          <div key={role} className="card p-5">
            <svg width="44" height="44" viewBox="-22 -22 44 44" className="mb-2">
              <BeeGlyph role={role} scale={1.4} />
            </svg>
            <h2 className="mb-1 font-semibold">{title}</h2>
            <p className="text-[13.5px] leading-relaxed text-hive-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-center gap-3">
          <svg width="34" height="34" viewBox="-17 -17 34 34">
            <FlowerGlyph size={10} />
          </svg>
          <svg width="34" height="34" viewBox="-17 -17 34 34">
            <HiveGlyph size={14} />
          </svg>
          <h2 className="font-semibold">Nature ↔ algorithm</h2>
        </div>
        <table className="w-full text-[14px]">
          <tbody>
            {MAPPING.map(([a, b]) => (
              <tr key={a} className="border-t border-hive-border/60">
                <td className="w-56 py-2 pr-4 font-medium text-honey">{a}</td>
                <td className="py-2 text-zinc-300">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">The five formulas</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {FORMULAS.map((f) => (
            <div key={f.name} className="card p-5">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-medium">{f.name}</h3>
                <span className="text-[11px] text-hive-muted">slide {f.slide}</span>
              </div>
              <div className="overflow-x-auto py-2 text-[15px]">
                <Tex tex={f.tex} block />
              </div>
              <p className="text-[13px] leading-relaxed text-hive-muted">{f.note}</p>
            </div>
          ))}
          <div className="card p-5">
            <h3 className="mb-2 font-medium">Control parameters</h3>
            <ul className="space-y-1.5 text-[13.5px] text-zinc-300">
              <li>
                <span className="text-honey">S</span>: colony size, with <span className="text-honey">Np = S/2</span> food sources (= employed
                bees = onlookers)
              </li>
              <li>
                <span className="text-honey">limit</span>: abandonment criterion, ideally Np × number of variables
              </li>
              <li>
                <span className="text-honey">T / MCN</span>: maximum cycle number
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">General algorithm (slide 7)</h2>
          <ol className="font-mono text-[12.5px] leading-6 text-zinc-300">
            {PSEUDOCODE.map((l, i) => (
              <li key={i} style={{ paddingLeft: l.indent * 18 }}>
                {l.text}
              </li>
            ))}
          </ol>
        </div>
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Where ABC is used (slide 13)</h2>
          <ul className="grid grid-cols-2 gap-2 text-[13.5px] text-zinc-300">
            {["Training neural networks", "Welded beam design", "Optimizing hybrid functions", "Integer programming", "Combinatorial problems", "Image processing"].map((a) => (
              <li key={a} className="rounded-lg bg-hive-panel2 px-3 py-2">
                {a}
              </li>
            ))}
          </ul>
          <h2 className="mb-2 mt-5 font-semibold">How to use this tool</h2>
          <ul className="space-y-1.5 text-[13.5px] text-hive-muted">
            <li>
              <Link className="text-honey hover:underline" href="/">
                Simulator
              </Link>
              : pick a problem, change S, limit, T and the selection rule, then step through or play.
            </li>
            <li>
              <span className="text-hive-text">Quiz mode</span>: predict each greedy selection, onlooker choice and scout check before it
              happens.
            </li>
            <li>
              <Link className="text-honey hover:underline" href="/race">
                Race
              </Link>
              : ABC against random search with the same budget, plus ablations.
            </li>
            <li>
              <Link className="text-honey hover:underline" href="/verify">
                Textbook check
              </Link>
              : every number from the slides&apos; solved example, reproduced and verified.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
