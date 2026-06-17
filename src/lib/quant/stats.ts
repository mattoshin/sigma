/**
 * Statistical & numerical primitives used across the quant engine.
 *
 * Deliberately dependency-free and pure so every function here is trivially
 * unit-testable. Correctness of the higher-level analytics (Black-Scholes,
 * the risk-neutral density) rests on these, so they are written to be boring
 * and right rather than clever.
 */

export const SQRT_2PI = Math.sqrt(2 * Math.PI);

/** Standard normal probability density function. */
export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/**
 * Error function, Abramowitz & Stegun 7.1.26 approximation.
 * Max absolute error ~1.5e-7, which is far tighter than option-quote noise.
 */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Standard normal cumulative distribution function. */
export function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/**
 * Inverse standard normal CDF (quantile function), Acklam's algorithm.
 * Used to fit skew-normal subjective distributions and to read quantiles.
 */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function linspace(a: number, b: number, n: number): number[] {
  if (n <= 1) return [a];
  const step = (b - a) / (n - 1);
  return Array.from({ length: n }, (_, i) => a + i * step);
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function stdev(xs: number[], sample = true): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const ss = xs.reduce((s, x) => s + (x - m) * (x - m), 0);
  return Math.sqrt(ss / (xs.length - (sample ? 1 : 0)));
}

/** Trapezoidal integration of ys over (sorted) xs. */
export function trapz(xs: number[], ys: number[]): number {
  let acc = 0;
  for (let i = 1; i < xs.length; i++) {
    acc += ((ys[i] + ys[i - 1]) / 2) * (xs[i] - xs[i - 1]);
  }
  return acc;
}

/**
 * Natural cubic spline interpolation through (x, y) knots.
 *
 * This is the workhorse of the Shimko (1993) approach to the risk-neutral
 * density: we fit a smooth curve to implied vol vs strike rather than
 * differentiating raw, noisy prices. "Natural" boundary conditions set the
 * second derivative to zero at the endpoints. Inputs must be strictly
 * increasing in x.
 */
export class CubicSpline {
  private readonly xs: number[];
  private readonly ys: number[];
  private readonly y2: number[]; // second derivatives at the knots

  constructor(xs: number[], ys: number[]) {
    if (xs.length !== ys.length || xs.length < 2) {
      throw new Error("CubicSpline needs >= 2 matching points");
    }
    this.xs = xs;
    this.ys = ys;
    const n = xs.length;
    const u = new Array<number>(n).fill(0);
    this.y2 = new Array<number>(n).fill(0);

    for (let i = 1; i < n - 1; i++) {
      const sig = (xs[i] - xs[i - 1]) / (xs[i + 1] - xs[i - 1]);
      const p = sig * this.y2[i - 1] + 2;
      this.y2[i] = (sig - 1) / p;
      u[i] =
        (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) -
        (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1]);
      u[i] = (6 * u[i] / (xs[i + 1] - xs[i - 1]) - sig * u[i - 1]) / p;
    }
    for (let k = n - 2; k >= 0; k--) {
      this.y2[k] = this.y2[k] * this.y2[k + 1] + u[k];
    }
  }

  /** Evaluate the spline at x; clamps to the endpoint values outside the range. */
  at(x: number): number {
    const xs = this.xs;
    const n = xs.length;
    if (x <= xs[0]) return this.ys[0];
    if (x >= xs[n - 1]) return this.ys[n - 1];

    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (hi + lo) >> 1;
      if (xs[mid] > x) hi = mid;
      else lo = mid;
    }
    const h = xs[hi] - xs[lo];
    const a = (xs[hi] - x) / h;
    const b = (x - xs[lo]) / h;
    return (
      a * this.ys[lo] +
      b * this.ys[hi] +
      (((a * a * a - a) * this.y2[lo] + (b * b * b - b) * this.y2[hi]) * (h * h)) / 6
    );
  }
}

/**
 * Read a quantile from a grid-form CDF (arrays of price and cumulative mass).
 * Linear interpolation between grid points.
 */
export function quantileFromCdf(prices: number[], cdf: number[], p: number): number {
  if (p <= cdf[0]) return prices[0];
  if (p >= cdf[cdf.length - 1]) return prices[prices.length - 1];
  for (let i = 1; i < cdf.length; i++) {
    if (cdf[i] >= p) {
      const frac = (p - cdf[i - 1]) / (cdf[i] - cdf[i - 1] || 1);
      return prices[i - 1] + frac * (prices[i] - prices[i - 1]);
    }
  }
  return prices[prices.length - 1];
}
