import { describe, it, expect } from "vitest";
import { totalVariation } from "./arena";
import type { Distribution, DistributionPoint } from "./types";

// totalVariation only reads `.points`, so a minimal cast keeps the test focused.
function makeDist(densities: number[], grid: number[]): Distribution {
  const points: DistributionPoint[] = grid.map((price, i) => ({
    price,
    density: densities[i],
    cdf: 0,
  }));
  return { points } as unknown as Distribution;
}

describe("totalVariation (Arena disagreement metric)", () => {
  const grid = Array.from({ length: 101 }, (_, i) => 50 + i); // 50..150, dx = 1

  const normal = (mu: number, sigma: number) =>
    grid.map((x) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI)));

  it("is zero for identical densities", () => {
    const d = makeDist(normal(100, 10), grid);
    expect(totalVariation(d, d)).toBeLessThan(1e-9);
  });

  it("grows as the densities separate and stays within [0, 1]", () => {
    const base = makeDist(normal(100, 10), grid);
    const near = makeDist(normal(103, 10), grid);
    const far = makeDist(normal(120, 8), grid);
    const tvNear = totalVariation(base, near);
    const tvFar = totalVariation(base, far);
    expect(tvNear).toBeGreaterThan(0);
    expect(tvFar).toBeGreaterThan(tvNear);
    expect(tvFar).toBeLessThanOrEqual(1);
  });

  it("is ~1 for non-overlapping densities", () => {
    const a = makeDist(normal(60, 3), grid);
    const b = makeDist(normal(140, 3), grid);
    expect(totalVariation(a, b)).toBeGreaterThan(0.95);
  });
});
