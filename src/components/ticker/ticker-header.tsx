import { fmtMoney, fmtSigned, fmtSignedPct, fmtPct, daysUntil, tone } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/misc";
import { ProvenanceLine } from "@/components/ui/provenance";
import type { TickerAnalysis } from "@/lib/analysis";

export function TickerHeader({ analysis }: { analysis: TickerAnalysis }) {
  const q = analysis.quote;
  const t = tone(q.change);
  const toneClass = t === "up" ? "text-up" : t === "down" ? "text-down" : "text-muted";
  const earnings = analysis.catalysts.find((c) => c.type === "earnings");
  const dte = earnings ? daysUntil(earnings.date) : null;

  return (
    <div className="border-b border-line px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        {/* identity + price */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="mono text-3xl font-semibold leading-none tracking-tight text-fg">
                {analysis.ticker}
              </h1>
              <Badge variant="outline">{analysis.sector}</Badge>
            </div>
            <div className="mt-1.5 text-xs text-muted">{analysis.name}</div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="mono text-3xl font-semibold leading-none text-fg">{fmtMoney(q.price)}</span>
            <span className={`mono text-sm ${toneClass}`}>
              {fmtSigned(q.change)} ({fmtSignedPct(q.changePct)})
            </span>
          </div>
        </div>

        {/* readouts */}
        <div className="flex items-end gap-6">
          {dte != null && (
            <div className="flex flex-col gap-1">
              <span className="eyebrow flex items-center gap-1.5">
                <StatusDot tone="warn" live /> Earnings
              </span>
              <span className="mono text-sm font-medium text-warn">{dte}d</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="eyebrow">ATM IV</span>
            <span className="mono text-sm font-medium text-accent">
              {fmtPct(analysis.expiries[0]?.atmIV ?? 0, 1)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">VRP</span>
            <span className={`mono text-sm font-medium ${analysis.vrp.vrp >= 0 ? "text-up" : "text-down"}`}>
              {analysis.vrp.vrp >= 0 ? "+" : ""}
              {(analysis.vrp.vrp * 100).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <ProvenanceLine provenance={analysis.chainProvenance} />
      </div>
    </div>
  );
}
