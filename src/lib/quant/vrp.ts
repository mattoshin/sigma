/**
 * Volatility risk premium — the honest bridge between Q and P.
 *
 * The options-implied (risk-neutral, Q) distribution is NOT the real-world (P)
 * distribution. Risk aversion inflates down-state probabilities, so implied
 * vol sits above subsequently-realized vol on average. That persistent gap is
 * the variance/volatility risk premium (VRP ≈ implied − realized). Surfacing
 * it explicitly — rather than pretending the implied density is the true odds —
 * is the single highest-credibility move in the whole product.
 */

import type { VolRiskPremium } from "../types";

export function volRiskPremium(
  ticker: string,
  atmIV: number,
  realizedVol21: number,
  realizedVol30: number,
  ivPercentileValue?: number,
): VolRiskPremium {
  const vrp = atmIV - realizedVol30;
  let note: string;
  if (vrp > 0.02) {
    note =
      "Implied > realized: options are pricing more vol than the stock has been delivering. The market is paying you to be short vol — but it's a premium for bearing risk, not free money.";
  } else if (vrp < -0.02) {
    note =
      "Implied < realized: unusual. The market is under-pricing recent movement; long vol may be cheap into the catalyst.";
  } else {
    note = "Implied ≈ realized: little volatility risk premium to harvest here.";
  }
  return {
    ticker,
    atmIV,
    realizedVol21,
    realizedVol30,
    vrp,
    ivPercentile: ivPercentileValue,
    note,
  };
}

/**
 * A defensible, deliberately-simple Q→P adjustment for the implied density:
 * shift the distribution's drift by an annualized risk-premium amount over the
 * horizon. This is a transparent shortcut (a constant Sharpe/drift tilt), NOT a
 * full Ross recovery — which is contested and theory-heavy. We expose it as a
 * toggle and label it as an approximation.
 */
export function physicalDriftShift(
  riskPremiumAnnual: number,
  yearFraction: number,
): number {
  // Returns the multiplicative price shift to apply to the RND's support.
  return Math.exp(riskPremiumAnnual * yearFraction);
}
