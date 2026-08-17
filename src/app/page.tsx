import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { UNIVERSE } from "@/lib/config";
import { getScreenerRows } from "@/lib/screener";
import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { MorningScan } from "@/components/morning-scan";

const PRINCIPLES = [
  { n: "01", k: "Distributions", t: "See the shape", d: "Reconstruct the market's full risk-neutral density from option chains, then compare it with a Street-informed view." },
  { n: "02", k: "Expected value", t: "Turn gaps into trades", d: "Move from disagreement to structure-level EV instead of stopping at another static price target." },
  { n: "03", k: "Calibration", t: "Score the process", d: "Track probabilistic calls with Brier scores so research quality compounds beyond any single outcome." },
];

export default async function Home() {
  const rows = await getScreenerRows({ snapshotOnly: true });

  return (
    <div>
      <MorningScan tickers={UNIVERSE.map((entry) => entry.ticker)} />

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow text-accent">Why Riptide</div>
            <h2 className="display mt-1 text-2xl font-semibold text-fg">Research that ends in odds, EV, and accountability.</h2>
          </div>
          <Link href="/methodology" className="mono hidden text-[11px] uppercase tracking-wider text-info hover:underline sm:block">Read methodology →</Link>
        </div>
        <div className="grid border border-line bg-panel sm:grid-cols-3 sm:divide-x sm:divide-line">
          {PRINCIPLES.map((principle) => (
            <article key={principle.n} className="border-b border-line p-5 last:border-b-0 sm:border-b-0">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-accent">{principle.k}</span>
                <span className="mono text-[10px] text-faint">{principle.n}</span>
              </div>
              <h3 className="display mt-8 text-xl font-semibold text-fg">{principle.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{principle.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <div className="eyebrow">Expanded demo universe</div>
            <h2 className="display mt-1 text-xl font-semibold text-fg">16 names, one comparable signal layer</h2>
          </div>
          <Link href="/screener" className="mono text-[11px] uppercase tracking-wider text-info hover:underline">Open screener →</Link>
        </div>
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line bg-panel">
                {["Ticker", "Last", "Chg", "ATM IV", "RV 30d", "VRP", "Exp move", "Catalyst"].map((heading, index) => (
                  <th key={heading} className={`eyebrow px-3.5 py-2.5 ${index === 0 ? "text-left" : "text-right"}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="mono">
              {rows.map((row) => (
                <tr key={row.ticker} className="group border-b border-line/50 last:border-0 hover:bg-panel">
                  <td className="px-3.5 py-2.5">
                    <Link href={`/t/${row.ticker}`} className="flex items-center gap-2.5">
                      <span className="w-12 font-semibold text-fg group-hover:text-accent">{row.ticker}</span>
                      <span className="text-faint">{row.name}</span>
                      <ArrowUpRight className="ml-auto h-3 w-3 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-fg">{fmtMoney(row.spot)}</td>
                  <td className={`px-3.5 py-2.5 text-right ${row.changePct >= 0 ? "text-up" : "text-down"}`}>{fmtSignedPct(row.changePct)}</td>
                  <td className="px-3.5 py-2.5 text-right text-accent">{fmtPct(row.atmIV, 1)}</td>
                  <td className="px-3.5 py-2.5 text-right text-muted">{fmtPct(row.realizedVol, 1)}</td>
                  <td className={`px-3.5 py-2.5 text-right ${row.vrp >= 0 ? "text-up" : "text-down"}`}>{row.vrp >= 0 ? "+" : ""}{(row.vrp * 100).toFixed(1)}</td>
                  <td className="px-3.5 py-2.5 text-right text-fg">±{fmtPct(row.expectedMovePct, 1)}</td>
                  <td className="px-3.5 py-2.5 text-right">{row.nextCatalyst ? <Badge variant="warn">earnings</Badge> : <span className="text-faint">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
