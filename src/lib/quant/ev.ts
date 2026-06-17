/**
 * Expected value & edge, every screen ends here.
 *
 * The product's whole thesis: replace "price target = $X" with
 *   EV = ∫ payoff(S_T) · f_subjective(S_T) dS_T
 * and define EDGE as where the analyst's subjective density disagrees with the
 * options-implied (risk-neutral) density. We then express that edge as concrete
 * trades, long stock, ATM/OTM calls, puts, pricing each structure's expected
 * payoff under the subjective density against its actual market cost.
 *
 * Discounting note: option market prices are present values, so we discount the
 * subjective expected payoff by e^{-rT} before comparing to cost. The forward is
 * the risk-neutral expected terminal price; comparing the subjective mean to the
 * forward (not to spot) is the apples-to-apples edge for a delta-one view.
 */

import { trapz } from "./stats";
import { kellyBinary } from "./kelly";
import type {
  Distribution,
  EdgeAnalysis,
  EVResult,
  OptionContract,
  OptionExpiry,
  StrategyEV,
} from "../types";

export interface EdgeParams {
  spot: number;
  riskFreeRate: number;
  dividendYield: number;
  forward: number; // from the RND result
}

function midOf(c: OptionContract): number {
  if (c.mid > 0) return c.mid;
  if (c.bid > 0 && c.ask > 0) return (c.bid + c.ask) / 2;
  return c.last;
}

function nearestContract(
  items: OptionContract[],
  target: number,
): OptionContract | undefined {
  let best: OptionContract | undefined;
  let bestDist = Infinity;
  for (const it of items) {
    const d = Math.abs(it.strike - target);
    if (d < bestDist && midOf(it) > 0) {
      bestDist = d;
      best = it;
    }
  }
  return best;
}

/** ∫ payoff(price) · density dprice over the distribution grid. */
function expectedUnder(dist: Distribution, payoff: (price: number) => number): number {
  const xs = dist.points.map((p) => p.price);
  const ys = dist.points.map((p) => payoff(p.price) * p.density);
  return trapz(xs, ys);
}

/** P(condition) under the distribution = mass where the predicate holds. */
function probUnder(dist: Distribution, pred: (price: number) => boolean): number {
  const xs = dist.points.map((p) => p.price);
  const ys = dist.points.map((p) => (pred(p.price) ? p.density : 0));
  return trapz(xs, ys);
}

function buildStrategy(
  label: string,
  marketPrice: number,
  payoff: (price: number) => number,
  breakeven: number,
  popPred: (price: number) => boolean,
  subjective: Distribution,
  discount: number,
): StrategyEV {
  const evPayoff = discount * expectedUnder(subjective, payoff);
  const evEdge = evPayoff - marketPrice;
  return {
    label,
    marketPrice,
    evUnderSubjective: evPayoff,
    evEdge,
    evEdgePct: marketPrice > 0 ? evEdge / marketPrice : 0,
    breakeven,
    pop: probUnder(subjective, popPred),
  };
}

export function analyzeEdge(
  subjective: Distribution,
  rnd: Distribution,
  expiry: OptionExpiry,
  params: EdgeParams,
): EdgeAnalysis {
  const { spot, riskFreeRate: r, forward } = params;
  const T = expiry.t;
  const discount = Math.exp(-r * T);

  const expectedPrice = subjective.mean;
  const ev: EVResult = {
    expectedPrice,
    expectedReturnPct: (expectedPrice - spot) / spot,
    forward,
    edgePct: (expectedPrice - forward) / forward,
  };

  const strategies: StrategyEV[] = [];

  // Long stock, the delta-one expression of the view.
  strategies.push({
    label: "Long stock",
    marketPrice: spot,
    evUnderSubjective: expectedPrice,
    evEdge: expectedPrice - forward,
    evEdgePct: (expectedPrice - forward) / spot,
    breakeven: forward,
    pop: probUnder(subjective, (p) => p > forward),
  });

  // Long ATM call.
  const atmCall = nearestContract(expiry.calls, forward);
  if (atmCall) {
    const K = atmCall.strike;
    const cost = midOf(atmCall);
    strategies.push(
      buildStrategy(
        `Long ${expiry.dte}D ${K} call (ATM)`,
        cost,
        (price) => Math.max(price - K, 0),
        K + cost / discount,
        (price) => price > K + cost / discount,
        subjective,
        discount,
      ),
    );
  }

  // Long ~5% OTM call, the convex, lottery-ticket expression.
  const otmCall = nearestContract(expiry.calls, forward * 1.05);
  if (otmCall && otmCall.strike !== atmCall?.strike) {
    const K = otmCall.strike;
    const cost = midOf(otmCall);
    strategies.push(
      buildStrategy(
        `Long ${expiry.dte}D ${K} call (OTM)`,
        cost,
        (price) => Math.max(price - K, 0),
        K + cost / discount,
        (price) => price > K + cost / discount,
        subjective,
        discount,
      ),
    );
  }

  // Long ATM put, the downside expression.
  const atmPut = nearestContract(expiry.puts, forward);
  if (atmPut) {
    const K = atmPut.strike;
    const cost = midOf(atmPut);
    strategies.push(
      buildStrategy(
        `Long ${expiry.dte}D ${K} put (ATM)`,
        cost,
        (price) => Math.max(K - price, 0),
        K - cost / discount,
        (price) => price < K - cost / discount,
        subjective,
        discount,
      ),
    );
  }

  // Kelly sizing on the best positive-edge defined-risk structure (an option,
  // where you can lose 100% of premium). We frame it as a binary bet: win prob
  // = probability of profit, payoff odds = expected net win when ITM / premium.
  const optionStrats = strategies.filter((s) => s.label !== "Long stock" && s.marketPrice > 0);
  const best = optionStrats
    .filter((s) => (s.evEdge ?? 0) > 0)
    .sort((a, b) => (b.evEdge ?? 0) - (a.evEdge ?? 0))[0];

  let kelly = kellyBinary(0, 0);
  if (best) {
    const p = best.pop ?? 0;
    // Net payoff odds: expected payoff per dollar of premium, minus the dollar.
    const b = best.marketPrice > 0 ? best.evUnderSubjective / best.marketPrice - 1 : 0;
    kelly = kellyBinary(p, b);
    kelly.note = `${best.label}: ${kelly.note}`;
  } else {
    kelly.note = "No positive-edge defined-risk structure under your current view.";
  }

  // Downsample the "odds at every price" reads for the trade card.
  const step = Math.max(1, Math.floor(rnd.points.length / 25));
  const marketProbAbove = rnd.points
    .filter((_, i) => i % step === 0)
    .map((p) => ({ price: p.price, prob: 1 - p.cdf }));
  const subjectiveProbAbove = subjective.points
    .filter((_, i) => i % step === 0)
    .map((p) => ({ price: p.price, prob: 1 - p.cdf }));

  return {
    ticker: expiry.expiry, // overwritten by caller
    horizon: expiry.expiry,
    ev,
    strategies,
    kelly,
    marketProbAbove,
    subjectiveProbAbove,
  };
}

/**
 * The shaded "divergence" between the two densities, ready to plot: for each
 * shared grid price, the subjective density minus the risk-neutral density.
 * Positive regions are where you assign more probability than the market.
 */
export function divergence(
  subjective: Distribution,
  rnd: Distribution,
): { price: number; subjective: number; riskNeutral: number; diff: number }[] {
  const n = Math.min(subjective.points.length, rnd.points.length);
  const out: { price: number; subjective: number; riskNeutral: number; diff: number }[] = [];
  for (let i = 0; i < n; i++) {
    const s = subjective.points[i];
    const q = rnd.points[i];
    out.push({
      price: s.price,
      subjective: s.density,
      riskNeutral: q.density,
      diff: s.density - q.density,
    });
  }
  return out;
}
