/**
 * The risk-neutral density (RND) — the analytical heart of Sigma.
 *
 * Method (Breeden-Litzenberger via the Shimko 1993 implied-vol-spline route):
 *   1. For each strike, take the liquid OTM option (put below spot, call above)
 *      and recompute its implied vol from the mid. IV is identical for a call
 *      and a put at the same strike under put-call parity, so OTM quotes stitch
 *      into one clean smile and we avoid the noisy ITM wings.
 *   2. Fit a natural cubic spline to IV-vs-strike (Shimko). We smooth in IV
 *      space rather than differentiating raw prices, which would amplify quote
 *      noise into ~50% negative densities.
 *   3. Reprice a smooth call curve on a fine strike grid via Black-Scholes
 *      using the fitted IVs.
 *   4. The RND is the discounted second derivative of the call price wrt strike,
 *      computed as a discrete butterfly: q(K) = e^{rT}[C(K-dK) - 2C(K) + C(K+dK)]/dK^2.
 *      A butterfly literally pays a narrow band, so its price IS the mass there.
 *   5. Beyond the observed strikes we hold IV flat at the wing value (the spline
 *      clamps), which extends the density with lognormal-style tails, then we
 *      renormalize so it integrates to ~1. (Figlewski grafts parametric GEV
 *      tails for more precision; flat-IV extension is the honest, simpler choice
 *      we disclose on the methodology page.)
 *
 * Output is a `Distribution` of kind "risk-neutral" with moments, quantiles,
 * and the diagnostics (integral, min density) that prove it is well-formed.
 */

import { bsPrice, impliedVol } from "./blackScholes";
import { CubicSpline, linspace, quantileFromCdf, trapz } from "./stats";
import type { Distribution, DistributionPoint, OptionExpiry } from "../types";

export interface RNDParams {
  spot: number;
  riskFreeRate: number;
  dividendYield: number;
  gridSize?: number; // number of evaluation points (default 401)
  /** Half-width of the price grid in ATM-IV standard deviations (default 6). */
  gridWidthSigmas?: number;
}

export interface RNDResult {
  distribution: Distribution;
  atmIV: number;
  forward: number;
  /** The cleaned (strike, iv) smile used, for plotting / inspection. */
  smile: { strike: number; iv: number }[];
  usedStrikes: number;
  warnings: string[];
}

interface SmilePoint {
  strike: number;
  iv: number;
}

/** Build the cleaned OTM implied-vol smile from an expiry's chain. */
function buildSmile(
  expiry: OptionExpiry,
  spot: number,
  r: number,
  q: number,
): SmilePoint[] {
  const T = expiry.t;
  const byStrike = new Map<number, SmilePoint>();

  const consider = (
    strike: number,
    mid: number,
    type: "call" | "put",
  ): void => {
    if (!(mid > 0) || !(strike > 0)) return;
    const iv = impliedVol(type, mid, spot, strike, T, r, q);
    if (!Number.isFinite(iv) || iv < 0.02 || iv > 4) return;
    byStrike.set(strike, { strike, iv });
  };

  const forward = spot * Math.exp((r - q) * T);
  for (const c of expiry.calls) {
    if (c.strike >= forward) consider(c.strike, midOf(c), "call");
  }
  for (const p of expiry.puts) {
    if (p.strike < forward) consider(p.strike, midOf(p), "put");
  }

  return [...byStrike.values()].sort((a, b) => a.strike - b.strike);
}

function midOf(c: { bid: number; ask: number; last: number; mid: number }): number {
  if (c.mid > 0) return c.mid;
  if (c.bid > 0 && c.ask > 0) return (c.bid + c.ask) / 2;
  return c.last;
}

/**
 * Compute the risk-neutral density for a single expiry.
 * Throws if there aren't enough liquid strikes to fit a smile.
 */
export function riskNeutralDensity(
  expiry: OptionExpiry,
  params: RNDParams,
): RNDResult {
  const { spot, riskFreeRate: r, dividendYield: q } = params;
  const gridSize = params.gridSize ?? 401;
  const gridWidthSigmas = params.gridWidthSigmas ?? 6;
  const T = expiry.t;
  const warnings: string[] = [];

  const smile = buildSmile(expiry, spot, r, q);
  if (smile.length < 5) {
    throw new Error(
      `Not enough liquid strikes to build a density (${smile.length} found, need >= 5).`,
    );
  }

  const strikes = smile.map((s) => s.strike);
  const ivs = smile.map((s) => s.iv);
  const ivSpline = new CubicSpline(strikes, ivs);

  const forward = spot * Math.exp((r - q) * T);
  // ATM IV from the smile, evaluated at the forward.
  const atmIV = ivSpline.at(forward);

  // Price grid: forward +/- N sigma, floored at a small positive price.
  const sigmaPrice = atmIV * Math.sqrt(T) * forward;
  const lo = Math.max(forward - gridWidthSigmas * sigmaPrice, 0.01 * forward);
  const hi = forward + gridWidthSigmas * sigmaPrice;
  const grid = linspace(lo, hi, gridSize);
  const dK = grid[1] - grid[0];

  // Smooth call curve via fitted IVs (flat-IV extension outside observed range).
  const callCurve = grid.map((K) => bsPrice("call", spot, K, T, r, ivSpline.at(K), q));

  // Discrete butterfly second difference -> raw density.
  const dfR = Math.exp(r * T);
  const rawDensity = new Array<number>(gridSize).fill(0);
  for (let i = 1; i < gridSize - 1; i++) {
    const second = (callCurve[i - 1] - 2 * callCurve[i] + callCurve[i + 1]) / (dK * dK);
    rawDensity[i] = dfR * second;
  }
  rawDensity[0] = rawDensity[1];
  rawDensity[gridSize - 1] = rawDensity[gridSize - 2];

  const minDensityRaw = Math.min(...rawDensity);

  // Clip small negative artifacts to zero (numerical noise near the wings).
  const clipped = rawDensity.map((d) => (d > 0 ? d : 0));
  const rawIntegral = trapz(grid, clipped);
  if (rawIntegral <= 0) {
    throw new Error("Degenerate density — integral non-positive.");
  }
  if (Math.abs(rawIntegral - 1) > 0.08) {
    warnings.push(
      `Density integrated to ${rawIntegral.toFixed(3)} before renormalization (tails truncated).`,
    );
  }
  if (minDensityRaw < -1e-6) {
    warnings.push(
      `Raw density dipped to ${minDensityRaw.toExponential(2)} (clipped to zero).`,
    );
  }

  // Renormalize to a proper pdf.
  const density = clipped.map((d) => d / rawIntegral);

  // CDF and moments.
  const points: DistributionPoint[] = [];
  const cdf = new Array<number>(gridSize).fill(0);
  let cum = 0;
  for (let i = 0; i < gridSize; i++) {
    if (i > 0) cum += ((density[i] + density[i - 1]) / 2) * (grid[i] - grid[i - 1]);
    cdf[i] = cum;
    points.push({ price: grid[i], density: density[i], cdf: cum });
  }

  const meanVal = trapz(grid, grid.map((K, i) => K * density[i]));
  const variance = trapz(grid, grid.map((K, i) => (K - meanVal) * (K - meanVal) * density[i]));
  const stdevVal = Math.sqrt(Math.max(variance, 0));

  let modeIdx = 0;
  for (let i = 1; i < gridSize; i++) if (density[i] > density[modeIdx]) modeIdx = i;

  const distribution: Distribution = {
    kind: "risk-neutral",
    label: "Market-implied (risk-neutral)",
    horizon: expiry.expiry,
    points,
    mean: meanVal,
    median: quantileFromCdf(grid, cdf, 0.5),
    mode: grid[modeIdx],
    stdev: stdevVal,
    q05: quantileFromCdf(grid, cdf, 0.05),
    q25: quantileFromCdf(grid, cdf, 0.25),
    q75: quantileFromCdf(grid, cdf, 0.75),
    q95: quantileFromCdf(grid, cdf, 0.95),
    integral: rawIntegral,
    minDensity: minDensityRaw,
  };

  // Sanity: the RND mean should sit very close to the forward.
  if (Math.abs(meanVal - forward) / forward > 0.03) {
    warnings.push(
      `RND mean (${meanVal.toFixed(2)}) drifts from forward (${forward.toFixed(2)}) by >3%.`,
    );
  }

  return {
    distribution,
    atmIV,
    forward,
    smile,
    usedStrikes: smile.length,
    warnings,
  };
}

/**
 * The "market's odds at every price" read, straight from the RND CDF.
 * P(S_T > K) for each grid price. This is the free, model-light wow line.
 */
export function probAbove(distribution: Distribution): { price: number; prob: number }[] {
  return distribution.points.map((p) => ({ price: p.price, prob: 1 - p.cdf }));
}
