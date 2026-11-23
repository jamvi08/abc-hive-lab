/** Number formatting shared by the UI and the explanations. */

const MINUS = "−";

/** Up to `dp` decimals, trailing zeros trimmed, unicode minus, scientific for tiny/huge values. */
export function fmt(n: number, dp = 3): string {
  if (Number.isNaN(n)) return "NaN";
  if (!Number.isFinite(n)) return n > 0 ? "∞" : `${MINUS}∞`;
  const a = Math.abs(n);
  if (a !== 0 && (a < Math.pow(10, -dp) || a >= 1e6)) {
    const [m, e] = n.toExponential(2).split("e");
    return `${m.replace("-", MINUS)}e${e.replace("+", "")}`;
  }
  let s = parseFloat(n.toFixed(dp)).toString();
  if (s === "-0") s = "0";
  return s.replace("-", MINUS);
}

/** Wrap negatives in parentheses for use after an operator: 2 − (−5) */
export function par(n: number, dp = 3): string {
  const s = fmt(n, dp);
  return n < 0 && s !== "0" ? `(${s})` : s;
}

/** TeX-safe number: scientific notation as ×10^{k} */
export function tnum(n: number, dp = 3): string {
  const s = fmt(n, dp);
  const m = /^(.+)e(.+)$/.exec(s);
  const out = m ? `${m[1]}\\times10^{${m[2]}}` : s;
  return out.replaceAll(MINUS, "-");
}

export function tpar(n: number, dp = 3): string {
  const s = tnum(n, dp);
  return n < 0 && s !== "0" ? `(${s})` : s;
}

export function vecStr(v: number[], dp = 3): string {
  return `(${v.map((x) => fmt(x, dp)).join(", ")})`;
}

export function tvec(v: number[], dp = 3): string {
  return `(${v.map((x) => tnum(x, dp)).join(",\\ ")})`;
}

/** 1-based subscript helper for plain text */
export function sub(n: number): string {
  return String(n)
    .split("")
    .map((c) => "₀₁₂₃₄₅₆₇₈₉"[+c] ?? c)
    .join("");
}

/** superscript helper (sources are written X¹, X⁴ … as on the slides) */
export function sup(n: number): string {
  return String(n)
    .split("")
    .map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+c] ?? c)
    .join("");
}
