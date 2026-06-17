import { fmtPct } from "@/lib/format";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Stat } from "@/components/ui/misc";
import { InfoHint } from "@/components/ui/tooltip";
import { SmileChart } from "@/components/charts/smile-chart";
import type { TickerAnalysis, ExpiryAnalysis } from "@/lib/analysis";

export function VolPanel({ analysis, expiry }: { analysis: TickerAnalysis; expiry: ExpiryAnalysis }) {
  const vrp = analysis.vrp;
  const vrpTone = vrp.vrp > 0.005 ? "up" : vrp.vrp < -0.005 ? "down" : "flat";

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Volatility · IV vs Realized</PanelTitle>
        <InfoHint>
          The implied (risk-neutral) distribution is NOT the real-world one. Risk aversion inflates
          downside probabilities; the persistent gap (IV &gt; subsequently-realized vol) is the
          volatility risk premium. Signal, not guarantee — vol mean-reverts but timing is regime-
          dependent.
        </InfoHint>
      </PanelHeader>
      <PanelBody className="space-y-3">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Stat label="ATM implied" value={fmtPct(vrp.atmIV, 1)} tone="accent" />
          <Stat label="Realized 21d" value={fmtPct(vrp.realizedVol21, 1)} />
          <Stat label="Realized 30d" value={fmtPct(vrp.realizedVol30, 1)} />
          <Stat label="VRP (IV − RV)" value={`${vrp.vrp >= 0 ? "+" : ""}${(vrp.vrp * 100).toFixed(1)} pts`} tone={vrpTone} />
        </div>
        <p className="text-[11px] leading-snug text-muted">{vrp.note}</p>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-faint">
            Implied-vol smile · {expiry.expiry}
          </div>
          <SmileChart smile={expiry.smile} forward={expiry.forward} height={170} />
        </div>
      </PanelBody>
    </Panel>
  );
}
