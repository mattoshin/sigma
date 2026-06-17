import { ExternalLink } from "lucide-react";
import { fmtCompact, fmtPct, fmtDate, fmtMoney, fmtSignedPct } from "@/lib/format";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { InfoHint } from "@/components/ui/tooltip";
import type { CompanyFacts } from "@/lib/types";
import type { DcfValue, KeyRatio } from "@/lib/data/providers/fmp";

function fmtRatio(r: KeyRatio): string {
  if (r.kind === "pct") return fmtPct(r.value, 1);
  if (r.kind === "x") return `${r.value.toFixed(1)}x`;
  if (r.kind === "money") return `$${fmtCompact(r.value)}`;
  return r.value.toFixed(2);
}

export function CompanyFactsPanel({
  facts,
  dcf,
  keyRatios = [],
}: {
  facts: CompanyFacts | null;
  dcf?: DcfValue | null;
  keyRatios?: KeyRatio[];
}) {
  if (!facts && !dcf && keyRatios.length === 0) return null;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Fundamentals</PanelTitle>
        {facts && <span className="mono text-[12px] text-faint">CIK {facts.cik}</span>}
      </PanelHeader>
      <PanelBody className="space-y-3">
        {/* DCF fundamental anchor (FMP) */}
        {dcf && (
          <div className="flex items-center justify-between rounded-sm border border-line bg-panel2 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-faint">
              DCF fair value
              <InfoHint>
                FMP&apos;s discounted-cash-flow estimate, a fundamental anchor to set beside the
                options-implied distribution. Model-dependent, treat as one input.
              </InfoHint>
            </span>
            <span className="mono text-sm">
              <span className="text-fg">{fmtMoney(dcf.dcf)}</span>{" "}
              <span className={dcf.upsidePct >= 0 ? "text-up" : "text-down"}>
                ({fmtSignedPct(dcf.upsidePct)})
              </span>
            </span>
          </div>
        )}

        {/* key ratios (FMP) */}
        {keyRatios.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {keyRatios.map((kr) => (
              <div key={kr.label} className="rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
                <div className="text-[11px] uppercase tracking-wide text-faint">{kr.label}</div>
                <div className="mono text-sm text-fg">{fmtRatio(kr)}</div>
              </div>
            ))}
          </div>
        )}

        {facts && facts.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {facts.metrics.map((m) => (
              <div key={m.label} className="rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
                <div className="text-[12px] uppercase tracking-wide text-faint">{m.label}</div>
                <div className="mono text-base text-fg">
                  {m.unit === "USD" ? `$${fmtCompact(m.value)}` : m.unit === "ratio" ? fmtPct(m.value, 1) : fmtCompact(m.value)}
                </div>
                <div className="text-[11px] text-faint">{m.period}</div>
              </div>
            ))}
          </div>
        )}

        {facts && facts.latestFilings.length > 0 && (
          <div>
            <div className="mb-1 text-[12px] uppercase tracking-wider text-faint">Recent filings · SEC EDGAR</div>
            <div className="space-y-1">
              {facts.latestFilings.map((f, i) => (
                <a
                  key={i}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-sm px-1 py-0.5 text-[13px] text-muted hover:bg-panel2 hover:text-info"
                >
                  <span className="mono">{f.form}</span>
                  <span className="flex items-center gap-1 text-faint">
                    {fmtDate(f.filed)} <ExternalLink className="h-3 w-3" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
