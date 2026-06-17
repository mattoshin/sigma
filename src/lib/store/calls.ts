/**
 * Tracked-call store, the calibration white space.
 *
 * File-backed for local dev (.data/calls.json, gitignored). The interface is
 * deliberately thin so it can be reimplemented against Supabase later without
 * touching callers. Seeded on first run with historical resolved calls that
 * exhibit realistic mild overconfidence, so the reliability diagram and the
 * "are you overconfident?" readout tell a true story out of the box.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { TrackedCall } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "calls.json");

let cache: TrackedCall[] | null = null;

// [predictedProb, outcome, ticker, claim]
const SEED_SPECS: [number, boolean, string, string][] = [
  [0.9, true, "SPY", "Finishes the month above the forward"],
  [0.9, true, "MSFT", "Holds $450 through monthly expiry"],
  [0.85, true, "AAPL", "Beats consensus EPS into the print"],
  [0.85, false, "TSLA", "Exceeds the implied move on earnings"],
  [0.8, true, "NVDA", "Closes above forward at Feb expiry"],
  [0.8, true, "QQQ", "Positive over the next 30 days"],
  [0.8, false, "AMD", "Holds the 200-day on the quarter"],
  [0.7, true, "META", "Implied move under-prices the print"],
  [0.7, true, "SPY", "Stays inside the 1-sigma band"],
  [0.7, false, "NVDA", "Gaps up post-earnings"],
  [0.65, true, "AAPL", "Outperforms QQQ over the month"],
  [0.65, false, "TSLA", "Finishes above $250"],
  [0.6, true, "MSFT", "Beats on cloud revenue"],
  [0.6, false, "AMD", "Above forward at expiry"],
  [0.6, true, "QQQ", "Realized vol stays under implied"],
  [0.6, false, "META", "Closes the gap within two weeks"],
  [0.55, true, "SPY", "Up week into FOMC"],
  [0.55, false, "NVDA", "Implied move is too rich"],
  [0.5, true, "AAPL", "Flat-to-up on guidance"],
  [0.5, false, "TSLA", "Delivers above whisper number"],
  [0.45, true, "AMD", "Reclaims prior high on the quarter"],
  [0.45, false, "META", "Beats and holds the move"],
  [0.35, false, "TSLA", "Doubles the implied move"],
  [0.35, true, "NVDA", "Tags the upper expected-move band"],
  [0.3, false, "AMD", "Breaks out above range"],
  [0.3, false, "SPY", "Down 5% on the month"],
  [0.25, false, "QQQ", "Corrects more than 7%"],
];

function buildSeed(): TrackedCall[] {
  const now = Date.now();
  return SEED_SPECS.map((spec, i) => {
    const [p, outcome, ticker, claim] = spec;
    const daysAgo = 30 + i * 9; // spread across roughly the last year
    const horizon = 30;
    const createdAt = new Date(now - daysAgo * 86_400_000).toISOString();
    const resolvedAt = new Date(now - (daysAgo - horizon) * 86_400_000).toISOString();
    // A plausible market-implied prob slightly less extreme than the user's.
    const marketImpliedProb = Math.min(0.92, Math.max(0.08, 0.5 + (p - 0.5) * 0.7));
    return {
      id: `seed-${i}`,
      ticker,
      createdAt,
      horizon: resolvedAt.slice(0, 10),
      claim: `${ticker}: ${claim}`,
      predictedProb: p,
      marketImpliedProb,
      resolved: true,
      outcome,
      resolvedAt,
    };
  });
}

async function readAll(): Promise<TrackedCall[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    cache = JSON.parse(raw) as TrackedCall[];
  } catch {
    cache = buildSeed();
    await writeAll(cache);
  }
  return cache;
}

async function writeAll(calls: TrackedCall[]): Promise<void> {
  cache = calls;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(calls, null, 2), "utf8");
}

export async function listCalls(): Promise<TrackedCall[]> {
  const all = await readAll();
  return [...all].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addCall(
  input: Omit<TrackedCall, "id" | "createdAt" | "resolved" | "outcome" | "resolvedAt">,
): Promise<TrackedCall> {
  const all = await readAll();
  const call: TrackedCall = {
    ...input,
    id: `call-${Date.now()}-${all.length}`,
    createdAt: new Date().toISOString(),
    resolved: false,
  };
  await writeAll([call, ...all]);
  return call;
}

export async function resolveCall(id: string, outcome: boolean): Promise<TrackedCall | null> {
  const all = await readAll();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], resolved: true, outcome, resolvedAt: new Date().toISOString() };
  await writeAll(all);
  return all[idx];
}
