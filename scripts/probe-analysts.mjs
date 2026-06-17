// Probe: what analyst-estimate / "model" data can we get for free via yahoo-finance2?
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
try {
  yahooFinance.suppressNotices?.(["yahooSurvey"]);
} catch {}

const sym = process.argv[2] || "AAPL";
try {
  const r = await yahooFinance.quoteSummary(sym, {
    modules: ["financialData", "recommendationTrend", "earningsTrend"],
  });
  const fd = r.financialData || {};
  console.log(`\n== ${sym} price targets (financialData) ==`);
  console.log({
    targetLow: fd.targetLowPrice,
    targetMean: fd.targetMeanPrice,
    targetMedian: fd.targetMedianPrice,
    targetHigh: fd.targetHighPrice,
    numAnalysts: fd.numberOfAnalystOpinions,
    recommendationMean: fd.recommendationMean,
    recommendationKey: fd.recommendationKey,
    currentPrice: fd.currentPrice,
  });

  const rt = r.recommendationTrend?.trend?.[0];
  console.log(`\n== rating distribution (recommendationTrend, latest) ==`);
  console.log(rt);

  console.log(`\n== EPS / revenue estimate dispersion (earningsTrend) ==`);
  for (const t of (r.earningsTrend?.trend || []).slice(0, 4)) {
    console.log({
      period: t.period,
      endDate: t.endDate,
      epsAvg: t.earningsEstimate?.avg,
      epsLow: t.earningsEstimate?.low,
      epsHigh: t.earningsEstimate?.high,
      epsAnalysts: t.earningsEstimate?.numberOfAnalysts,
      revAvg: t.revenueEstimate?.avg,
      revLow: t.revenueEstimate?.low,
      revHigh: t.revenueEstimate?.high,
      revAnalysts: t.revenueEstimate?.numberOfAnalysts,
    });
  }
} catch (e) {
  console.log("PROBE FAILED:", e.message);
}
