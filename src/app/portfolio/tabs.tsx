"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { fmtCompact, fmtMoney, fmtPct, fmtSignedPct, fmtDate } from "@/lib/format";
import type { PortfolioModel } from "@/lib/portfolio";
import { buildTradeLog, attributionBySide, type TradeRow } from "./derive";

function tone(n: number) {
  return n >= 0 ? "text-up" : "text-down";
}

const TAB_DEFS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "positions", label: "Positions" },
  { value: "trades", label: "Trade Log" },
  { value: "attribution", label: "Attribution" },
  { value: "prices", label: "Prices" },
];

export function PortfolioTabs({ model, dashboard }: { model: PortfolioModel; dashboard: React.ReactNode }) {
  const trades = React.useMemo(() => buildTradeLog(model), [model]);

  return (
    <Tabs defaultValue="dashboard" className="mt-3">
      <TabsList className="w-full">
        {TAB_DEFS.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="mono px-3 py-2 text-sm uppercase tracking-wider"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="dashboard">{dashboard}</TabsContent>
      <TabsContent value="positions">
        <PositionsTab model={model} />
      </TabsContent>
      <TabsContent value="trades">
        <TradeLogTab model={model} trades={trades} />
      </TabsContent>
      <TabsContent value="attribution">
        <AttributionTab model={model} />
      </TabsContent>
      <TabsContent value="prices">
        <PricesTab model={model} />
      </TabsContent>
    </Tabs>
  );
}

/* ---------------------------------------------------------------- Positions */

function PositionsTab({ model }: { model: PortfolioModel }) {
  const { capital, positions } = model;
  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line bg-panel md:grid-cols-5">
        <Cell label="Long exposure" value={`$${fmtCompact(capital.long)}`} sub={fmtPct(capital.longPct, 1)} />
        <Cell label="Short exposure" value={`$${fmtCompact(capital.short)}`} sub={fmtPct(capital.shortPct, 1)} tone="down" />
        <Cell label="Gross" value={`$${fmtCompact(capital.gross)}`} sub={fmtPct(capital.gross / model.nav, 1)} />
        <Cell label="Net" value={`$${fmtCompact(capital.net)}`} sub={fmtPct(capital.netPct, 1)} />
        <Cell label="Cash" value={`$${fmtCompact(capital.cash)}`} sub={fmtPct(capital.cashPct, 1)} />
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>Open positions</PanelTitle>
          <span className="eyebrow">
            {model.summary.openLong}L / {model.summary.openShort}S
          </span>
        </PanelHeader>
        <PanelBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-panel2/40">
                  {["Ticker", "Name", "Side", "Shares", "Avg cost", "Last", "Cost basis", "Mkt value", "Unreal P&L", "%", "Wt"].map(
                    (h, i) => (
                      <th key={h} className={`eyebrow px-3 py-2 ${i <= 2 ? "text-left" : "text-right"}`}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="mono">
                {positions.map((pos) => (
                  <tr key={pos.ticker} className="border-b border-line/50 last:border-0 hover:bg-panel2/40">
                    <td className="px-3 py-2 font-semibold text-fg">{pos.ticker}</td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-faint" title={pos.name}>
                      {pos.name}
                    </td>
                    <td className="px-3 py-2">
                      <span className={pos.side === "short" ? "text-down" : "text-muted"}>{pos.side}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted">{pos.shares.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-muted">{fmtMoney(pos.avgCost)}</td>
                    <td className="px-3 py-2 text-right text-fg">{fmtMoney(pos.last)}</td>
                    <td className="px-3 py-2 text-right text-muted">${fmtCompact(pos.costBasis)}</td>
                    <td className="px-3 py-2 text-right text-fg">${fmtCompact(pos.marketValue)}</td>
                    <td className={`px-3 py-2 text-right ${tone(pos.unrealizedPnl)}`}>
                      {pos.unrealizedPnl >= 0 ? "+" : "-"}${fmtCompact(Math.abs(pos.unrealizedPnl))}
                    </td>
                    <td className={`px-3 py-2 text-right ${tone(pos.unrealizedPct)}`}>{fmtSignedPct(pos.unrealizedPct)}</td>
                    <td className="px-3 py-2 text-right text-faint">{fmtPct(pos.weight, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      <p className="eyebrow">
        Weights are share of gross exposure. Unrealized P&L marks open lots to last price · paper, illustrative.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Trade Log */

function TradeLogTab({ model, trades }: { model: PortfolioModel; trades: TradeRow[] }) {
  const buys = trades.filter((t) => t.action === "BUY" || t.action === "SHORT").length;
  const grossTraded = trades.reduce((s, t) => s + t.value, 0);

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line bg-panel md:grid-cols-4">
        <Cell label="Lifetime trades" value={model.summary.trades.toLocaleString()} sub="since inception" />
        <Cell label="Closed lots" value={model.risk.closedLots.toLocaleString()} sub="round-trips" />
        <Cell
          label="Realized lifetime"
          value={`${model.summary.realizedLifetime >= 0 ? "+" : "-"}$${fmtCompact(Math.abs(model.summary.realizedLifetime))}`}
          sub="booked P&L"
          tone={model.summary.realizedLifetime >= 0 ? undefined : "down"}
        />
        <Cell label="Opening fills shown" value={`${trades.length}`} sub={`${buys} entries · $${fmtCompact(grossTraded)} gross`} />
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>Opening fills</PanelTitle>
          <span className="eyebrow">most recent first</span>
        </PanelHeader>
        <PanelBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-panel2/40">
                  {["Date", "Ticker", "Action", "Shares", "Fill price", "Value", "Note"].map((h, i) => (
                    <th key={h} className={`eyebrow px-3 py-2 ${i === 1 || i === 2 || i === 6 ? "text-left" : i === 0 ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="mono">
                {trades.map((t) => (
                  <tr key={t.id} className="border-b border-line/50 last:border-0 hover:bg-panel2/40">
                    <td className="px-3 py-2 text-faint">{fmtDate(t.date)}</td>
                    <td className="px-3 py-2 font-semibold text-fg">{t.ticker}</td>
                    <td className="px-3 py-2">
                      <Badge variant={t.action === "SHORT" ? "down" : t.action === "COVER" ? "warn" : "up"}>{t.action}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-muted">{t.shares.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-fg">{fmtMoney(t.price)}</td>
                    <td className="px-3 py-2 text-right text-muted">${fmtCompact(t.value)}</td>
                    <td className="px-3 py-2 text-faint">{t.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      <p className="eyebrow">
        Ledger reconstructs the entry fills behind the current book ({model.summary.trades} lifetime trades).
        Synthesized paper history, illustrative, not real executions.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- Attribution */

function AttributionTab({ model }: { model: PortfolioModel }) {
  const { contributors, detractors, startNav } = model;
  const split = attributionBySide(model.positions);
  const maxAbs = Math.max(1, ...contributors.map((r) => Math.abs(r.pnl)), ...detractors.map((r) => Math.abs(r.pnl)));

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line bg-panel md:grid-cols-4">
        <Cell
          label="Long book P&L"
          value={`${split.longPnl >= 0 ? "+" : "-"}$${fmtCompact(Math.abs(split.longPnl))}`}
          sub={`${split.longCount} names`}
          tone={split.longPnl >= 0 ? undefined : "down"}
        />
        <Cell
          label="Short book P&L"
          value={`${split.shortPnl >= 0 ? "+" : "-"}$${fmtCompact(Math.abs(split.shortPnl))}`}
          sub={`${split.shortCount} names`}
          tone={split.shortPnl >= 0 ? undefined : "down"}
        />
        <Cell
          label="Unrealized total"
          value={`${model.summary.unrealized >= 0 ? "+" : "-"}$${fmtCompact(Math.abs(model.summary.unrealized))}`}
          sub={fmtSignedPct(model.summary.unrealized / startNav, 2) + " of start NAV"}
          tone={model.summary.unrealized >= 0 ? undefined : "down"}
        />
        <Cell label="ITD return" value={fmtSignedPct(model.itdReturn)} sub={`${fmtSignedPct(model.itdVsSpy)} vs SPY`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AttributionBars title="Contributors" rows={contributors} maxAbs={maxAbs} up />
        <AttributionBars title="Detractors" rows={detractors} maxAbs={maxAbs} />
      </div>

      <p className="eyebrow">Contribution measured against start NAV (${fmtCompact(startNav)}) · paper, illustrative.</p>
    </div>
  );
}

function AttributionBars({
  title,
  rows,
  maxAbs,
  up,
}: {
  title: string;
  rows: { ticker: string; pnl: number; contributionPct: number; note: string }[];
  maxAbs: number;
  up?: boolean;
}) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className={up ? "text-up" : "text-down"}>{title}</PanelTitle>
        <span className="eyebrow">contribution to NAV</span>
      </PanelHeader>
      <PanelBody className="space-y-2.5">
        {rows.length === 0 ? (
          <div className="text-[12px] text-faint">None.</div>
        ) : (
          rows.map((r) => {
            const pct = Math.min(100, (Math.abs(r.pnl) / maxAbs) * 100);
            return (
              <div key={r.ticker} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="mono">
                    <span className="font-semibold text-fg">{r.ticker}</span>{" "}
                    <span className="text-faint">{r.note}</span>
                  </span>
                  <span className="mono">
                    <span className={r.pnl >= 0 ? "text-up" : "text-down"}>
                      {r.pnl >= 0 ? "+" : "-"}${fmtCompact(Math.abs(r.pnl))}
                    </span>{" "}
                    <span className="text-faint">{fmtSignedPct(r.contributionPct, 2)}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel2">
                  <div
                    className={`h-full rounded-full ${up ? "bg-up" : "bg-down"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </PanelBody>
    </Panel>
  );
}

/* ------------------------------------------------------------------- Prices */

function PricesTab({ model }: { model: PortfolioModel }) {
  const rows = [...model.positions].sort((a, b) => b.dayChangePct - a.dayChangePct);
  const gainers = rows.filter((r) => r.dayChangePct > 0).length;
  const losers = rows.filter((r) => r.dayChangePct < 0).length;

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="up">{gainers} up on day</Badge>
        <Badge variant="down">{losers} down on day</Badge>
        <Badge variant="warn">Delayed · sample data</Badge>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>Marks · last vs cost</PanelTitle>
          <span className="eyebrow">{rows.length} symbols</span>
        </PanelHeader>
        <PanelBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-panel2/40">
                  {["Ticker", "Name", "Last", "Day", "Avg cost", "vs Cost", "Mkt value"].map((h, i) => (
                    <th key={h} className={`eyebrow px-3 py-2 ${i <= 1 ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="mono">
                {rows.map((pos) => {
                  const vsCost = pos.avgCost ? pos.last / pos.avgCost - 1 : 0;
                  return (
                    <tr key={pos.ticker} className="border-b border-line/50 last:border-0 hover:bg-panel2/40">
                      <td className="px-3 py-2 font-semibold text-fg">{pos.ticker}</td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-faint" title={pos.name}>
                        {pos.name}
                      </td>
                      <td className="px-3 py-2 text-right text-fg">{fmtMoney(pos.last)}</td>
                      <td className={`px-3 py-2 text-right ${tone(pos.dayChangePct)}`}>{fmtSignedPct(pos.dayChangePct)}</td>
                      <td className="px-3 py-2 text-right text-muted">{fmtMoney(pos.avgCost)}</td>
                      <td className={`px-3 py-2 text-right ${tone(vsCost)}`}>{fmtSignedPct(vsCost)}</td>
                      <td className="px-3 py-2 text-right text-muted">${fmtCompact(pos.marketValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      <p className="eyebrow">
        Marks anchored to the latest sample snapshot for each symbol · &quot;vs Cost&quot; is last price over average
        cost · delayed, illustrative.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------- bits */

function Cell({ label, value, sub, tone: t }: { label: string; value: string; sub?: string; tone?: "down" }) {
  return (
    <div className="border-b border-r border-line px-3 py-2.5 last:border-r-0">
      <div className="eyebrow">{label}</div>
      <div className={`mono text-base font-semibold ${t === "down" ? "text-down" : "text-fg"}`}>{value}</div>
      {sub && <div className="mono text-[11px] text-faint">{sub}</div>}
    </div>
  );
}
