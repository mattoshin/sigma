/**
 * Client-side edge computation. Pure functions (no node/server deps) so the
 * analyst can drag scenario sliders and watch the subjective distribution, the
 * divergence, the EV, and the Kelly size update instantly without a round trip.
 */

import { subjectiveDistribution } from "@/lib/quant/subjective";
import { analyzeEdge, divergence } from "@/lib/quant/ev";
import type { AnalystConsensus, Distribution, EdgeAnalysis, Scenario, SubjectiveView } from "@/lib/types";
import type { ExpiryAnalysis } from "@/lib/analysis";

export interface EdgeBundle {
  subjective: Distribution;
  edge: EdgeAnalysis;
  divergence: { price: number; subjective: number; riskNeutral: number; diff: number }[];
}

export function computeEdge(
  view: SubjectiveView,
  expiry: ExpiryAnalysis,
  spot: number,
  riskFreeRate: number,
  dividendYield: number,
): EdgeBundle {
  const grid = expiry.rnd.points.map((p) => p.price);
  const subjective = subjectiveDistribution(view, grid, spot);
  const edge = analyzeEdge(subjective, expiry.rnd, expiry.expiryChain, {
    spot,
    riskFreeRate,
    dividendYield,
    forward: expiry.forward,
  });
  edge.ticker = view.ticker;
  edge.horizon = expiry.expiry;
  return { subjective, edge, divergence: divergence(subjective, expiry.rnd) };
}

let scenarioSeq = 0;
function sid(): string {
  scenarioSeq += 1;
  return `s${scenarioSeq}`;
}

/**
 * Seed a sensible 3-scenario view from the expected move so the studio opens
 * with a live, non-empty distribution. Bull/bear are placed ~1.5 expected moves
 * from the forward; the analyst then drags them to their actual view.
 */
export function makeDefaultView(ticker: string, expiry: ExpiryAnalysis, spot: number): SubjectiveView {
  const f = expiry.forward;
  const emPct = expiry.expectedMove.movePct || 0.05;
  return {
    ticker,
    horizon: expiry.expiry,
    spreadMultiplier: 1,
    scenarios: [
      { id: sid(), label: "Bull", probability: 0.3, price: round2(f * (1 + 1.5 * emPct)), source: "user" },
      { id: sid(), label: "Base", probability: 0.4, price: round2(f), source: "user" },
      { id: sid(), label: "Bear", probability: 0.3, price: round2(f * (1 - 1.5 * emPct)), source: "user" },
    ],
  };
}

export function scenariosFromAI(scenarios: Scenario[]): Scenario[] {
  return scenarios.map((s) => ({ ...s, id: sid(), source: "ai" }));
}

/**
 * Seed a view from the Street's analyst dispersion, scaled honestly to the
 * selected expiry. Analyst targets are ~12-month, so we scale the implied drift
 * linearly and the dispersion by sqrt(time) down to the expiry horizon, and tilt
 * the probabilities by the buy/sell rating balance.
 */
export function makeViewFromStreet(
  ticker: string,
  expiry: ExpiryAnalysis,
  spot: number,
  street: AnalystConsensus,
): SubjectiveView {
  const yrFrac = Math.max(expiry.dte / 365, 1 / 365);
  const ref = street.currentPrice > 0 ? street.currentPrice : spot;
  const annualReturn = (street.targetMean - ref) / ref;
  const base = spot * (1 + annualReturn * yrFrac);
  const dispAnnual = (street.targetHigh - street.targetLow) / (2 * street.targetMean);
  const dispH = dispAnnual * Math.sqrt(yrFrac);

  const bullish = street.ratings.strongBuy + street.ratings.buy;
  const bearish = street.ratings.sell + street.ratings.strongSell;
  const baseP = 0.4;
  const bullProb = Math.min(
    0.6,
    Math.max(0.1, ((1 - baseP) * (bullish + 1)) / (bullish + bearish + 2)),
  );
  const bearProb = round2(1 - baseP - bullProb);

  return {
    ticker,
    horizon: expiry.expiry,
    spreadMultiplier: 1,
    scenarios: [
      { id: sid(), label: "Bull", probability: bullProb, price: round2(base * (1 + dispH)), source: "user", rationale: `Street high $${street.targetHigh} scaled to ${expiry.dte}D` },
      { id: sid(), label: "Base", probability: baseP, price: round2(base), source: "user", rationale: `Street mean $${street.targetMean} (${street.numAnalysts} analysts) scaled to ${expiry.dte}D` },
      { id: sid(), label: "Bear", probability: bearProb, price: round2(base * (1 - dispH)), source: "user", rationale: `Street low $${street.targetLow} scaled to ${expiry.dte}D` },
    ],
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
