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
