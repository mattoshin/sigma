/**
 * Black-Scholes-Merton pricing, greeks, and an implied-vol solver.
 *
 * We use the generalized (Merton) form with a continuous dividend yield q, and
 * price off the forward where it matters. The implied-vol solver is the bridge
 * between raw option quotes and the risk-neutral density: we convert mids to
 * IVs, smooth in IV space, then reprice — never differentiating raw quotes.
 */

import { normCdf, normPdf } from "./stats";
import type { OptionType } from "../types";

export interface BSGreeks {
  delta: number;
  gamma: number;
  vega: number; // per 1.00 (100%) change in vol; divide by 100 for per-vol-point
  theta: number; // per year; divide by 365 for per-day
}

function d1d2(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  q: number,
): [number, number] {
  const vsqrt = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / vsqrt;
  const d2 = d1 - vsqrt;
  return [d1, d2];
}

/** Black-Scholes-Merton option price. */
export function bsPrice(
  type: OptionType,
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  q = 0,
): number {
  if (T <= 0 || sigma <= 0) {
    // Intrinsic value at expiry (or for a degenerate input).
    const intrinsic = type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return intrinsic;
  }
  const [d1, d2] = d1d2(S, K, T, r, sigma, q);
  const dfR = Math.exp(-r * T);
  const dfQ = Math.exp(-q * T);
  if (type === "call") {
    return S * dfQ * normCdf(d1) - K * dfR * normCdf(d2);
  }
  return K * dfR * normCdf(-d2) - S * dfQ * normCdf(-d1);
}

export function bsGreeks(
  type: OptionType,
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  q = 0,
): BSGreeks {
  if (T <= 0 || sigma <= 0) {
    return { delta: 0, gamma: 0, vega: 0, theta: 0 };
  }
  const [d1, d2] = d1d2(S, K, T, r, sigma, q);
  const dfQ = Math.exp(-q * T);
  const dfR = Math.exp(-r * T);
  const sqrtT = Math.sqrt(T);
  const pdfD1 = normPdf(d1);

  const delta =
    type === "call" ? dfQ * normCdf(d1) : dfQ * (normCdf(d1) - 1);
  const gamma = (dfQ * pdfD1) / (S * sigma * sqrtT);
  const vega = S * dfQ * pdfD1 * sqrtT;
  const theta =
    type === "call"
      ? -(S * dfQ * pdfD1 * sigma) / (2 * sqrtT) -
        r * K * dfR * normCdf(d2) +
        q * S * dfQ * normCdf(d1)
      : -(S * dfQ * pdfD1 * sigma) / (2 * sqrtT) +
        r * K * dfR * normCdf(-d2) -
        q * S * dfQ * normCdf(-d1);

  return { delta, gamma, vega, theta };
}

/**
 * Implied volatility via bisection with a Newton accelerator.
 *
 * Bisection guarantees convergence within the bracket even when vega is tiny
 * (deep ITM/OTM), where pure Newton diverges. Returns NaN if the target price
 * is outside the no-arbitrage bounds.
 */
export function impliedVol(
  type: OptionType,
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  q = 0,
): number {
  if (marketPrice <= 0 || T <= 0) return NaN;

  // No-arbitrage bounds — reject quotes that can't correspond to a real vol.
  const dfR = Math.exp(-r * T);
  const dfQ = Math.exp(-q * T);
  const lowerBound =
    type === "call"
      ? Math.max(S * dfQ - K * dfR, 0)
      : Math.max(K * dfR - S * dfQ, 0);
  const upperBound = type === "call" ? S * dfQ : K * dfR;
  if (marketPrice < lowerBound - 1e-6 || marketPrice > upperBound + 1e-6) {
    return NaN;
  }

  let lo = 1e-4;
  let hi = 5; // 500% vol ceiling
  let sigma = 0.3;

  for (let i = 0; i < 100; i++) {
    const price = bsPrice(type, S, K, T, r, sigma, q);
    const diff = price - marketPrice;
    if (Math.abs(diff) < 1e-6) return sigma;

    // Newton step when vega is healthy, else fall back to bisection.
    const { vega } = bsGreeks(type, S, K, T, r, sigma, q);
    if (diff > 0) hi = sigma;
    else lo = sigma;

    if (vega > 1e-8) {
      const next = sigma - diff / vega;
      sigma = next > lo && next < hi ? next : 0.5 * (lo + hi);
    } else {
      sigma = 0.5 * (lo + hi);
    }
  }
  return sigma;
}
