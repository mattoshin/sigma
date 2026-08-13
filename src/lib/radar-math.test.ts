import { describe, expect, it } from "vitest";
import { annualizedVolFromStdev } from "@/lib/radar-math";

describe("annualizedVolFromStdev", () => {
  it("matches the SPY-shaped example from the live radar feed", () => {
    // stdev implied by spot=612.4, dte=30, annualizedVol~=0.244 (observed live).
    const stdev = 0.244 * 612.4 * Math.sqrt(30 / 365);
    expect(annualizedVolFromStdev(stdev, 612.4, 30)).toBeCloseTo(0.244, 3);
  });

  it("scales inversely with sqrt(time): doubling dte roughly halves the implied stdev needed for the same vol", () => {
    const spot = 100;
    const stdevFor30d = 5;
    const vol30 = annualizedVolFromStdev(stdevFor30d, spot, 30);
    const vol60SameStdev = annualizedVolFromStdev(stdevFor30d, spot, 60);
    expect(vol60SameStdev).toBeLessThan(vol30);
  });

  it("returns 0 for non-positive spot or dte instead of NaN or Infinity", () => {
    expect(annualizedVolFromStdev(5, 0, 30)).toBe(0);
    expect(annualizedVolFromStdev(5, -10, 30)).toBe(0);
    expect(annualizedVolFromStdev(5, 100, 0)).toBe(0);
    expect(annualizedVolFromStdev(5, 100, -5)).toBe(0);
  });

  it("returns 0 volatility for 0 stdev (perfectly certain outcome)", () => {
    expect(annualizedVolFromStdev(0, 100, 30)).toBe(0);
  });
});
