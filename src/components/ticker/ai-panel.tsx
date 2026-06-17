"use client";

import * as React from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { AIScenarioResult, Scenario } from "@/lib/types";

export function AIPanel({
  ticker,
  expiryIndex,
  aiEnabled,
  onApply,
}: {
  ticker: string;
  expiryIndex: number;
  aiEnabled: boolean;
  onApply: (scenarios: Scenario[]) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AIScenarioResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, expiryIndex }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setResult((await res.json()) as AIScenarioResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>AI analyst · anchored scenario tree</PanelTitle>
        <Badge variant="violet">Anchored to implied</Badge>
      </PanelHeader>
      <PanelBody className="space-y-3">
        <p className="text-[13px] leading-snug text-muted">
          The model is handed the options-implied (risk-neutral) probabilities as a base rate and must
          anchor to them. We never surface a bare model probability, production LLMs are
          systematically overconfident, so we correct for it by construction.
        </p>

        {!aiEnabled ? (
          <div className="rounded-sm border border-line bg-panel2 px-3 py-2 text-[13px] text-faint">
            Set <span className="mono text-muted">ANTHROPIC_API_KEY</span> to enable the AI analyst.
            The rest of the terminal works without it.
          </div>
        ) : (
          <Button variant="accent" size="sm" onClick={generate} disabled={loading}>
            <Sparkles className="h-3.5 w-3.5" />
            {loading ? "Reasoning…" : result ? "Regenerate" : "Generate scenarios"}
          </Button>
        )}

        {error && (
          <div className="flex items-start gap-1.5 rounded-sm border border-down/40 bg-down/10 px-3 py-2 text-[13px] text-down">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {result.scenarios.map((s) => (
                <div key={s.id} className="rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="mono text-sm text-fg">
                      {s.label} · {fmtMoney(s.price)}
                    </span>
                    <Badge variant="violet">{fmtPct(s.probability, 0)}</Badge>
                  </div>
                  {s.rationale && <p className="mt-0.5 text-[12px] leading-snug text-faint">{s.rationale}</p>}
                </div>
              ))}
            </div>

            <div className="rounded-sm border border-line px-2.5 py-1.5 text-[12px] leading-snug text-muted">
              <span className="text-violet">Anchor · </span>
              {result.anchorNote}
            </div>

            {result.evidence.length > 0 && (
              <ul className="space-y-0.5 text-[12px] text-faint">
                {result.evidence.map((e, i) => (
                  <li key={i}>
                    • {e.point} <span className="text-faint/70">({e.source})</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-start gap-1.5 text-[12px] leading-snug text-warn">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{result.caveat}</span>
            </div>

            <Button variant="outline" size="sm" onClick={() => onApply(result.scenarios)}>
              Apply to studio →
            </Button>
            <div className="mono text-[11px] text-faint">model: {result.model}</div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
