import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getScreenerRows } from "@/lib/screener";
import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/misc";
import { HeroDistribution } from "@/components/hero-distribution";

const MANIFESTO = [
  { k: "Distributions", t: "Not a number, a shape", d: "The market's full risk-neutral density from the live option chain — Breeden-Litzenberger — overlaid with your own view." },
  { k: "Expected value", t: "Research that ends in a bet", d: "Every thesis resolves to EV and a half-Kelly size, not a price target. A name can be a buy when consensus is the modal case." },
  { k: "Calibration", t: "Were your odds any good?", d: "Score your own probabilistic calls with a Brier score and reliability diagram. Process over outcome." },
];

export default async function Home() {
  const rows = await getScreenerRows();

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-line curve-bg">
        <div className="absolute inset-0 grid-bg" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <div className="eyebrow">Equity research · in distributions</div>
            <h1 className="display mt-5 text-4xl font-semibold leading-[1.05] text-fg sm:text-5xl">
              Your terminal tells you the number.
              <br />
              <span className="text-accent">Oshin tells you the odds.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              Every research tool ships a point estimate where the honest answer is a distribution.
              Oshin puts your view and the options-implied distribution on one axis, quantifies the
              gap as expected value, sizes the bet with half-Kelly, and scores your calibration over
              time.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/t/SPY"
                className="mono flex h-9 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-accent-deep"
              >
                Open SPY <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <span className="flex items-center gap-2 text-sm text-faint">
                or <Kbd>⌘K</Kbd> for any ticker
              </span>
            </div>
          </div>

          {/* signature */}
          <div className="rounded-md border border-line bg-panel/60">
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
              <span className="eyebrow">SPY · 30d · implied vs view</span>
              <span className="mono text-[12px] text-up">edge +3.1%</span>
            </div>
            <div className="px-3 py-4">
              <HeroDistribution />
            </div>
          </div>
        </div>
      </section>

      {/* manifesto */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid rounded-md border border-line bg-panel sm:grid-cols-3 sm:divide-x sm:divide-line">
          {MANIFESTO.map((m) => (
            <div key={m.k} className="border-b border-line p-5 last:border-b-0 sm:border-b-0">
              <div className="eyebrow text-accent">{m.k}</div>
              <div className="display mt-2 text-lg font-semibold text-fg">{m.t}</div>
              <p className="mt-1.5 text-sm leading-snug text-muted">{m.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* watchlist */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="eyebrow">Watchlist · implied vol &amp; expected move</h2>
          <Link href="/screener" className="mono text-[13px] text-info hover:underline">
            full edge screener →
          </Link>
        </div>
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-panel">
                {["Ticker", "Last", "Chg", "ATM IV", "RV 30d", "VRP", "Exp move", "Earnings"].map((h, i) => (
                  <th
                    key={h}
                    className={`eyebrow px-3.5 py-2.5 ${i === 0 ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="mono">
              {rows.map((r) => (
                <tr key={r.ticker} className="group border-b border-line/50 last:border-0 hover:bg-panel">
                  <td className="px-3.5 py-2.5">
                    <Link href={`/t/${r.ticker}`} className="flex items-center gap-2.5">
                      <span className="w-12 font-semibold text-fg group-hover:text-accent">{r.ticker}</span>
                      <span className="hidden text-faint sm:inline">{r.name}</span>
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-fg">{fmtMoney(r.spot)}</td>
                  <td className={`px-3.5 py-2.5 text-right ${r.changePct >= 0 ? "text-up" : "text-down"}`}>
                    {fmtSignedPct(r.changePct)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-accent">{fmtPct(r.atmIV, 1)}</td>
                  <td className="px-3.5 py-2.5 text-right text-muted">{fmtPct(r.realizedVol, 1)}</td>
                  <td className={`px-3.5 py-2.5 text-right ${r.vrp >= 0 ? "text-up" : "text-down"}`}>
                    {r.vrp >= 0 ? "+" : ""}
                    {(r.vrp * 100).toFixed(1)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-fg">±{fmtPct(r.expectedMovePct, 1)}</td>
                  <td className="px-3.5 py-2.5 text-right">
                    {r.nextCatalyst ? <Badge variant="warn">soon</Badge> : <span className="text-faint">—</span>}
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
