"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, GitCompare } from "lucide-react";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/tooltip";
import { MultiDistributionChart, type DistSeries } from "@/components/charts/multi-distribution-chart";
import { compareModels, MODEL_COLOR, MODEL_LABEL } from "@/lib/arena";
import { fmtSignedPct, fmtPct } from "@/lib/format";
import type { ExpiryAnalysis, TickerAnalysis } from "@/lib/analysis";
import type { AIScenarioResult, SubjectiveView } from "@/lib/types";

/**
 * The Arena tab: the market, your view, the Street, and (on demand) the AI
 * analyst on one axis, plus a total-variation disagreement matrix. The further
 * two curves sit apart, the more they disagree, and the bigger the edge if you
 * are the one who is right.
 */
export function ModelArena({
  analysis,
  expiry,
  expiryIndex,
  userView,
  aiEnabled,
}: {
  analysis: TickerAnalysis;
  expiry: ExpiryAnalysis;
  expiryIndex: number;
  userView: SubjectiveView;
  aiEnabled: boolean;
}) {
  const [aiView, setAiView] = React.useState<SubjectiveView | null>(null);
  const [loadingAI, setLoadingAI] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  // A generated AI view is tied to one expiry; drop it when the analyst switches.
  React.useEffect(() => {
    setAiView(null);
    setAiError(null);
  }, [expiryIndex]);

  const comparison = React.useMemo(
    () => compareModels({ analysis, expiry, userView, aiView }),
    [analysis, expiry, userView, aiView],
  );

  const chartSeries: DistSeries[] = comparison.series.map((s) => ({
    key: s.source,
    label: s.label,
    color: MODEL_COLOR[s.source],
    points: s.distribution.points,
  }));

  const hasAI = comparison.series.some((s) => s.source === "ai");

  const generateAI = async () => {
    setLoadingAI(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: analysis.ticker, expiryIndex }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const result = (await res.json()) as AIScenarioResult;
      setAiView({
        ticker: analysis.ticker,
        horizon: expiry.expiry,
        spreadMultiplier: 1,
        scenarios: result.scenarios,
      });
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader>
          <PanelTitle>Model arena · every view on one axis</PanelTitle>
          <InfoHint>
            The market-implied distribution, your view, the Street, and the AI analyst, all fit on the
            same price grid. The further two curves sit apart, the more they disagree, and the more
            edge there is if you are the one who is right.
          </InfoHint>
        </PanelHeader>
        <PanelBody className="space-y-3">
          <MultiDistributionChart series={chartSeries} forward={expiry.forward} />

          {/* legend + per-model edge vs the forward */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {comparison.series.map((s) => (
              <span key={s.source} className="flex items-center gap-1.5 text-[12px]">
                <i className="inline-block h-2 w-3 rounded-sm" style={{ background: MODEL_COLOR[s.source] }} />
                <span className="text-muted">{s.label}</span>
                {s.source !== "market" && (
                  <span className="mono" style={{ color: s.edgePct >= 0 ? "var(--up)" : "var(--down)" }}>
                    {fmtSignedPct(s.edgePct)}
                  </span>
                )}
              </span>
            ))}
          </div>

          {aiEnabled && !hasAI && (
            <div>
              <Button variant="outline" size="sm" onClick={generateAI} disabled={loadingAI}>
                <Sparkles className="h-3.5 w-3.5" />
                {loadingAI ? "Reasoning…" : "Add the AI analyst"}
              </Button>
              {aiError && <p className="mt-1 text-[12px] text-down">{aiError}</p>}
            </div>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Disagreement</PanelTitle>
          <span className="text-[12px] text-faint">total-variation distance · 0 = identical</span>
        </PanelHeader>
        <PanelBody className="p-0">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-faint">
                <th className="px-3 py-2 font-medium">Pair</th>
                <th className="px-3 py-2 text-right font-medium">Disagreement</th>
                <th className="px-3 py-2 text-right font-medium">Mean gap</th>
              </tr>
            </thead>
            <tbody>
              {comparison.pairwise
                .slice()
                .sort((a, b) => b.totalVariation - a.totalVariation)
                .map((p) => (
                  <tr key={`${p.a}-${p.b}`} className="border-b border-line/60">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <i className="inline-block h-2 w-2 rounded-full" style={{ background: MODEL_COLOR[p.a] }} />
                        <span className="text-muted">{MODEL_LABEL[p.a]}</span>
                        <span className="text-faint">vs</span>
                        <i className="inline-block h-2 w-2 rounded-full" style={{ background: MODEL_COLOR[p.b] }} />
                        <span className="text-muted">{MODEL_LABEL[p.b]}</span>
                      </span>
                    </td>
                    <td className="mono px-3 py-2 text-right text-fg">{fmtPct(p.totalVariation, 0)}</td>
                    <td
                      className="mono px-3 py-2 text-right"
                      style={{
                        color:
                          Math.abs(p.meanGapPct) < 0.005
                            ? "var(--faint)"
                            : p.meanGapPct >= 0
                              ? "var(--up)"
                              : "var(--down)",
                      }}
                    >
                      {fmtSignedPct(p.meanGapPct)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </PanelBody>
      </Panel>

      <Link href="/arena" className="block">
        <Button variant="ghost" size="sm" className="w-full justify-center">
          <GitCompare className="h-3.5 w-3.5" />
          Which model has actually been right? See the scoreboard →
        </Button>
      </Link>
    </div>
  );
}
