/**
 * SEC EDGAR — the free, no-auth credibility anchor and catalyst/filing source.
 *
 * EDGAR REQUIRES a descriptive User-Agent (name + contact) or it silently 403s.
 * Best-effort: callers fall back to snapshot company facts on any failure.
 */

import type { CompanyFacts, FinancialMetric } from "@/lib/types";

const UA = "Sigma Research Demo (matthewoshin@gmail.com)";
const HEADERS = { "User-Agent": UA, Accept: "application/json" };

let tickerCikCache: Record<string, string> | null = null;

async function loadTickerCikMap(): Promise<Record<string, string>> {
  if (tickerCikCache) return tickerCikCache;
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", { headers: HEADERS });
  if (!res.ok) throw new Error(`EDGAR ticker map ${res.status}`);
  const raw = (await res.json()) as Record<string, { ticker: string; cik_str: number; title: string }>;
  const map: Record<string, string> = {};
  for (const k of Object.keys(raw)) {
    const row = raw[k];
    map[row.ticker.toUpperCase()] = String(row.cik_str).padStart(10, "0");
  }
  tickerCikCache = map;
  return map;
}

export async function getCikForTicker(ticker: string): Promise<string | null> {
  try {
    const map = await loadTickerCikMap();
    return map[ticker.toUpperCase()] ?? null;
  } catch {
    return null;
  }
}

/** Pull a few headline GAAP line items from the companyfacts XBRL endpoint. */
export async function getCompanyFactsLive(ticker: string): Promise<CompanyFacts | null> {
  const cik = await getCikForTicker(ticker);
  if (!cik) return null;

  const factsRes = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
    headers: HEADERS,
  });
  if (!factsRes.ok) return null;
  const facts = (await factsRes.json()) as {
    entityName: string;
    facts: { "us-gaap"?: Record<string, { units: Record<string, { end: string; val: number; fy: number; fp: string; form: string }[]> }> };
  };

  const gaap = facts.facts["us-gaap"] ?? {};
  const metrics: FinancialMetric[] = [];
  const pick = (concept: string, label: string) => {
    const node = gaap[concept];
    if (!node) return;
    const usd = node.units["USD"];
    if (!usd?.length) return;
    const latest = usd[usd.length - 1];
    metrics.push({ label, value: latest.val, unit: "USD", period: `${latest.fp} ${latest.fy}` });
  };
  pick("Revenues", "Revenue");
  pick("RevenueFromContractWithCustomerExcludingAssessedTax", "Revenue");
  pick("NetIncomeLoss", "Net income");
  pick("Assets", "Total assets");

  const filings = await getRecentFilings(ticker);
  return {
    ticker: ticker.toUpperCase(),
    cik,
    name: facts.entityName,
    metrics,
    latestFilings: filings,
  };
}

export async function getRecentFilings(
  ticker: string,
): Promise<{ form: string; filed: string; url: string }[]> {
  const cik = await getCikForTicker(ticker);
  if (!cik) return [];
  const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: HEADERS });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    filings: { recent: { form: string[]; filingDate: string[]; accessionNumber: string[]; primaryDocument: string[] } };
  };
  const r = data.filings.recent;
  const out: { form: string; filed: string; url: string }[] = [];
  for (let i = 0; i < r.form.length && out.length < 6; i++) {
    if (!["10-K", "10-Q", "8-K"].includes(r.form[i])) continue;
    const acc = r.accessionNumber[i].replace(/-/g, "");
    out.push({
      form: r.form[i],
      filed: r.filingDate[i],
      url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/${r.primaryDocument[i]}`,
    });
  }
  return out;
}
