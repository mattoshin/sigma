/**
 * Riptide, shared domain types.
 *
 * This file is the single source of truth for every contract in the app. The
 * quant engine, the data layer, the API routes, and every screen import from
 * here. Keeping the vocabulary in one place is deliberate: when multiple
 * surfaces talk about a "distribution", a "scenario", or an "edge", they must
 * mean exactly the same shape, or the analytics silently drift.
 */

// ---------------------------------------------------------------------------
// Market data
// ---------------------------------------------------------------------------

export interface Quote {
  ticker: string;
  name?: string;
  price: number; // last / spot
  change: number; // absolute change on the day
  changePct: number; // percent change on the day
  prevClose: number;
  currency?: string;
  marketState?: string;
  asOf: string; // ISO timestamp of the quote
  delayed: boolean; // honesty flag, always surfaced in the UI
}

export interface PriceBar {
  date: string; // ISO date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type OptionType = "call" | "put";

export interface OptionContract {
  strike: number;
  bid: number;
  ask: number;
  last: number;
  mid: number; // (bid+ask)/2, falling back to last when quotes are missing
  impliedVol: number; // from source, or recomputed from the mid (preferred)
  openInterest: number;
  volume: number;
  type: OptionType;
  inTheMoney?: boolean;
}

export interface OptionExpiry {
  expiry: string; // ISO date
  dte: number; // calendar days to expiry
  t: number; // year fraction (dte / 365)
  calls: OptionContract[];
  puts: OptionContract[];
  forward?: number; // implied forward from put-call parity at ATM
}

export interface OptionChain {
  ticker: string;
  spot: number;
  asOf: string;
  delayed: boolean;
  riskFreeRate: number; // continuously-compounded r used in pricing
  dividendYield: number; // continuous q
  expiries: OptionExpiry[];
}

// ---------------------------------------------------------------------------
// Distributions
// ---------------------------------------------------------------------------

export interface DistributionPoint {
  price: number;
  density: number; // pdf value
  cdf: number; // cumulative mass up to this price
}

export type DistributionKind =
  | "risk-neutral" // Q-measure, derived from option prices (Breeden-Litzenberger)
  | "physical-adjusted" // Q tilted toward P via a risk-premium adjustment
  | "subjective"; // the analyst's own view, fit from scenarios

export interface Distribution {
  kind: DistributionKind;
  label: string;
  horizon: string; // the expiry / date this distribution describes
  points: DistributionPoint[]; // sorted ascending by price
  mean: number;
  median: number;
  mode: number;
  stdev: number;
  q05: number;
  q25: number;
  q75: number;
  q95: number;
  /** Diagnostics that prove the density is well-formed (for the methodology view). */
  integral: number; // should be ~1.0 for a valid pdf
  minDensity: number; // should be >= 0 for a valid pdf
}

// ---------------------------------------------------------------------------
// Expected move (the vol-literate top strip)
// ---------------------------------------------------------------------------

export interface ExpectedMove {
  ticker: string;
  expiry: string;
  dte: number;
  spot: number;
  atmIV: number;
  ivMethod: number; // S * IV * sqrt(dte/365)
  straddleMethod: number; // 0.85 * ATM straddle price
  straddlePrice: number;
  movePct: number; // chosen EM as a % of spot
  upper: number;
  lower: number;
  ivCrushEstimate?: number; // expected fractional IV drop post-event
  isEarningsExpiry: boolean;
}

export interface HistoricalEarningsMove {
  date: string;
  realizedMovePct: number; // |close-to-close| around the print
  impliedMovePct?: number; // what was priced going in, if known
  exceededImplied?: boolean;
}

// ---------------------------------------------------------------------------
// Scenarios & the analyst's subjective view
// ---------------------------------------------------------------------------

export interface Scenario {
  id: string;
  label: string; // "Bull", "Base", "Bear", or custom
  probability: number; // 0..1; the set must sum to 1
  price: number; // target price in this scenario
  rationale?: string;
  source: "user" | "ai";
}

export interface SubjectiveView {
  ticker: string;
  horizon: string; // the expiry / date the view targets
  scenarios: Scenario[];
  /** Controls intra-scenario uncertainty when fitting a continuous pdf. */
  spreadMultiplier: number;
}

/**
 * Which model produced a view or a tracked call. The four sources the terminal
 * can put on one axis: the analyst's own view, the sell-side Street consensus,
 * the AI analyst, and the market-implied (risk-neutral) distribution itself.
 */
export type ModelSource = "user" | "street" | "ai" | "market";

/** A named, saved SubjectiveView the analyst can reload and compare in the Arena. */
export interface ModelPreset {
  id: string; // `${ticker}:${name}`
  name: string; // "My Base", "Momentum", "Mean-revert"
  ticker: string;
  createdAt: string; // ISO
  view: SubjectiveView;
}

// ---------------------------------------------------------------------------
// Expected value, strategies, sizing, every screen ends here
// ---------------------------------------------------------------------------

export interface EVResult {
  expectedPrice: number; // E[S_T] under the subjective density
  expectedReturnPct: number; // vs spot
  forward: number; // market-implied expected price (the risk-neutral forward)
  edgePct: number; // subjective E[S] vs forward
}

export interface StrategyEV {
  label: string; // "Long stock", "Long 30D 105% call", etc.
  marketPrice: number; // cost to put on
  evUnderSubjective: number; // expected payoff under the analyst density
  evEdge: number; // ev - cost
  evEdgePct: number; // edge as % of cost
  breakeven?: number;
  pop?: number; // probability of profit under the subjective density
}

export interface KellyResult {
  fullKelly: number; // optimal fraction f*
  halfKelly: number; // the number we actually present
  edge: number; // b*p - q
  winProb: number;
  payoffOdds: number; // b
  note: string;
}

export interface EdgeAnalysis {
  ticker: string;
  horizon: string;
  ev: EVResult;
  strategies: StrategyEV[];
  kelly: KellyResult;
  /** "The market's odds at every price", P(S_T > K) from the RND. */
  marketProbAbove: { price: number; prob: number }[];
  /** P(S_T > K) under the analyst's subjective density, same grid. */
  subjectiveProbAbove: { price: number; prob: number }[];
}

// ---------------------------------------------------------------------------
// Volatility risk premium
// ---------------------------------------------------------------------------

export interface VolRiskPremium {
  ticker: string;
  atmIV: number; // implied (risk-neutral) vol
  realizedVol21: number; // trailing 21-day realized
  realizedVol30: number; // trailing 30-day realized
  vrp: number; // IV - RV (the persistent gap that separates Q from P)
  ivPercentile?: number; // where current IV sits in its 1y range, 0..1
  note: string;
}

// ---------------------------------------------------------------------------
// Catalysts
// ---------------------------------------------------------------------------

export type CatalystType =
  | "earnings"
  | "fda"
  | "split"
  | "dividend"
  | "macro"
  | "other";

export interface Catalyst {
  ticker: string;
  type: CatalystType;
  date: string; // ISO date
  label: string;
  confirmed: boolean;
}

// ---------------------------------------------------------------------------
// Company facts (SEC EDGAR)
// ---------------------------------------------------------------------------

export interface FinancialMetric {
  label: string;
  value: number;
  unit: string;
  period: string; // fiscal period, e.g. "FY2025" or "Q2 2026"
}

export interface CompanyFacts {
  ticker: string;
  cik: string;
  name: string;
  metrics: FinancialMetric[];
  latestFilings: { form: string; filed: string; url: string }[];
}

// ---------------------------------------------------------------------------
// Calibration, scoring the user's OWN probabilistic calls (the white space)
// ---------------------------------------------------------------------------

export interface TrackedCall {
  id: string;
  ticker: string;
  createdAt: string;
  horizon: string;
  claim: string; // human-readable, e.g. "P(S_T > $200 by Mar expiry)"
  predictedProb: number; // the user's probability, 0..1
  marketImpliedProb?: number; // the RND probability at call time, for contrast
  modelSource?: ModelSource; // which model made the call (for the Arena scoreboard)
  resolved: boolean;
  outcome?: boolean; // did the event happen?
  resolvedAt?: string;
}

export interface CalibrationBin {
  bucket: string; // e.g. "50-60%"
  predictedAvg: number; // mean predicted prob in the bin
  observedFreq: number; // realized frequency of the event
  count: number;
}

export interface CalibrationResult {
  brierScore: number; // lower is better; 0 is perfect
  bins: CalibrationBin[];
  count: number;
  resolvedCount: number;
  /** mean(predicted) - mean(observed); > 0 means systematically overconfident. */
  overconfidenceIndex: number;
}

// ---------------------------------------------------------------------------
// AI scenario engine output
// ---------------------------------------------------------------------------

export interface AIScenarioResult {
  ticker: string;
  generatedAt: string;
  model: string;
  scenarios: Scenario[];
  anchorNote: string; // how the probabilities were anchored to the implied base rate
  evidence: { point: string; source: string }[];
  caveat: string; // the honesty caveat about LLM overconfidence
}

// ---------------------------------------------------------------------------
// Screener
// ---------------------------------------------------------------------------

export interface ScreenerRow {
  ticker: string;
  name?: string;
  spot: number;
  atmIV: number;
  realizedVol: number;
  vrp: number; // IV - RV
  expectedMovePct: number;
  ivPercentile?: number;
  nextCatalyst?: Catalyst;
  delayed: boolean;
}

// ---------------------------------------------------------------------------
// The Street, aggregated analyst models (sell-side dispersion)
// ---------------------------------------------------------------------------

export interface AnalystRatings {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

/**
 * The aggregate of every covering analyst's model, as a dispersion rather than
 * a single mean. This is the free tier (Yahoo): target range + counts + rating
 * breakdown + next-period EPS estimate spread. Targets are a ~12-month horizon.
 */
export interface AnalystConsensus {
  numAnalysts: number;
  currentPrice: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  targetHigh: number;
  ratings: AnalystRatings;
  recommendationKey: string; // "strongBuy" | "buy" | "hold" | "sell" | "strongSell"
  recommendationMean?: number; // 1 (strong buy) .. 5 (strong sell)
  epsNext?: { period: string; avg: number; low: number; high: number; numAnalysts: number };
  horizonMonths: number; // ~12
  asOf: string;
  delayed: boolean;
}

// ---------------------------------------------------------------------------
// Provenance, every payload carries where it came from and how stale it is
// ---------------------------------------------------------------------------

export type DataSource = "snapshot" | "yahoo" | "fmp" | "finnhub" | "edgar" | "alphavantage";

export interface Provenance {
  source: DataSource;
  asOf: string;
  delayed: boolean;
  note?: string;
}

export interface WithProvenance<T> {
  data: T;
  provenance: Provenance;
}
