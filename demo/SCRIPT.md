# Demo video: narration script (4 min 55 s)

**How to use this:** `hive-lab-demo.mp4` is a silent screen recording that follows this script beat by beat.
Import it into CapCut, iMovie, Clipchamp or another editor, record your voice over it, and read each block when
its timestamp comes up. The **[on screen]** lines describe what is happening, so you can stay in sync even
without watching the clock. Each block is sized for a relaxed pace of about 140 words per minute.

You can regenerate the video at any time with `demo/record-demo.mjs` (see the README). The timestamps below
are the ones it logs.

| Time | Beat |
| --- | --- |
| 0:00 | Intro: Simulator |
| 0:22 | Learn page |
| 0:45 | Textbook example: 0:53 employed bee 1 · 1:09 greedy · 1:18 dance & p · 1:31 onlooker · 1:41 scout · 1:59 slide view |
| 2:10 | Textbook check: 2:13 run |
| 2:36 | Free run: 2:50 play · 3:02 end + chart · 3:12 roulette wheel |
| 3:34 | Quiz: 3:40 question 1 · 3:54 question 2 |
| 4:06 | Race: 4:11 race · 4:28 thirty races |
| 4:42 | Outro |

---

### 0:00 · Intro
**[on screen]** The Simulator: colour map, flowers (food sources), side panel.

> Hi! This is **Hive Lab**, an interactive tool I built to teach the **Artificial Bee Colony algorithm**,
> introduced by Karaboga in 2005. It runs entirely in the browser, it's built with Next.js and TypeScript,
> and every step of the algorithm is **visualized and explained in plain language**.

### 0:22 · Learn page
**[on screen]** Click **Learn ABC**. Scroll past the three bee types and the five formulas.

> The **Learn** page is a short primer that follows our syllabus. A food source is a candidate solution, and its
> nectar is the fitness. There are **employed, onlooker and scout** bees, and these are the five formulas from
> the slides.

### 0:45 · Textbook example
**[on screen]** Back to the Simulator, click **Textbook example**.

> Now the **solved example from our slides**. Textbook mode uses exactly the same population and random numbers.

**[0:53 — click Step; the bee flies to the right edge]**

> Employed bee one changes **only one variable**, with partner X⁴ and φ = 0.81. That gives **7.67**, which is outside the
> bounds, so it's **clipped to 5**. The purple box confirms this matches **slide 15**.

**[1:09 — Step; a red ✗ and the trial ring appear]**

> Greedy selection: fitness 0.037 is worse than 0.167, so the bee **stays**, and its **trial counter** goes up to one.

**[1:18 — Phase; the bee dances at the hive, and p-values appear]**

> Now the bees dance in the hive, and onlookers compute **p = 0.9 × fitness ÷ max fitness, plus 0.1**.
> The pseudocode highlights where we are.

**[1:31 — Step; a blue onlooker flies to source 1]**

> The first onlooker draws **r = 0.39**, which is less than **0.729**, so it's recruited to source one, exactly like slide 17.

**[1:41 — Phase, then Step; a red ring, then a pink scout flies across]**

> In the scout phase, source five's trial count of **two is greater than the limit of one**. So it's abandoned
> and saved in **memory B**, and a scout flies to a new random source at **(−0.7, 0.8)**.

**[1:59 — scroll down, click Slide view]**

> **Slide view** shows the X, f, fit and t matrices in the same format as slide 19.

### 2:10 · Textbook check
**[on screen]** Click **Textbook Check**. At 2:13, click **Run the textbook check**, then scroll.

> To prove the tool is correct, this page compares **86 values from the slides** and **61 values from my own
> hand calculation** with the engine, and all 61 match. It even caught **three small slips in the slides**.
> For example, p₂ should be **0.854, not 0.859**. It also explains why none of them change the result.

### 2:36 · Free run
**[on screen]** Simulator: choose **Himmelblau**, point at the sliders, switch on **trails**.

> In **free-run** mode I can pick a problem, like **Himmelblau's function** with its **four equal minima**, or type in
> my own function. I can change the **colony size, the limit, the cycles** and the **onlooker rule**.

**[2:50 — raise the speed and press Play]**

> When I press **Play**, the bee flies to every action. With trails on, you can watch the colony
> **split between the different minima**.

**[3:02 — End, then scroll to the chart]**

> The convergence chart shows the error of the best solution falling on a log scale.

**[3:12 — switch to Roulette wheel and step through the onlookers]**

> Onlookers can use the slides' rule, **r less than p**, which is drawn as a rose, or a **roulette wheel**,
> where each slice is proportional to p. The blue dots count the onlookers each source attracts.
> That's the **positive feedback**.

### 3:34 · Quiz mode
**[on screen]** Textbook example again, and turn on **Quiz mode**.

> **Quiz mode** turns watching into active learning.

**[3:40 — a "Predict the next step" card appears; click "Stay"]**

> Before each decision, the tool asks me to **predict** what happens. The candidate's fitness is lower, so
> greedy selection keeps the old source. And that's correct!

**[3:54 — next question; click "Move"]**

> This bee found a better source, so it moves. The quiz also covers onlooker choices, scout checks,
> and even computing v **by hand**.

### 4:06 · ABC vs random search race
**[on screen]** Click **ABC vs Random Race**, add **"ABC, no scouts"**, then at 4:11 press **Race**.

> Finally, the **Race** page asks: does the colony's teamwork actually help? Each method gets **exactly the same
> number of function evaluations** on Rastrigin's function, which is full of local traps.
> ABC ends up **many orders of magnitude better**, and without scouts it gets stuck, which shows why the
> negative feedback matters.

**[4:28 — Run 30 races]**

> And over **thirty repeated races, ABC wins all thirty**.

### 4:42 · Outro
**[on screen]** Back to the Simulator.

> Hive Lab is open source on GitHub, with a README and **168 automated tests**, and it's live on
> GitHub Pages. Thanks for watching!

---

**Links for the video description and your submission**
- Live site: https://jamvi08.github.io/abc-hive-lab/
- GitHub: https://github.com/jamvi08/abc-hive-lab
