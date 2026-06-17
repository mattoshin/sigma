import universeIndex from "@/lib/data/snapshots/index.json";

export interface UniverseEntry {
  ticker: string;
  name: string;
  sector: string;
  hero: boolean;
}

export const UNIVERSE = universeIndex as UniverseEntry[];

export const HERO_TICKERS = UNIVERSE.filter((u) => u.hero).map((u) => u.ticker);

export function isUniverseTicker(ticker: string): boolean {
  const t = ticker.toUpperCase();
  return UNIVERSE.some((u) => u.ticker === t);
}

export function universeEntry(ticker: string): UniverseEntry | undefined {
  const t = ticker.toUpperCase();
  return UNIVERSE.find((u) => u.ticker === t);
}

export const DEFAULTS = {
  /** Continuously-compounded risk-free rate used when a live source omits one. */
  riskFreeRate: 0.043,
  dividendYield: 0,
  /** Default ticker for the home dashboard hero. */
  defaultTicker: "SPY",
};

/**
 * Demo mode: when true (the default), universe tickers resolve to baked
 * snapshots so a live interview demo physically cannot break on a flaky feed.
 * Set OSHIN_FORCE_LIVE=1 to prefer live data (with snapshot fallback on error).
 */
export const DEMO_SNAPSHOT_FIRST = process.env.OSHIN_FORCE_LIVE !== "1";

/** Whether an Anthropic key is configured for the AI scenario engine. */
export const AI_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * Free-data provider keys. Drop these in .env.local; every feature that uses
 * one degrades gracefully to existing behavior when its key is absent.
 *   FMP_API_KEY          financialmodelingprep.com  (analyst estimates, price targets,
 *                        per-firm rating actions, fundamentals, ratios, DCF, earnings surprises)
 *   FRED_API_KEY         fred.stlouisfed.org/docs/api  (live risk-free Treasury yield)
 *   FINNHUB_API_KEY      finnhub.io  (quotes, news, recommendation trends; cross-check/fallback)
 *   ALPHAVANTAGE_API_KEY alphavantage.co  (EOD historical options, 25 req/day)
 */
export const KEYS = {
  fmp: process.env.FMP_API_KEY ?? "",
  fred: process.env.FRED_API_KEY ?? "",
  finnhub: process.env.FINNHUB_API_KEY ?? "",
  alphaVantage: process.env.ALPHAVANTAGE_API_KEY ?? "",
};

export const FMP_ENABLED = Boolean(KEYS.fmp);
export const FRED_ENABLED = Boolean(KEYS.fred);
export const FINNHUB_ENABLED = Boolean(KEYS.finnhub);
