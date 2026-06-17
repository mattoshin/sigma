/**
 * Position sizing via the Kelly criterion.
 *
 * We always surface HALF-Kelly, not full. That isn't timidity: full Kelly is
 * optimal only if your probabilities are exactly right, and they never are.
 * Fractional Kelly absorbs estimation error and is what disciplined desks
 * actually use, presenting it signals you understand parameter risk, not just
 * the textbook formula. f* < 0 means the bet is negative-EV: don't bet.
 */

import { clamp } from "./stats";
import type { KellyResult } from "../types";

/**
 * Discrete (binary) Kelly: f* = (b·p − q) / b
 *   p = probability of winning, q = 1 − p, b = net payoff odds (reward/risk).
 */
export function kellyBinary(winProb: number, payoffOdds: number): KellyResult {
  const p = clamp(winProb, 0, 1);
  const q = 1 - p;
  const b = payoffOdds;
  const edge = b * p - q;
  const fullKelly = b > 0 ? edge / b : 0;

  let note: string;
  if (!(b > 0)) {
    note = "Non-positive payoff odds, not a bettable structure.";
  } else if (fullKelly <= 0) {
    note = "Negative-EV under your view at this price. Don't press it.";
  } else {
    note = `Half-Kelly stake. Full Kelly would be ${(fullKelly * 100).toFixed(1)}% of bankroll; we halve it to absorb estimation error.`;
  }

  return {
    fullKelly,
    halfKelly: fullKelly / 2,
    edge,
    winProb: p,
    payoffOdds: b,
    note,
  };
}

/**
 * Continuous Kelly for a directional equity bet: f* = (μ − r) / σ².
 * μ = expected return, r = risk-free, σ = volatility (all over the same horizon).
 */
export function kellyContinuous(mu: number, r: number, sigma: number): number {
  if (sigma <= 0) return 0;
  return (mu - r) / (sigma * sigma);
}
