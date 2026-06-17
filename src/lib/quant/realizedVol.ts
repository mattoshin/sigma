/**
 * Realized volatility estimators and IV percentile.
 *
 * We expose two estimators because the gap between them is itself information:
 *   - close-to-close: the textbook estimator, annualized at 252 trading days.
 *   - Parkinson: uses the high-low range, ~5x more efficient, but assumes no
 *     drift and continuous monitoring (so it underestimates around gaps).
 * The implied-vs-realized spread is the volatility risk premium (see vrp.ts).
 */

import { mean, stdev } from "./stats";
import type { PriceBar } from "../types";

const TRADING_DAYS = 252;

/** Close-to-close annualized realized volatility over the last `window` returns. */
export function realizedVol(bars: PriceBar[], window = 21): number {
  if (bars.length < window + 1) {
    if (bars.length < 3) return 0;
    window = bars.length - 1;
  }
  const closes = bars.map((b) => b.close).filter((c) => c > 0);
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const slice = returns.slice(-window);
  return stdev(slice, true) * Math.sqrt(TRADING_DAYS);
}

/** Parkinson high-low range estimator, annualized. */
export function parkinsonVol(bars: PriceBar[], window = 21): number {
  const slice = bars.slice(-window).filter((b) => b.high > 0 && b.low > 0);
  if (slice.length < 2) return 0;
  const factor = 1 / (4 * Math.log(2));
  const sq = slice.map((b) => {
    const lr = Math.log(b.high / b.low);
    return factor * lr * lr;
  });
  const daily = Math.sqrt(mean(sq));
  return daily * Math.sqrt(TRADING_DAYS);
}

/**
 * Where current IV sits within a trailing history of IV observations, 0..1.
 * Returns undefined if there isn't enough history to be meaningful.
 */
export function ivPercentile(currentIV: number, history: number[]): number | undefined {
  const valid = history.filter((v) => Number.isFinite(v) && v > 0);
  if (valid.length < 20) return undefined;
  const below = valid.filter((v) => v <= currentIV).length;
  return below / valid.length;
}

/**
 * The absolute realized move around a set of catalyst dates, used to judge
 * whether the market has historically over- or under-priced a name's earnings.
 */
export function realizedMovePct(barBefore: PriceBar, barAfter: PriceBar): number {
  if (barBefore.close <= 0) return 0;
  return Math.abs((barAfter.close - barBefore.close) / barBefore.close);
}
