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
| 0:45 | Slide example: 0:53 bee 1 + *Show the math* · 1:08 worse, stays · 1:18 dance · 1:31 onlooker · 1:42 scout check · 1:48 scout · 1:58 "As on slides" |
| 2:10 | Slide Check: 2:13 run · 2:19 hand calculation |
| 2:36 | Free run: 2:52 play · 3:06 skip to end + Progress tab · 3:17 roulette wheel |
| 3:40 | Quiz: 3:44 question 1 · 3:58 question 2 |
| 4:10 | Race: 4:17 race · 4:33 thirty races |
| 4:42 | Outro |

---

### 0:00 · Intro
**[on screen]** The Simulator: a light map with flowers (food sources), one settings strip, Play and Step buttons.

> Hi! This is **Hive Lab**, a simple interactive tool I built to teach the **Artificial Bee Colony algorithm**,
> introduced by Karaboga in 2005. It runs in the browser, it's built with Next.js and TypeScript,
> and it explains every step of the algorithm **in plain words**.

### 0:22 · Learn page
**[on screen]** Click **Learn**. Scroll past the three bee types and the five formulas.

> The **Learn** page is a quick primer that follows our syllabus. A flower is a possible answer, and its nectar
> is the fitness. There are **employed, onlooker and scout** bees, and these are the five formulas from the
> slides.

### 0:45 · Slide example
**[on screen]** Back to the Simulator, click **Slide example**.

> Now the **solved example from our slides**. This mode uses exactly the same starting flowers and random numbers.

**[0:53 — click Step, then "Show the math"]**

> I press **Step**. Bee one tries a nearby spot by changing **only x₁**. When I click **Show the math**, I see
> 2 + 0.81 × 7 = **7.67**, which is outside the bounds, so it's **clipped to 5**. That's exactly slide 15.

**[1:08 — Step; a red ✗ on the map]**

> The new spot is worse, fitness 0.037 against 0.167, so the bee **stays**, and its failure counter goes up to one.

**[1:18 — Skip ▸ next phase; the bee dances at the hive]**

> I'll **skip** to the next phase. The bees dance in the hive, and better flowers get a **higher chance p**,
> using p = 0.9 × fitness ÷ max fitness, plus 0.1.

**[1:31 — Step; an onlooker flies to flower 1]**

> The first onlooker draws **r = 0.39**, which is below **0.729**, so it goes to flower one, just like slide 17.

**[1:42 — Skip ▸ next phase, then Step; a scout flies across]**

> Flower five has failed **twice, which is more than the limit of one**, so it's abandoned, and a **scout**
> finds a new random flower at **(−0.7, 0.8)**.

**[1:58 — the table switches to "As on slides"]**

> And this view shows the same X, f, fitness and t matrices as **slide 19**.

### 2:10 · Slide Check
**[on screen]** Click **Slide Check**. At 2:13, click **Run the check**. At 2:19, a hand-calculation section opens.

> To prove it's correct, **Slide Check** runs the example and compares **every number**. All **61 values of my hand
> calculation** match, and it found **three small slips** on the slides, like p₂ = 0.854, not 0.859. None of them
> change the result.

### 2:36 · Free run
**[on screen]** Simulator in Free run. Choose **Himmelblau**, point at Bees, limit and Cycles, switch on trails.

> In **Free run** I can choose a problem, like **Himmelblau's function with four equal minima**, or type my own.
> I can change the number of **bees, the limit and the cycles**.

**[2:52 — raise the speed and press Play]**

> When I press **Play**, the bee flies to every action. The trails show the colony **splitting between the minima**.

**[3:06 — Skip ▸ to the end, open the Progress tab]**

> The **Progress** tab shows the best answer getting closer to the true minimum, cycle by cycle.

**[3:17 — switch to the roulette wheel and step]**

> Onlookers can use the slides' rule, **r less than p**, or a **roulette wheel**, where better flowers get bigger
> slices. That's how good flowers attract more bees, which is the **positive feedback**.

### 3:40 · Quiz me
**[on screen]** Slide example again, and switch on **Quiz me**.

> **Quiz me** turns watching into learning.

**[3:44 — a quiz card appears; click "Stay at the old flower"]**

> Before each decision, the tool asks me what happens next. The new spot has less nectar, so the bee stays.
> And it's correct!

**[3:58 — next question; click "Move to the new spot"]**

> This time the new spot is better, so the bee moves. My score is kept at the top.

### 4:10 · Race
**[on screen]** Click **Race**, add "ABC, no scouts" under More options, then at 4:17 press **Race**.

> The **Race** page asks: does the teamwork really help?

> ABC and random guessing get **exactly the same number of tries** on Rastrigin's function. ABC gets **far closer**
> to the true minimum, and without scouts it gets stuck, which shows why scouts matter.

**[4:33 — Run 30 races]**

> Over **thirty races, ABC wins all thirty**.

### 4:42 · Outro
**[on screen]** Back to the Simulator.

> Hive Lab is open source on GitHub, with a README and **168 automated tests**, and it's live on GitHub Pages.
> Thanks for watching!

---

**Links for the video description and your submission**
- Live site: https://jamvi08.github.io/abc-hive-lab/
- GitHub: https://github.com/jamvi08/abc-hive-lab
