import { describe, expect, it } from "vitest";
import { compileExpression } from "../expr";

describe("custom expression compiler", () => {
  it("evaluates arithmetic with correct precedence", () => {
    expect(compileExpression("x1^2 + x2^2")([3, 4])).toBe(25);
    expect(compileExpression("-x1^2")([3, 0])).toBe(-9);
    expect(compileExpression("2^3^2")([0, 0])).toBe(512);
    expect(compileExpression("(x1 - 1)*(x2 + 2) / 2")([3, 0])).toBe(2);
  });
  it("supports functions and constants", () => {
    expect(compileExpression("sin(pi/2) + abs(-2) + max(1, x2)")([0, 5])).toBeCloseTo(8);
    expect(compileExpression("x*y")([2, 3])).toBe(6);
    expect(compileExpression("x1²")([3, 0])).toBe(9);
  });
  it("rejects unsafe or malformed input", () => {
    expect(() => compileExpression("alert(1)")).toThrow();
    expect(() => compileExpression("x1 +")).toThrow();
    expect(() => compileExpression("2x1")).toThrow(/\*/);
    expect(() => compileExpression("x3")).toThrow();
    expect(() => compileExpression("constructor")).toThrow();
  });
});
