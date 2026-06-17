import { fmtMoney, fmtPct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/misc";
import { InfoHint } from "@/components/ui/tooltip";
import type { ExpiryAnalysis } from "@/lib/analysis";

/**
 * The vol-literate top strip. Demonstrates second-order vol literacy: being
 * right on direction can still lose to IV crush.
 */
export function ExpectedMoveStrip({ expiry }: { expiry: ExpiryAnalysis }) {
  const em = expiry.expectedMove;
  return (
    <div className="rounded-md border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
        <Stat
          label="Expected move"
          value={`±${fmtPct(em.movePct, 1)}`}
          sub={`${fmtMoney(em.lower)} – ${fmtMoney(em.upper)}`}
          tone="accent"
        />
        <Stat label="ATM straddle" value={fmtMoney(em.straddlePrice)} sub={`× 0.85 method`} />
        <Stat label="IV method" value={fmtMoney(em.ivMethod, 2)} sub={`S·σ·√(${em.dte}/365)`} />
        <Stat label="ATM IV" value={fmtPct(em.atmIV, 1)} />
        <Stat label="Days to expiry" value={`${em.dte}`} sub={expiry.expiry} />
        {em.isEarningsExpiry && (
          <Stat label="IV crush (est.)" value={`~${fmtPct(em.ivCrushEstimate ?? 0.4, 0)}`} tone="down" sub="post-event" />
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-line px-4 py-2 text-[13px] text-muted">
        {em.isEarningsExpiry && <Badge variant="down">Earnings inside</Badge>}
        <span className="mono">
          Market is pricing <span className="text-accent">±{fmtPct(em.movePct, 1)}</span> into{" "}
          {expiry.expiry}
          {em.isEarningsExpiry
            ? `. IV likely crushes ~${fmtPct(em.ivCrushEstimate ?? 0.4, 0)} overnight regardless of direction — a right directional call can still lose long premium.`
            : "."}
        </span>
        <InfoHint>
          Two reconciling methods: EM = S·IV·√(DTE/365), and EM ≈ 0.85 × ATM straddle. The 0.85 is
          the practitioner multiplier desks quote (the straddle slightly exceeds one standard
          deviation).
        </InfoHint>
      </div>
    </div>
  );
}
