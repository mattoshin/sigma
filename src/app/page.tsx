import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getScreenerRows } from "@/lib/screener";
import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/misc";

export default async function Home() {
  const rows = await getScreenerRows();

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 grid-bg" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-16">
          <div className="mono text-[11px] uppercase tracking-[0.3em] text-accent">
            Equity research · in distributions
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-fg sm:text-4xl">
            Your terminal tells you the number.
            <br />
            <span className="text-accent">Sigma tells you the odds</span> — and where your odds
            disagree with the market&apos;s price.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            Every other research tool ships a point estimate where the honest answer is a
            distribution. Sigma puts your view and the options-implied (risk-neutral) distribution on
            one axis, quantifies the gap as expected value, sizes the bet with half-Kelly, and scores
            your own calibration over time.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/t/SPY"
              className="flex h-9 items-center gap-2 rounded-sm border border-accent/40 bg-accent/15 px-4 text-xs font-medium text-accent hover:bg-accent/25"
            >
              Open SPY <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <span className="flex items-center gap-2 text-xs text-faint">
              or press <Kbd>⌘K</Kbd> to jump to any ticker
            </span>
          </div>
        </div>
      </section>

      {/* differentiators */}
      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              t: "Distributions, not targets",
              d: "The market's full risk-neutral density from the live option chain (Breeden-Litzenberger), overlaid with your own view.",
            },
            {
              t: "Expected value, not price targets",
              d: "Every thesis ends in EV and a half-Kelly size. A name can be a buy even when consensus is the modal case.",
            },
            {
              t: "Calibration, scored",
              d: "Track your probabilistic calls and grade them with a Brier score and reliability diagram. Process over outcome.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-md border border-line bg-panel p-4">
              <div className="text-xs font-semibold text-fg">{c.t}</div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* watchlist tape */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Watchlist · implied vol &amp; expected move
          </h2>
          <Link href="/screener" className="text-[11px] text-info hover:underline">
            full edge screener →
          </Link>
        </div>
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line bg-panel text-[10px] uppercase tracking-wide text-faint">
                <th className="px-3 py-2 text-left font-medium">Ticker</th>
                <th className="px-3 py-2 text-right font-medium">Last</th>
                <th className="px-3 py-2 text-right font-medium">Chg</th>
                <th className="px-3 py-2 text-right font-medium">ATM IV</th>
                <th className="px-3 py-2 text-right font-medium">RV 30d</th>
                <th className="px-3 py-2 text-right font-medium">VRP</th>
                <th className="px-3 py-2 text-right font-medium">Exp move</th>
                <th className="px-3 py-2 text-right font-medium">Earnings</th>
              </tr>
            </thead>
            <tbody className="mono">
              {rows.map((r) => (
                <tr key={r.ticker} className="border-b border-line/60 last:border-0 hover:bg-panel">
                  <td className="px-3 py-2">
                    <Link href={`/t/${r.ticker}`} className="flex items-center gap-2">
                      <span className="w-12 font-semibold text-fg">{r.ticker}</span>
                      <span className="hidden text-faint sm:inline">{r.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right text-fg">{fmtMoney(r.spot)}</td>
                  <td className={`px-3 py-2 text-right ${r.changePct >= 0 ? "text-up" : "text-down"}`}>
                    {fmtSignedPct(r.changePct)}
                  </td>
                  <td className="px-3 py-2 text-right text-accent">{fmtPct(r.atmIV, 1)}</td>
                  <td className="px-3 py-2 text-right text-muted">{fmtPct(r.realizedVol, 1)}</td>
                  <td className={`px-3 py-2 text-right ${r.vrp >= 0 ? "text-up" : "text-down"}`}>
                    {r.vrp >= 0 ? "+" : ""}
                    {(r.vrp * 100).toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right text-fg">±{fmtPct(r.expectedMovePct, 1)}</td>
                  <td className="px-3 py-2 text-right">
                    {r.nextCatalyst ? (
                      <Badge variant="warn">soon</Badge>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
