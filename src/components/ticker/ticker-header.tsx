import { fmtMoney, fmtSigned, fmtSignedPct, daysUntil, tone } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/misc";
import { ProvenanceLine } from "@/components/ui/provenance";
import type { TickerAnalysis } from "@/lib/analysis";

export function TickerHeader({ analysis }: { analysis: TickerAnalysis }) {
  const q = analysis.quote;
  const t = tone(q.change);
  const earnings = analysis.catalysts.find((c) => c.type === "earnings");
  const dte = earnings ? daysUntil(earnings.date) : null;

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-4 py-3">
      <div className="flex items-end gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="mono text-2xl font-semibold tracking-wide text-fg">{analysis.ticker}</h1>
            <Badge variant="outline">{analysis.sector}</Badge>
          </div>
          <div className="text-xs text-muted">{analysis.name}</div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="mono text-2xl font-semibold text-fg">{fmtMoney(q.price)}</span>
          <span className={`mono text-sm ${t === "up" ? "text-up" : t === "down" ? "text-down" : "text-muted"}`}>
            {fmtSigned(q.change)} ({fmtSignedPct(q.changePct)})
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-3 text-[11px] text-muted">
          {dte != null && (
            <span className="flex items-center gap-1">
              <StatusDot tone="warn" live />
              <span className="mono">Earnings in {dte}d</span>
            </span>
          )}
          <span className="mono">
            ATM IV {(analysis.expiries[0]?.atmIV * 100 || 0).toFixed(1)}%
          </span>
        </div>
        <ProvenanceLine provenance={analysis.chainProvenance} />
      </div>
    </div>
  );
}
