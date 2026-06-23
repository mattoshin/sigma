/**
 * Portfolio-only derivations for the Trade Log and Attribution tabs.
 *
 * Everything here is computed deterministically from the existing
 * `PortfolioModel` (built by `@/lib/portfolio`) so the supporting tabs are
 * coherent with the dashboard on the same sample data. No new data sources.
 */

import type { PortfolioModel, PositionRow } from "@/lib/portfolio";

export interface TradeRow {
  id: string;
  date: string;
  ticker: string;
  action: "BUY" | "SELL" | "SHORT" | "COVER";
  shares: number;
  price: number;
  value: number;
  note: string;
}

/** Small seeded PRNG so the synthesized ledger is stable across renders. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashTicker(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Build an opening-fill ledger from the current book. Each open position
 * becomes one or two entry fills (a starter clip then a top-up), priced near
 * its average cost. This is illustrative paper history, not real executions.
 */
export function buildTradeLog(p: PortfolioModel): TradeRow[] {
  const rows: TradeRow[] = [];

  p.positions.forEach((pos) => {
    const seed = hashTicker(pos.ticker);
    const rnd = mulberry32(seed);
    // Spread entries across the lifetime window (older = earlier in the book).
    const firstDaysAgo = 60 + Math.floor(rnd() * 360);
    const splitTwo = rnd() > 0.45;
    const openAction = pos.side === "short" ? "SHORT" : "BUY";

    if (splitTwo) {
      const firstShares = Math.round((pos.shares * (0.4 + rnd() * 0.25)) / 100) * 100 || pos.shares;
      const secondShares = pos.shares - firstShares;
      const drift = pos.avgCost * (0.01 + rnd() * 0.03);
      rows.push({
        id: `${pos.ticker}-1`,
        date: isoDaysAgo(firstDaysAgo),
        ticker: pos.ticker,
        action: openAction,
        shares: firstShares,
        price: round2(pos.avgCost - drift),
        value: round0(firstShares * (pos.avgCost - drift)),
        note: "starter",
      });
      if (secondShares > 0) {
        rows.push({
          id: `${pos.ticker}-2`,
          date: isoDaysAgo(Math.max(5, firstDaysAgo - 20 - Math.floor(rnd() * 25))),
          ticker: pos.ticker,
          action: openAction,
          shares: secondShares,
          price: round2(pos.avgCost + drift),
          value: round0(secondShares * (pos.avgCost + drift)),
          note: "add",
        });
      }
    } else {
      rows.push({
        id: `${pos.ticker}-1`,
        date: isoDaysAgo(firstDaysAgo),
        ticker: pos.ticker,
        action: openAction,
        shares: pos.shares,
        price: round2(pos.avgCost),
        value: round0(pos.shares * pos.avgCost),
        note: "full clip",
      });
    }
  });

  // Newest first.
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round0(n: number): number {
  return Math.round(n);
}

/** Long vs short P&L split for the Attribution tab, from open positions. */
export function attributionBySide(positions: PositionRow[]): {
  longPnl: number;
  shortPnl: number;
  longCount: number;
  shortCount: number;
} {
  let longPnl = 0;
  let shortPnl = 0;
  let longCount = 0;
  let shortCount = 0;
  for (const pos of positions) {
    if (pos.side === "short") {
      shortPnl += pos.unrealizedPnl;
      shortCount += 1;
    } else {
      longPnl += pos.unrealizedPnl;
      longCount += 1;
    }
  }
  return { longPnl, shortPnl, longCount, shortCount };
}
