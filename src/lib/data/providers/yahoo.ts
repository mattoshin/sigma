/**
 * Live market data via yahoo-finance2 — the only free source that returns a
 * full option chain with strikes, bid/ask, OI, and per-contract IV.
 *
 * This is unofficial/scraping-based with no SLA and noisy after-hours IV, so:
 *   - every consumer treats it as best-effort (the accessor falls back to a
 *     baked snapshot on any throw),
 *   - we recompute IV ourselves from the mid downstream rather than trusting
 *     Yahoo's IV field,
 *   - everything is labeled delayed/illustrative in the UI.
 *
 * yahoo-finance2 v3 ships very heavy method overloads; we wrap the default
 * export in a small typed facade covering just the fields we read.
 */

import yahooFinance from "yahoo-finance2";
import { DEFAULTS } from "@/lib/config";
import type { OptionChain, OptionContract, OptionExpiry, PriceBar, Quote } from "@/lib/types";

interface YQuote {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  longName?: string;
  shortName?: string;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  marketState?: string;
  trailingAnnualDividendYield?: number;
}
interface YBar {
  date: Date | string | number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}
interface YOptContract {
  strike?: number;
  bid?: number;
  ask?: number;
  lastPrice?: number;
  impliedVolatility?: number;
  openInterest?: number;
  volume?: number;
}
interface YOptExpiry {
  expirationDate?: Date;
  calls?: YOptContract[];
  puts?: YOptContract[];
}
interface YOptions {
  quote?: YQuote;
  expirationDates?: Date[];
  options?: YOptExpiry[];
}

const yf = yahooFinance as unknown as {
  quote(symbol: string): Promise<YQuote>;
  chart(symbol: string, opts: { period1: Date; interval: string }): Promise<{ quotes: YBar[] }>;
  options(symbol: string, opts?: { date?: Date }): Promise<YOptions>;
  suppressNotices?(keys: string[]): void;
};

try {
  yf.suppressNotices?.(["yahooSurvey", "ripHistorical"]);
} catch {
  /* noop */
}

const MAX_LIVE_EXPIRIES = 4;

export async function getLiveQuote(ticker: string): Promise<Quote> {
  const q = await yf.quote(ticker);
  const price = q.regularMarketPrice ?? 0;
  const prevClose = q.regularMarketPreviousClose ?? price;
  return {
    ticker: q.symbol ?? ticker.toUpperCase(),
    name: q.longName ?? q.shortName,
    price,
    change: q.regularMarketChange ?? price - prevClose,
    changePct: (q.regularMarketChangePercent ?? 0) / 100,
    prevClose,
    currency: q.currency,
    marketState: q.marketState,
    asOf: new Date().toISOString(),
    delayed: true,
  };
}

export async function getLiveHistory(ticker: string, days = 400): Promise<PriceBar[]> {
  const period1 = new Date(Date.now() - days * 86_400_000);
  const result = await yf.chart(ticker, { period1, interval: "1d" });
  return (result.quotes ?? [])
    .filter((b) => b.close != null)
    .map((b) => ({
      date: new Date(b.date).toISOString().slice(0, 10),
      open: b.open ?? b.close ?? 0,
      high: b.high ?? b.close ?? 0,
      low: b.low ?? b.close ?? 0,
      close: b.close ?? 0,
      volume: b.volume ?? 0,
    }));
}

function mapContract(c: YOptContract, type: "call" | "put", spot: number): OptionContract {
  const bid = c.bid ?? 0;
  const ask = c.ask ?? 0;
  const last = c.lastPrice ?? 0;
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : last;
  const strike = c.strike ?? 0;
  return {
    strike,
    bid,
    ask,
    last,
    mid,
    impliedVol: c.impliedVolatility ?? 0,
    openInterest: c.openInterest ?? 0,
    volume: c.volume ?? 0,
    type,
    inTheMoney: type === "call" ? strike < spot : strike > spot,
  };
}

export async function getLiveChain(ticker: string): Promise<OptionChain> {
  const base = await yf.options(ticker);
  const spot = base.quote?.regularMarketPrice ?? 0;
  const divYield = base.quote?.trailingAnnualDividendYield ?? DEFAULTS.dividendYield;
  const expirationDates = (base.expirationDates ?? []).slice(0, MAX_LIVE_EXPIRIES);

  const expiries: OptionExpiry[] = [];
  for (let i = 0; i < expirationDates.length; i++) {
    const exp = expirationDates[i];
    const payload = i === 0 ? base : await yf.options(ticker, { date: exp });
    const opt = payload.options?.[0];
    if (!opt) continue;
    const expiryDate = opt.expirationDate ? new Date(opt.expirationDate) : new Date(exp);
    const dte = Math.max(1, Math.round((expiryDate.getTime() - Date.now()) / 86_400_000));
    expiries.push({
      expiry: expiryDate.toISOString().slice(0, 10),
      dte,
      t: dte / 365,
      calls: (opt.calls ?? []).map((c) => mapContract(c, "call", spot)),
      puts: (opt.puts ?? []).map((p) => mapContract(p, "put", spot)),
    });
  }

  if (expiries.length === 0) throw new Error(`No option expiries returned for ${ticker}`);

  return {
    ticker: ticker.toUpperCase(),
    spot,
    asOf: new Date().toISOString(),
    delayed: true,
    riskFreeRate: DEFAULTS.riskFreeRate,
    dividendYield: divYield,
    expiries,
  };
}
