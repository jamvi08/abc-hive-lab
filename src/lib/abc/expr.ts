/**
 * A tiny, safe math-expression compiler for user-defined objectives.
 * Supports: numbers, x1 x2 (aliases x y), pi, e, + - * / ^, parentheses and
 * sin cos tan exp log ln sqrt abs min max pow floor ceil.
 * No eval / new Function is used.
 */
import type { Vec } from "./types";

type Fn = (x: Vec) => number;

const FUNCS: Record<string, (...a: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  exp: Math.exp,
  log: Math.log,
  ln: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  floor: Math.floor,
  ceil: Math.ceil,
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Tok =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new Error(`Bad number near "${src.slice(i, i + 6)}"`);
      out.push({ t: "num", v: parseFloat(m[0]) });
      i += m[0].length;
      // implicit multiplication like 2x1 is not allowed: give a helpful message
      if (i < src.length && /[a-z(]/i.test(src[i])) {
        throw new Error(`Write "${m[0]}*${src[i]}…" — use * for multiplication`);
      }
      continue;
    }
    if (/[a-z_]/i.test(c)) {
      const m = /^[a-z_][a-z0-9_]*/i.exec(src.slice(i))!;
      out.push({ t: "id", v: m[0].toLowerCase() });
      i += m[0].length;
      continue;
    }
    if ("+-*/^(),".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "²") {
      out.push({ t: "op", v: "^" }, { t: "num", v: 2 });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${c}"`);
  }
  return out;
}

export function compileExpression(src: string): Fn {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(`Expected "${v}"`);
    p++;
  };

  function expr(): Fn {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = toks[p++].v;
      const a = left,
        b = term();
      left = op === "+" ? (x) => a(x) + b(x) : (x) => a(x) - b(x);
    }
    return left;
  }
  function term(): Fn {
    let left = unary();
    while (isOp("*") || isOp("/")) {
      const op = toks[p++].v;
      const a = left,
        b = unary();
      left = op === "*" ? (x) => a(x) * b(x) : (x) => a(x) / b(x);
    }
    return left;
  }
  function unary(): Fn {
    if (isOp("-")) {
      p++;
      const a = unary();
      return (x) => -a(x);
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    return power();
  }
  function power(): Fn {
    const base = atom();
    if (isOp("^")) {
      p++;
      const ex = unary(); // right-associative, and -x^2 = -(x^2)
      return (x) => Math.pow(base(x), ex(x));
    }
    return base;
  }
  function atom(): Fn {
    const t = peek();
    if (!t) throw new Error("Unexpected end of expression");
    if (t.t === "num") {
      p++;
      const v = t.v;
      return () => v;
    }
    if (t.t === "op" && t.v === "(") {
      p++;
      const e = expr();
      expect(")");
      return e;
    }
    if (t.t === "id") {
      p++;
      const name = t.v;
      if (isOp("(")) {
        const fn = FUNCS[name];
        if (!fn) throw new Error(`Unknown function "${name}"`);
        p++;
        const args: Fn[] = [];
        if (!isOp(")")) {
          args.push(expr());
          while (isOp(",")) {
            p++;
            args.push(expr());
          }
        }
        expect(")");
        return (x) => fn(...args.map((a) => a(x)));
      }
      if (name === "x1" || name === "x") return (x) => x[0];
      if (name === "x2" || name === "y") return (x) => x[1];
      if (name in CONSTS) {
        const v = CONSTS[name];
        return () => v;
      }
      throw new Error(`Unknown name "${name}" (use x1 and x2)`);
    }
    throw new Error(`Unexpected "${t.v}"`);
  }

  const fn = expr();
  if (p < toks.length) throw new Error(`Unexpected "${toks[p].v}"`);
  // smoke-test so that obviously broken input fails early
  const probe = fn([0.3, -0.7]);
  if (typeof probe !== "number") throw new Error("Expression did not produce a number");
  return fn;
}
