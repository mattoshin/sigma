import Link from "next/link";
import { buildTickerAnalysis } from "@/lib/analysis";
import { AI_ENABLED } from "@/lib/config";
import { TickerWorkspace } from "@/components/ticker/ticker-workspace";

export default async function TickerPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;

  let analysis;
  try {
    analysis = await buildTickerAnalysis(ticker);
  } catch (err) {
    return <ErrorView ticker={ticker} message={(err as Error).message} />;
  }

  if (analysis.expiries.length === 0) {
    return <ErrorView ticker={ticker} message="No option expiries produced a clean density (too few liquid strikes)." />;
  }

  return <TickerWorkspace analysis={analysis} aiEnabled={AI_ENABLED} />;
}

function ErrorView({ ticker, message }: { ticker: string; message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="mono text-xl font-semibold text-fg">{ticker.toUpperCase()}</h1>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <p className="mt-4 text-[11px] text-faint">
        Try one of the demo universe tickers, or set SIGMA_FORCE_LIVE=1 to pull live data.
      </p>
      <Link href="/" className="mt-4 inline-block text-xs text-info hover:underline">
        ← back to terminal
      </Link>
    </div>
  );
}
