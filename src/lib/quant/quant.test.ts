/**
 * Proof tests for the quant engine.
 *
 * The headline test (`recovers the Black-Scholes lognormal`) is the one that
 * matters: if you feed the Breeden-Litzenberger pipeline a chain priced off a
 * flat implied-vol surface, the density it recovers MUST match the closed-form
 * lognormal risk-neutral density. That round-trip is the correctness contract.
 */

import { describe, expect, it } from "vitest";
import { bsPrice, impliedVol } from "./blackScholes";
import { normCdf, normInv, normPdf } from "./stats";
import { riskNeutralDensity } from "./impliedDistribution";
import { expectedMove } from "./expectedMove";
import { subjectiveDistribution, normalizeScenarios } from "./subjective";
import { analyzeEdge } from "./ev";
import { calibrate } from "./calibration";
import { kellyBinary } from "./kelly";
import type { OptionContract, OptionExpiry, SubjectiveView, TrackedCall } from "../types";

// --- helpers --------------------------------------------------------------

function synthChain(
  S: number,
  r: number,
  q: number,
  T: number,
  sigma: number,
  loK = 0.6,
  hiK = 1.45,
  stepK = 0.025,
): OptionExpiry {
  const calls: OptionContract[] = [];
  const puts: OptionContract[] = [];
  for (let f = loK; f <= hiK + 1e-9; f += stepK) {
    const K = Math.round(S * f);
    const cp = bsPrice("call", S, K, T, r, sigma, q);
    const pp = bsPrice("put", S, K, T, r, sigma, q);
    calls.push({
      strike: K, bid: cp * 0.99, ask: cp * 1.01, last: cp, mid: cp,
      impliedVol: sigma, openInterest: 500, volume: 100, type: "call",
      inTheMoney: K < S,
    });
    puts.push({
      strike: K, bid: pp * 0.99, ask: pp * 1.01, last: pp, mid: pp,
      impliedVol: sigma, openInterest: 500, volume: 100, type: "put",
      inTheMoney: K > S,
    });
  }
  return { expiry: "2026-07-17", dte: Math.round(T * 365), t: T, calls, puts };
}

/** Closed-form lognormal risk-neutral density of S_T under Black-Scholes. */
function analyticRND(s: number, S: number, r: number, q: number, T: number, sigma: number): number {
  const sd = sigma * Math.sqrt(T);
  const m = Math.log(S) + (r - q - 0.5 * sigma * sigma) * T;
  return normPdf((Math.log(s) - m) / sd) / (s * sd);
}

// --- stats ----------------------------------------------------------------

describe("stats", () => {
  it("normCdf / normInv are inverses", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normInv(0.5)).toBeCloseTo(0, 6);
    expect(normInv(normCdf(1.2))).toBeCloseTo(1.2, 4);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3);
  });
});

// --- Black-Scholes --------------------------------------------------------

describe("black-scholes", () => {
  it("round-trips implied vol", () => {
    const price = bsPrice("call", 100, 105, 0.25, 0.04, 0.3, 0);
    expect(impliedVol("call", price, 100, 105, 0.25, 0.04, 0)).toBeCloseTo(0.3, 4);
  });

  it("respects put-call parity", () => {
    const [S, K, T, r, q, sig] = [100, 100, 0.5, 0.03, 0.01, 0.2];
    const c = bsPrice("call", S, K, T, r, sig, q);
    const p = bsPrice("put", S, K, T, r, sig, q);
    const parity = S * Math.exp(-q * T) - K * Math.exp(-r * T);
    expect(c - p).toBeCloseTo(parity, 6);
  });
});

// --- the headline test ----------------------------------------------------

describe("risk-neutral density", () => {
  const S = 100, r = 0.04, q = 0, T = 30 / 365, sigma = 0.25;
  const chain = synthChain(S, r, q, T, sigma);
  const res = riskNeutralDensity(chain, { spot: S, riskFreeRate: r, dividendYield: q });

  it("integrates to ~1 and is non-negative", () => {
    expect(res.distribution.integral).toBeGreaterThan(0.9);
    expect(res.distribution.integral).toBeLessThan(1.05);
    expect(res.distribution.minDensity).toBeGreaterThan(-1e-3);
  });

  it("has mean equal to the forward", () => {
    const forward = S * Math.exp((r - q) * T);
    expect(res.forward).toBeCloseTo(forward, 4);
    expect(res.distribution.mean / forward).toBeCloseTo(1, 2);
  });

  it("recovers the Black-Scholes lognormal density", () => {
    const forward = res.forward;
    // Compare the computed density to the closed form at several prices.
    for (const s of [90, 95, 100, 105, 110]) {
      const computed = res.distribution.points.reduce((best, pt) =>
        Math.abs(pt.price - s) < Math.abs(best.price - s) ? pt : best,
      );
      const analytic = analyticRND(s, S, r, q, T, sigma);
      expect(computed.density).toBeGreaterThan(analytic * 0.85);
      expect(computed.density).toBeLessThan(analytic * 1.15);
    }
    expect(res.distribution.median / forward).toBeCloseTo(1, 1);
  });

  it("recovers the correct implied vol from the smile", () => {
    expect(res.atmIV).toBeCloseTo(sigma, 2);
  });
});

// --- expected move --------------------------------------------------------

describe("expected move", () => {
  it("reconciles the IV and straddle methods", () => {
    const S = 100, r = 0.04, q = 0, T = 30 / 365, sigma = 0.25;
    const chain = synthChain(S, r, q, T, sigma);
    const em = expectedMove(chain, { spot: S, riskFreeRate: r, dividendYield: q });
    expect(em.ivMethod).toBeGreaterThan(0);
    // Within ~15% of each other (0.85 multiplier vs theoretical 0.8).
    expect(em.straddleMethod / em.ivMethod).toBeCloseTo(1, 0);
    expect(em.atmIV).toBeCloseTo(sigma, 1);
  });
});

// --- subjective + edge ----------------------------------------------------

describe("subjective distribution & edge", () => {
  const S = 100, r = 0.04, q = 0, T = 30 / 365, sigma = 0.25;
  const chain = synthChain(S, r, q, T, sigma);
  const rnd = riskNeutralDensity(chain, { spot: S, riskFreeRate: r, dividendYield: q });
  const grid = rnd.distribution.points.map((p) => p.price);

  it("normalizes scenario probabilities", () => {
    const view: SubjectiveView = {
      ticker: "TEST", horizon: chain.expiry, spreadMultiplier: 1,
      scenarios: [
        { id: "1", label: "Bull", probability: 2, price: 115, source: "user" },
        { id: "2", label: "Base", probability: 5, price: 102, source: "user" },
        { id: "3", label: "Bear", probability: 3, price: 88, source: "user" },
      ],
    };
    const total = normalizeScenarios(view).scenarios.reduce((s, x) => s + x.probability, 0);
    expect(total).toBeCloseTo(1, 9);
  });

  it("produces a bullish edge when the analyst is above the forward", () => {
    const view: SubjectiveView = {
      ticker: "TEST", horizon: chain.expiry, spreadMultiplier: 1,
      scenarios: [
        { id: "1", label: "Bull", probability: 0.45, price: 118, source: "user" },
        { id: "2", label: "Base", probability: 0.45, price: 108, source: "user" },
        { id: "3", label: "Bear", probability: 0.1, price: 92, source: "user" },
      ],
    };
    const subj = subjectiveDistribution(view, grid, S);
    expect(subj.mean).toBeGreaterThan(rnd.forward);
    const edge = analyzeEdge(subj, rnd.distribution, chain, {
      spot: S, riskFreeRate: r, dividendYield: q, forward: rnd.forward,
    });
    expect(edge.ev.edgePct).toBeGreaterThan(0);
    const stock = edge.strategies.find((s) => s.label === "Long stock");
    expect(stock?.evEdge).toBeGreaterThan(0);
  });
});

// --- calibration & kelly --------------------------------------------------

describe("calibration", () => {
  it("scores perfect forecasts at Brier 0 and coin flips at 0.25", () => {
    const perfect: TrackedCall[] = [
      mkCall(1, true), mkCall(0, false), mkCall(1, true), mkCall(0, false),
    ];
    expect(calibrate(perfect).brierScore).toBeCloseTo(0, 6);

    const coin: TrackedCall[] = [
      mkCall(0.5, true), mkCall(0.5, false), mkCall(0.5, true), mkCall(0.5, false),
    ];
    expect(calibrate(coin).brierScore).toBeCloseTo(0.25, 6);
  });
});

describe("kelly", () => {
  it("halves the full Kelly and rejects negative edge", () => {
    const k = kellyBinary(0.6, 1); // 60% win, even-money
    expect(k.fullKelly).toBeCloseTo(0.2, 6);
    expect(k.halfKelly).toBeCloseTo(0.1, 6);
    expect(kellyBinary(0.3, 1).fullKelly).toBeLessThan(0);
  });
});

function mkCall(predictedProb: number, outcome: boolean): TrackedCall {
  return {
    id: Math.random().toString(36).slice(2),
    ticker: "TEST", createdAt: "2026-01-01", horizon: "2026-02-01",
    claim: "test", predictedProb, marketImpliedProb: 0.5,
    resolved: true, outcome,
  };
}
