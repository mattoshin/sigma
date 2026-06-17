/**
 * Expected move, the vol-literate summary that sits at the top of every ticker.
 *
 * Two methods that reconcile (we show both so a quant can check our work):
 *   (a) IV method:        EM = S * IV * sqrt(DTE/365)
 *   (b) Straddle method:  EM ≈ 0.85 * ATM straddle price
 * They agree via Brenner-Subrahmanyam (each ATM option ≈ 0.4*S*σ*√T, so the
 * straddle ≈ 0.8*S*σ*√T). We quote the 0.85 practitioner multiplier that desks
 * actually use, and keep the straddle method as the headline number.
 *
 * For a catalyst (earnings), isolate the move with the first expiry just after
 * the event and surface the IV-crush estimate, the mechanical 30-50% overnight
 * IV collapse that can sink a correct directional call held in long premium.
 */

import { impliedVol } from "./blackScholes";
import type { ExpectedMove, OptionContract, OptionExpiry } from "../types";

export interface ExpectedMoveParams {
  spot: number;
  riskFreeRate: number;
  dividendYield: number;
  isEarningsExpiry?: boolean;
  ivCrushEstimate?: number; // fractional, e.g. 0.4
}

function midOf(c: OptionContract): number {
  if (c.mid > 0) return c.mid;
  if (c.bid > 0 && c.ask > 0) return (c.bid + c.ask) / 2;
  return c.last;
}

function nearest<T extends { strike: number }>(items: T[], target: number): T | undefined {
  let best: T | undefined;
  let bestDist = Infinity;
  for (const it of items) {
    const d = Math.abs(it.strike - target);
    if (d < bestDist) {
      bestDist = d;
      best = it;
    }
  }
  return best;
}

export function expectedMove(
  expiry: OptionExpiry,
  params: ExpectedMoveParams,
): ExpectedMove {
  const { spot, riskFreeRate: r, dividendYield: q } = params;
  const T = expiry.t;
  const forward = spot * Math.exp((r - q) * T);

  const atmCall = nearest(expiry.calls, forward);
  const atmPut = nearest(expiry.puts, atmCall?.strike ?? forward);
  if (!atmCall || !atmPut) {
    throw new Error("No ATM options to compute expected move.");
  }

  const callPx = midOf(atmCall);
  const putPx = midOf(atmPut);
  const straddlePrice = callPx + putPx;

  const ivCall = impliedVol("call", callPx, spot, atmCall.strike, T, r, q);
  const ivPut = impliedVol("put", putPx, spot, atmPut.strike, T, r, q);
  const ivs = [ivCall, ivPut].filter((v) => Number.isFinite(v) && v > 0);
  const atmIV = ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : NaN;

  const ivMethod = Number.isFinite(atmIV)
    ? spot * atmIV * Math.sqrt(expiry.dte / 365)
    : NaN;
  const straddleMethod = 0.85 * straddlePrice;

  // Headline = straddle method (model-light, what desks quote).
  const em = straddleMethod;

  return {
    ticker: expiry.expiry, // overwritten by caller with the real ticker
    expiry: expiry.expiry,
    dte: expiry.dte,
    spot,
    atmIV,
    ivMethod,
    straddleMethod,
    straddlePrice,
    movePct: em / spot,
    upper: spot + em,
    lower: spot - em,
    ivCrushEstimate: params.isEarningsExpiry ? params.ivCrushEstimate ?? 0.4 : undefined,
    isEarningsExpiry: params.isEarningsExpiry ?? false,
  };
}
