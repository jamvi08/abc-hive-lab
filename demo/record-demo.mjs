#!/usr/bin/env node
/**
 * Records the silent demo video that matches demo/SCRIPT.md, beat by beat.
 *
 *   npm run build && (cd out && python3 -m http.server 4173) &
 *   node demo/record-demo.mjs http://localhost:4173 demo/hive-lab-demo.mp4
 *
 * Needs: playwright (devDependency) + its chromium, and ffmpeg on PATH.
 * Frames come from Chrome's screencast (crisp, 2× DPR) and are piped to
 * ffmpeg at a constant 30 fps in real time, so the video timeline equals
 * wall-clock time and lines up with the narration timestamps.
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:4173").replace(/\/$/, "");
const OUT = process.argv[3] || "demo/hive-lab-demo.mp4";
const FPS = 30;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();

// ---- visible cursor + click ripple + no scrollbars -------------------------
await context.addInitScript(() => {
  const install = () => {
    if (document.getElementById("demo-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      ::-webkit-scrollbar{display:none}
      #demo-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
        transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
      .demo-ripple{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;
        border:3px solid #fbbf24;z-index:2147483646;pointer-events:none;animation:demo-r .55s ease-out forwards}
      @keyframes demo-r{from{transform:scale(.4);opacity:1}to{transform:scale(2.6);opacity:0}}`;
    document.head.appendChild(style);
    const c = document.createElement("div");
    c.id = "demo-cursor";
    c.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(c);
    const last = JSON.parse(sessionStorage.getItem("demo-cursor") || "[720,450]");
    c.style.transform = `translate(${last[0] - 3}px,${last[1] - 2}px)`;
    addEventListener("mousemove", (e) => {
      c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`;
      sessionStorage.setItem("demo-cursor", JSON.stringify([e.clientX, e.clientY]));
    }, true);
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      r.className = "demo-ripple";
      r.style.left = e.clientX + "px";
      r.style.top = e.clientY + "px";
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", install);
  else install();
});

// ---- helpers ---------------------------------------------------------------
let mouse = { x: 720, y: 450 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tid = (id) => page.locator(`[data-testid="${id}"]`).first();

async function glide(x, y, ms = 650) {
  const steps = Math.max(8, Math.round(ms / 16));
  const sx = mouse.x, sy = mouse.y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(ms / steps);
  }
  mouse = { x, y };
}

async function point(loc, { dx = 0.5, dy = 0.5, ms } = {}) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  if (!b) throw new Error("element not visible");
  await glide(b.x + b.width * dx, b.y + b.height * dy, ms);
}

async function click(loc, opts = {}) {
  await point(loc, opts);
  await sleep(120);
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
  await sleep(250);
}

const clickId = (id, opts) => click(tid(id), opts);
const clickText = (text, opts) => click(page.getByRole("link", { name: text, exact: true }).first(), opts);

async function smoothScroll(y, ms = 900) {
  await page.evaluate(
    ([y, ms]) =>
      new Promise((res) => {
        const s = scrollY, t0 = performance.now();
        const f = (now) => {
          const t = Math.min(1, (now - t0) / ms);
          scrollTo(0, s + (y - s) * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
          if (t < 1) requestAnimationFrame(f);
          else res();
        };
        requestAnimationFrame(f);
      }),
    [y, ms],
  );
}

async function scrollToEl(loc, offset = 90, ms = 900) {
  const y = await loc.evaluate((el, off) => el.getBoundingClientRect().top + scrollY - off, offset);
  await smoothScroll(Math.max(0, y), ms);
}

// ---- recording -------------------------------------------------------------
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.mouse.move(mouse.x, mouse.y);
await sleep(800);

const cdp = await context.newCDPSession(page);
let latest = null;
cdp.on("Page.screencastFrame", (f) => {
  latest = Buffer.from(f.data, "base64");
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1200 });
while (!latest) await sleep(20);

const ff = spawn(
  "ffmpeg",
  ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
   "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT],
  { stdio: ["pipe", "inherit", "inherit"] },
);
const t0 = Date.now();
let written = 0;
const pump = setInterval(() => {
  const due = Math.floor(((Date.now() - t0) / 1000) * FPS);
  while (written < due) {
    ff.stdin.write(latest);
    written++;
  }
}, 1000 / FPS / 2);

const now = () => (Date.now() - t0) / 1000;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const mark = (label) => console.log(`   ${fmt(now())}  · ${label}`);
async function scene(name, until, fn) {
  const start = now();
  await fn();
  const end = now();
  if (end > until) console.warn(`⚠ ${name} overran: ${end.toFixed(1)}s > ${until}s`);
  else await sleep((until - end) * 1000);
  console.log(`${fmt(start)}–${fmt(Math.max(end, until))}  ${name}`);
}

// Scene timings must match demo/SCRIPT.md
await scene("1 · Intro", 22, async () => {
  await sleep(2500);
  await glide(600, 470, 1400);
  await sleep(1500);
  await glide(1150, 330, 1400);
  await sleep(2000);
  await glide(160, 500, 1400);
});

await scene("2 · Learn page", 45, async () => {
  await clickText("Learn ABC");
  await sleep(2500);
  await glide(700, 480, 900);
  await sleep(2500);
  await smoothScroll(560, 1600);
  await sleep(4500);
  await smoothScroll(1000, 1600);
  await sleep(4500);
});

await scene("3 · Textbook example, step by step", 130, async () => {
  await clickText("Simulator");
  await sleep(1200);
  await clickId("mode-textbook");
  await sleep(5000);
  mark("Step: employed bee 1");
  await clickId("step"); // employed bee 1: 7.67 → clipped to 5
  await glide(1150, 600, 1200);
  await sleep(4500);
  await glide(1150, 790, 1000);
  await sleep(7500);
  mark("Step: greedy selection");
  await clickId("step"); // greedy: rejected, t1 = 1
  await sleep(8000);
  mark("Phase: probabilities / dance");
  await clickId("next-phase"); // → probabilities
  await glide(1150, 520, 900);
  await sleep(9500);
  mark("Step: onlooker 1 recruited");
  await clickId("step"); // onlooker 1 recruited (r = 0.39 < 0.729)
  await sleep(9000);
  mark("Phase: scout check");
  await clickId("next-phase"); // → scout check
  await sleep(4500);
  mark("Step: scout replaces source 5");
  await clickId("step"); // scout replaces source 5
  await glide(1150, 560, 900);
  await sleep(9500);
  mark("Slide view");
  await scrollToEl(tid("view-matrix"), 160);
  await clickId("view-matrix");
  await sleep(6500);
  await clickId("view-table");
  await smoothScroll(0, 700);
});

await scene("4 · Textbook check page", 156, async () => {
  await clickText("Textbook Check");
  await sleep(2500);
  mark("Run the textbook check");
  await clickId("run-check");
  await sleep(4500);
  await smoothScroll(700, 1800);
  await sleep(4000);
  await smoothScroll(1820, 1800);
  await sleep(3500);
  await smoothScroll(4300, 2200);
  await sleep(2500);
});

await scene("5 · Free run: problems, parameters, play, wheel", 214, async () => {
  await clickText("Simulator");
  await sleep(1500);
  await point(tid("problem"));
  await page.selectOption('[data-testid="problem"]', "himmelblau");
  await sleep(2500);
  await point(tid("colony"), { dx: 0.45 });
  await sleep(1200);
  await point(tid("cycles"), { dx: 0.25 });
  await sleep(1200);
  await clickId("sel-sweep");
  await sleep(800);
  await clickId("trails");
  await smoothScroll(0, 600);
  await clickId("speed", { dx: 0.93 }); // ~30 steps/s
  mark("Play");
  await clickId("play");
  await glide(700, 520, 1500);
  await sleep(8000);
  mark("End + convergence chart");
  await clickId("to-end");
  await sleep(2500);
  await scrollToEl(page.getByText("Error of best-so-far").first(), 300, 1200);
  await sleep(4000);
  await smoothScroll(0, 800);
  mark("Roulette wheel");
  await clickId("sel-roulette");
  await clickId("next-phase");
  await clickId("next-phase");
  await clickId("step");
  await scrollToEl(page.getByText("Onlooker selection: roulette wheel").first(), 380, 900);
  await sleep(1500);
  await clickId("step");
  await clickId("step");
  await sleep(1500);
  await clickId("step");
  await clickId("step");
  await clickId("step");
  await sleep(2000);
});

await scene("6 · Quiz mode", 246, async () => {
  await smoothScroll(0, 600);
  await clickId("mode-textbook");
  await sleep(600);
  await clickId("quiz-toggle");
  await smoothScroll(0, 700);
  await clickId("step");
  await sleep(1200);
  mark("Quiz question 1");
  await clickId("step"); // quiz: greedy selection for bee 1
  await sleep(4500);
  await clickId("quiz-stay");
  await sleep(5000);
  await clickId("step");
  await sleep(800);
  mark("Quiz question 2");
  await clickId("step"); // quiz: greedy selection for bee 2
  await sleep(3500);
  await clickId("quiz-move");
  await sleep(4500);
});

await scene("7 · ABC vs random search race", 282, async () => {
  await clickText("ABC vs Random Race");
  await sleep(2000);
  await clickId("lane-noScout");
  await sleep(1000);
  mark("Race");
  await clickId("race-play");
  await sleep(9500);
  await scrollToEl(page.getByText("Error of best-so-far vs function evaluations").first(), 100, 1400);
  await sleep(5000);
  mark("Run 30 races");
  await clickId("race-stats");
  await scrollToEl(tid("race-verdict"), 420, 1200);
  await sleep(6000);
});

await scene("8 · Outro", 295, async () => {
  await clickText("Simulator");
  await sleep(1000);
  await glide(700, 450, 1500);
  await sleep(6000);
});

clearInterval(pump);
await cdp.send("Page.stopScreencast");
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(`Saved ${OUT} (${fmt(now())}, ${written} frames)`);
