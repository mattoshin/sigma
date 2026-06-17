/**
 * FRED (St. Louis Fed) risk-free rate. Free, generous, stable JSON API.
 *
 * We pull the 3-month Treasury constant-maturity yield (DGS3MO) and use it as
 * the risk-free rate r in Black-Scholes / the risk-neutral density, instead of
 * a hardcoded constant. Using the real short rate is a small but real
 * credibility detail for a quant audience. Cached; degrades to null without a key.
 */

import { KEYS } from "@/lib/config";

let cached: { rate: number; at: number } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function getRiskFreeRate(): Promise<number | null> {
  if (!KEYS.fred) return null;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rate;
  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=DGS3MO&api_key=${KEYS.fred}&file_type=json&sort_order=desc&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return cached?.rate ?? null;
    const data = (await res.json()) as { observations?: { value: string }[] };
    for (const o of data.observations ?? []) {
      const pct = parseFloat(o.value);
      if (Number.isFinite(pct)) {
        const rate = pct / 100;
        cached = { rate, at: Date.now() };
        return rate;
      }
    }
    return cached?.rate ?? null;
  } catch {
    return cached?.rate ?? null;
  }
}
