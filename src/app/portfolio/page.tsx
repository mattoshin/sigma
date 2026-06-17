import { buildPortfolio } from "@/lib/portfolio";
import { PortfolioCurve } from "@/components/charts/portfolio-curve";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { fmtCompact, fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Portfolio · Oshin" };

const TABS = ["Dashboard", "Positions", "Trade Log", "Attribution", "Prices"];

function tone(n: number) {
  return n >= 0 ? "text-up" : "text-down";
}

export default function PortfolioPage() {
  const p = buildPortfolio();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="mono text-xl font-bold tracking-wide text-fg">
            {p.name} <span className="text-faint">· paper portfolio</span>
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="eyebrow">inception {fmtDate(p.inception)}</span>
            <Badge variant="warn">Paper · illustrative</Badge>
          </div>
        </div>
        <div className="flex items-end gap-8">
          <div className="flex flex-col items-end gap-1">
            <span className="eyebrow">NAV</span>
            <span className="mono text-2xl font-bold leading-none text-fg">${fmtCompact(p.nav)}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="eyebrow">Return ITD</span>
            <span className={`mono text-2xl font-bold leading-none ${tone(p.itdReturn)}`}>
              {fmtSignedPct(p.itdReturn)}
            </span>
          </div>
        </div>
      </div>

      {/* sub-nav */}
      <div className="mt-3 flex items-center gap-1 border-b border-line">
        {TABS.map((t, i) => (
          <span
            key={t}
            className={`mono -mb-px border-b-2 px-3 py-2 text-sm uppercase tracking-wider ${
              i === 0 ? "border-accent text-accent" : "border-transparent text-faint"
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      {/* summary metrics */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Inception to date" value={fmtSignedPct(p.itdReturn)} chip={`${fmtSignedPct(p.itdVsSpy)} vs SPY`} chipTone={tone(p.itdVsSpy)} big />
        <MetricCard label="Risk-adjusted ITD" value={fmtSignedPct(p.riskAdjustedItd)} sub="on deployed (ex-cash) basis" />
        <MetricCard label="YTD 2026" value={fmtSignedPct(p.ytdReturn)} chip={`${fmtSignedPct(p.ytdVsSpy)} vs SPY`} chipTone={tone(p.ytdVsSpy)} big />
        <MetricCard label="Risk-adjusted YTD" value={fmtSignedPct(p.riskAdjustedYtd)} sub="on deployed (ex-cash) basis" />
      </div>

      {/* cumulative return */}
      <Panel className="mt-4">
        <PanelHeader>
          <PanelTitle>Cumulative return · NAV vs SPY</PanelTitle>
          <span className="eyebrow">{p.curve.points} points</span>
        </PanelHeader>
        <PanelBody>
          <PortfolioCurve navIndex={p.curve.navIndex} spyIndex={p.curve.spyIndex} />
        </PanelBody>
      </Panel>

      {/* capital summary */}
      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-md border border-line bg-panel md:grid-cols-5">
        <CapitalCell label="Cash" value={`$${fmtCompact(p.capital.cash)}`} sub={fmtPct(p.capital.cashPct, 1)} />
        <CapitalCell label="Long" value={`$${fmtCompact(p.capital.long)}`} sub={fmtPct(p.capital.longPct, 1)} />
        <CapitalCell label="Short" value={`$${fmtCompact(p.capital.short)}`} sub={fmtPct(p.capital.shortPct, 1)} />
        <CapitalCell label="Gross" value={`$${fmtCompact(p.capital.gross)}`} sub={fmtPct(p.capital.gross / p.nav, 1)} />
        <CapitalCell label="Net" value={`$${fmtCompact(p.capital.net)}`} sub={fmtPct(p.capital.netPct, 1)} />
      </div>

      {/* risk & quality */}
      <div className="mt-4">
        <div className="mb-2 eyebrow">Risk &amp; quality</div>
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line bg-panel md:grid-cols-5">
          <CapitalCell label="Hit rate" value={fmtPct(p.risk.hitRate, 0)} sub={`${p.positions.length} positions`} />
          <CapitalCell label="Win / loss" value={`${p.risk.winLoss.toFixed(2)}×`} sub="avg win / avg loss" />
          <CapitalCell label="Max drawdown" value={fmtSignedPct(p.risk.maxDD, 1)} tone="down" sub={`${p.curve.points} pts`} />
          <CapitalCell label="Sharpe (rf=0)" value={p.risk.sharpe.toFixed(1)} sub="daily · annualized" />
          <CapitalCell label="Avg cash" value={fmtPct(p.risk.avgCashPct, 0)} sub="of NAV" />
        </div>
      </div>

      {/* top movers */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <MoversPanel title="Contributors" rows={p.contributors} startNav={p.startNav} />
        <MoversPanel title="Detractors" rows={p.detractors} startNav={p.startNav} />
      </div>

      {/* positions */}
      <Panel className="mt-4">
        <PanelHeader>
          <PanelTitle>Positions</PanelTitle>
          <span className="eyebrow">{p.positions.length} open</span>
        </PanelHeader>
        <PanelBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-panel2/40">
                  {["Ticker", "Side", "Shares", "Avg", "Last", "Mkt value", "Unreal P&L", "%", "Day", "Wt"].map((h, i) => (
                    <th key={h} className={`eyebrow px-3 py-2 ${i === 0 || i === 1 ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="mono">
                {p.positions.map((pos) => (
                  <tr key={pos.ticker} className="border-b border-line/50 last:border-0 hover:bg-panel2/40">
                    <td className="px-3 py-2 font-semibold text-fg">{pos.ticker}</td>
                    <td className="px-3 py-2">
                      <span className={pos.side === "short" ? "text-down" : "text-muted"}>{pos.side}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted">{pos.shares.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-muted">{fmtMoney(pos.avgCost)}</td>
                    <td className="px-3 py-2 text-right text-fg">{fmtMoney(pos.last)}</td>
                    <td className="px-3 py-2 text-right text-fg">${fmtCompact(pos.marketValue)}</td>
                    <td className={`px-3 py-2 text-right ${tone(pos.unrealizedPnl)}`}>
                      {pos.unrealizedPnl >= 0 ? "+" : "-"}${fmtCompact(Math.abs(pos.unrealizedPnl))}
                    </td>
                    <td className={`px-3 py-2 text-right ${tone(pos.unrealizedPct)}`}>{fmtSignedPct(pos.unrealizedPct)}</td>
                    <td className={`px-3 py-2 text-right ${tone(pos.dayChangePct)}`}>{fmtSignedPct(pos.dayChangePct)}</td>
                    <td className="px-3 py-2 text-right text-faint">{fmtPct(pos.weight, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      <p className="mt-4 eyebrow">
        Realized lifetime {p.summary.realizedLifetime >= 0 ? "+" : "-"}${fmtCompact(Math.abs(p.summary.realizedLifetime))} ·
        Unrealized {p.summary.unrealized >= 0 ? "+" : "-"}${fmtCompact(Math.abs(p.summary.unrealized))} ·{" "}
        {p.summary.trades} trades · {p.summary.openLong}L / {p.summary.openShort}S open · paper, illustrative, not
        investment advice
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  chip,
  chipTone,
  sub,
  big,
}: {
  label: string;
  value: string;
  chip?: string;
  chipTone?: string;
  sub?: string;
  big?: boolean;
}) {
  return (
    <Panel>
      <PanelBody className="space-y-1.5">
        <span className="eyebrow">{label}</span>
        <div className={`mono font-bold leading-none ${big ? "text-3xl text-up" : "text-2xl text-fg"}`}>{value}</div>
        {chip && (
          <span className={`mono inline-block rounded-sm border border-line bg-panel2 px-1.5 py-0.5 text-[12px] ${chipTone ?? "text-muted"}`}>
            {chip}
          </span>
        )}
        {sub && <div className="text-[12px] text-faint">{sub}</div>}
      </PanelBody>
    </Panel>
  );
}

function CapitalCell({ label, value, sub, tone: t }: { label: string; value: string; sub?: string; tone?: "down" }) {
  return (
    <div className="border-b border-r border-line px-3 py-2.5 last:border-r-0">
      <div className="eyebrow">{label}</div>
      <div className={`mono text-base font-semibold ${t === "down" ? "text-down" : "text-fg"}`}>{value}</div>
      {sub && <div className="mono text-[11px] text-faint">{sub}</div>}
    </div>
  );
}

function MoversPanel({
  title,
  rows,
  startNav,
}: {
  title: string;
  rows: { ticker: string; pnl: number; contributionPct: number; note: string }[];
  startNav: number;
}) {
  void startNav;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className={title === "Contributors" ? "text-up" : "text-down"}>{title}</PanelTitle>
        <span className="eyebrow">contribution to NAV</span>
      </PanelHeader>
      <PanelBody className="p-0">
        {rows.length === 0 ? (
          <div className="px-3 py-4 text-[12px] text-faint">None.</div>
        ) : (
          rows.map((r) => (
            <div key={r.ticker} className="flex items-center justify-between border-b border-line/50 px-3 py-2 last:border-0">
              <span className="mono text-sm">
                <span className="font-semibold text-fg">{r.ticker}</span>{" "}
                <span className="text-faint">{r.note}</span>
              </span>
              <span className="mono text-sm">
                <span className={r.pnl >= 0 ? "text-up" : "text-down"}>
                  {r.pnl >= 0 ? "+" : "-"}${fmtCompact(Math.abs(r.pnl))}
                </span>{" "}
                <span className="text-faint">{fmtSignedPct(r.contributionPct, 2)}</span>
              </span>
            </div>
          ))
        )}
      </PanelBody>
    </Panel>
  );
}
