import { compileExpression } from "./expr";
import type { Problem, Vec } from "./types";

const TAU = Math.PI * 2;

export const PROBLEMS: Problem[] = [
  {
    id: "sphere",
    name: "Sphere (slide example)",
    tex: String.raw`f(x)=x_1^2+x_2^2`,
    blurb: "One smooth bowl. The minimum is f = 0 at (0, 0). This is the problem solved on the slides.",
    f: (x) => x[0] * x[0] + x[1] * x[1],
    lb: [-5, -5],
    ub: [5, 5],
    optimum: { xs: [[0, 0]], f: 0 },
  },
  {
    id: "himmelblau",
    name: "Himmelblau",
    tex: String.raw`f(x)=(x_1^2+x_2-11)^2+(x_1+x_2^2-7)^2`,
    blurb: "Four equally good minima (f = 0). Watch the colony split between them.",
    f: (x) => (x[0] ** 2 + x[1] - 11) ** 2 + (x[0] + x[1] ** 2 - 7) ** 2,
    lb: [-5, -5],
    ub: [5, 5],
    optimum: {
      xs: [
        [3, 2],
        [-2.805118, 3.131312],
        [-3.77931, -3.283186],
        [3.584428, -1.848126],
      ],
      f: 0,
    },
  },
  {
    id: "rastrigin",
    name: "Rastrigin",
    tex: String.raw`f(x)=20+\sum_{i=1}^{2}\left(x_i^2-10\cos 2\pi x_i\right)`,
    blurb: "An egg-crate with many local traps. Scout bees help the colony escape them.",
    f: (x) => 20 + x[0] ** 2 - 10 * Math.cos(TAU * x[0]) + x[1] ** 2 - 10 * Math.cos(TAU * x[1]),
    lb: [-5.12, -5.12],
    ub: [5.12, 5.12],
    optimum: { xs: [[0, 0]], f: 0 },
  },
  {
    id: "rosenbrock",
    name: "Rosenbrock (banana)",
    tex: String.raw`f(x)=(1-x_1)^2+100\,(x_2-x_1^2)^2`,
    blurb: "A long, curved, flat valley. Finding the valley is easy; reaching its bottom is slow.",
    f: (x) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2,
    lb: [-2, -1],
    ub: [2, 3],
    optimum: { xs: [[1, 1]], f: 0 },
  },
  {
    id: "ackley",
    name: "Ackley",
    tex: String.raw`f(x)=-20e^{-0.2\sqrt{\frac{x_1^2+x_2^2}{2}}}-e^{\frac{\cos 2\pi x_1+\cos 2\pi x_2}{2}}+e+20`,
    blurb: "A nearly flat plate full of small bumps, with one deep hole in the middle.",
    f: (x) =>
      -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (x[0] ** 2 + x[1] ** 2))) -
      Math.exp(0.5 * (Math.cos(TAU * x[0]) + Math.cos(TAU * x[1]))) +
      Math.E +
      20,
    lb: [-5, -5],
    ub: [5, 5],
    optimum: { xs: [[0, 0]], f: 0 },
  },
  {
    id: "camel",
    name: "Six-Hump Camel (f < 0)",
    tex: String.raw`f(x)=\left(4-2.1x_1^2+\tfrac{x_1^4}{3}\right)x_1^2+x_1x_2+(-4+4x_2^2)\,x_2^2`,
    blurb: "Goes below zero (min ≈ −1.0316), so the fitness uses the second rule: fit = 1 + |f|.",
    f: (x) => {
      const a = x[0],
        b = x[1];
      return (4 - 2.1 * a * a + (a ** 4) / 3) * a * a + a * b + (-4 + 4 * b * b) * b * b;
    },
    lb: [-3, -2],
    ub: [3, 2],
    optimum: {
      xs: [
        [0.0898, -0.7126],
        [-0.0898, 0.7126],
      ],
      f: -1.031628,
    },
  },
];

export function getProblem(id: string): Problem {
  return PROBLEMS.find((p) => p.id === id) ?? PROBLEMS[0];
}

export function makeCustomProblem(expr: string, lb: Vec, ub: Vec): Problem {
  const f = compileExpression(expr);
  return {
    id: "custom",
    name: "Custom function",
    tex: `f(x)=\\texttt{${expr.replace(/[\\{}#$%&_^~]/g, (c) => "\\" + c)}}`,
    blurb: "Your own objective, minimised over the bounds you chose.",
    f,
    lb,
    ub,
  };
}

/** Fitness for minimisation problems (slide 10). */
export function fitness(fx: number): number {
  return fx >= 0 ? 1 / (1 + fx) : 1 + Math.abs(fx);
}
