/**
 * Convert the model's own dollar standard deviation over an expiry horizon
 * into an annualized volatility, so a consumer of the public /api/radar feed
 * (e.g. a sizing formula) gets a real, model-derived sigma rather than an
 * assumed constant.
 */
export function annualizedVolFromStdev(stdev: number, spot: number, dte: number): number {
  if (spot <= 0 || dte <= 0) return 0;
  return stdev / spot / Math.sqrt(dte / 365);
}
