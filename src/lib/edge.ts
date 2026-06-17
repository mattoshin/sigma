/**
 * Client-side edge computation. Pure functions (no node/server deps) so the
 * analyst can drag scenario sliders and watch the subjective distribution, the
 * divergence, the EV, and the Kelly size update instantly without a round trip.
 */

import { subjectiveDistribution } from "@/lib/quant/subjective";
import { analyzeEdge, divergence } from "@/lib/quant/ev";
import type { Distribution, EdgeAnalysis, Scenario, SubjectiveView } from "@/lib/types";
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

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
