/**
 * Financial Modeling Prep provider. Key-gated; every function returns null/[]
 * on any error so the app never breaks. Built against FMP's documented v3/v4
 * endpoints; shapes are verified live once a key is present.
 *
 * What it unlocks for Oshin:
 *   - per-firm rating actions (the named-firm "Goldman upgraded to Buy" data)
 *   - analyst price-target consensus and revenue/EPS estimate dispersion
 *   - fundamentals, key ratios, and FMP's DCF (a fundamental anchor vs price)
 *   - earnings surprise history
 */

import { KEYS } from "@/lib/config";

const V3 = "https://financialmodelingprep.com/api/v3";
const V4 = "https://financialmodelingprep.com/api/v4";

async function fmpGet<T>(url: string): Promise<T | null> {
  if (!KEYS.fmp) return null;
  try {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}apikey=${KEYS.fmp}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface RatingAction {
  date: string;
  firm: string;
  action: string; // "upgrade" | "downgrade" | "initiate" | "maintain" ...
  fromGrade: string;
  toGrade: string;
}

export interface DcfValue {
  dcf: number;
  price: number;
  upsidePct: number;
}

export interface KeyRatio {
  label: string;
  value: number;
  kind: "x" | "pct" | "ratio" | "money";
}

export interface FmpPriceTarget {
  high: number;
  low: number;
  consensus: number;
  median: number;
}

export interface EarningsSurprise {
  date: string;
  actual: number;
  estimate: number;
  surprisePct: number;
}

/** Per-firm rating actions (upgrades / downgrades / initiations). */
export async function getRatingActions(symbol: string, limit = 12): Promise<RatingAction[]> {
  const raw = await fmpGet<
    { publishedDate?: string; gradingCompany?: string; action?: string; newGrade?: string; previousGrade?: string }[]
  >(`${V4}/upgrades-downgrades?symbol=${symbol}`);
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, limit).map((r) => ({
    date: (r.publishedDate ?? "").slice(0, 10),
    firm: r.gradingCompany ?? "—",
    action: (r.action ?? "").toLowerCase(),
    fromGrade: r.previousGrade ?? "",
    toGrade: r.newGrade ?? "",
  }));
}

export async function getPriceTargetConsensus(symbol: string): Promise<FmpPriceTarget | null> {
  const raw = await fmpGet<
    { targetHigh?: number; targetLow?: number; targetConsensus?: number; targetMedian?: number }
  >(`${V4}/price-target-consensus?symbol=${symbol}`);
  const r = Array.isArray(raw) ? raw[0] : raw;
  if (!r || r.targetConsensus == null) return null;
  return {
    high: r.targetHigh ?? 0,
    low: r.targetLow ?? 0,
    consensus: r.targetConsensus ?? 0,
    median: r.targetMedian ?? r.targetConsensus ?? 0,
  };
}

export async function getDcf(symbol: string): Promise<DcfValue | null> {
  const raw = await fmpGet<{ dcf?: number; "Stock Price"?: number }[]>(`${V3}/discounted-cash-flow/${symbol}`);
  const r = Array.isArray(raw) ? raw[0] : (raw as { dcf?: number; "Stock Price"?: number } | null);
  if (!r || r.dcf == null) return null;
  const price = r["Stock Price"] ?? 0;
  return { dcf: r.dcf, price, upsidePct: price ? (r.dcf - price) / price : 0 };
}

export async function getKeyRatios(symbol: string): Promise<KeyRatio[]> {
  const raw = await fmpGet<
    {
      peRatioTTM?: number;
      priceToSalesRatioTTM?: number;
      grossProfitMarginTTM?: number;
      netProfitMarginTTM?: number;
      returnOnEquityTTM?: number;
      debtEquityRatioTTM?: number;
    }[]
  >(`${V3}/ratios-ttm/${symbol}`);
  const r = Array.isArray(raw) ? raw[0] : raw;
  if (!r) return [];
  const out: KeyRatio[] = [];
  const push = (label: string, value: number | undefined, kind: KeyRatio["kind"]) => {
    if (value != null && Number.isFinite(value)) out.push({ label, value, kind });
  };
  push("P/E", r.peRatioTTM, "x");
  push("P/S", r.priceToSalesRatioTTM, "x");
  push("Gross margin", r.grossProfitMarginTTM, "pct");
  push("Net margin", r.netProfitMarginTTM, "pct");
  push("ROE", r.returnOnEquityTTM, "pct");
  push("Debt / equity", r.debtEquityRatioTTM, "ratio");
  return out;
}

export async function getEarningsSurprises(symbol: string, limit = 8): Promise<EarningsSurprise[]> {
  const raw = await fmpGet<{ date?: string; actualEarningResult?: number; estimatedEarning?: number }[]>(
    `${V3}/earnings-surprises/${symbol}`,
  );
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, limit).map((r) => {
    const actual = r.actualEarningResult ?? 0;
    const estimate = r.estimatedEarning ?? 0;
    return {
      date: (r.date ?? "").slice(0, 10),
      actual,
      estimate,
      surprisePct: estimate ? (actual - estimate) / Math.abs(estimate) : 0,
    };
  });
}
