import { ExternalLink } from "lucide-react";
import { fmtCompact, fmtPct, fmtDate } from "@/lib/format";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import type { CompanyFacts } from "@/lib/types";

export function CompanyFactsPanel({ facts }: { facts: CompanyFacts | null }) {
  if (!facts) return null;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Fundamentals · SEC EDGAR</PanelTitle>
        <span className="mono text-[10px] text-faint">CIK {facts.cik}</span>
      </PanelHeader>
      <PanelBody className="space-y-3">
        {facts.metrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {facts.metrics.map((m) => (
              <div key={m.label} className="rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-faint">{m.label}</div>
                <div className="mono text-sm text-fg">
                  {m.unit === "USD" ? `$${fmtCompact(m.value)}` : m.unit === "ratio" ? fmtPct(m.value, 1) : fmtCompact(m.value)}
                </div>
                <div className="text-[9px] text-faint">{m.period}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-faint">No headline fundamentals available.</p>
        )}

        {facts.latestFilings.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-faint">Recent filings</div>
            <div className="space-y-1">
              {facts.latestFilings.map((f, i) => (
                <a
                  key={i}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-sm px-1 py-0.5 text-[11px] text-muted hover:bg-panel2 hover:text-info"
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
