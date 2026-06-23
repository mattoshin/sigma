"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TickerHeader } from "./ticker-header";
import { ExpectedMoveStrip } from "./expected-move-strip";
import { ModelLab } from "./model-lab";
import { ModelArena } from "./model-arena";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VolPanel } from "./vol-panel";
import { AIPanel } from "./ai-panel";
import { CompanyFactsPanel } from "./company-facts";
import { TrackCallDialog } from "./track-call-dialog";
import { StreetPanel } from "./street-panel";
import { DistributionChart } from "@/components/charts/distribution-chart";
import { PriceChart } from "@/components/charts/price-chart";
import { nearestByPrice } from "@/components/charts/chart-utils";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { computeEdge, makeDefaultView, makeViewFromStreet, scenariosFromAI } from "@/lib/edge";
import type { TickerAnalysis } from "@/lib/analysis";
import type { ModelSource, Scenario, SubjectiveView } from "@/lib/types";

function defaultExpiryIndex(analysis: TickerAnalysis): number {
  const earnings = analysis.expiries.findIndex((e) => e.earnings);
  if (earnings >= 0) return earnings;
  const monthly = analysis.expiries.findIndex((e) => e.dte >= 25);
  return monthly >= 0 ? monthly : 0;
}

export function TickerWorkspace({ analysis, aiEnabled }: { analysis: TickerAnalysis; aiEnabled: boolean }) {
  const [expiryIdx, setExpiryIdx] = React.useState(() => defaultExpiryIndex(analysis));
  const expiry = analysis.expiries[expiryIdx];
  const [view, setView] = React.useState<SubjectiveView>(() =>
    makeDefaultView(analysis.ticker, expiry, analysis.spot),
  );
  // Which model produced the current view, so tracked calls are attributed to
  // it on the Arena scoreboard. Editing in the Model Lab (or loading a preset)
  // makes the view the analyst's own.
  const [activeSource, setActiveSource] = React.useState<ModelSource>("user");

  const setUserView = React.useCallback((v: SubjectiveView) => {
    setView(v);
    setActiveSource("user");
  }, []);

  // Reset the view when the analyst switches expiry.
  React.useEffect(() => {
    setView(makeDefaultView(analysis.ticker, analysis.expiries[expiryIdx], analysis.spot));
    setActiveSource("user");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiryIdx]);

  const edge = React.useMemo(
    () => computeEdge(view, expiry, analysis.spot, analysis.riskFreeRate, analysis.dividendYield),
    [view, expiry, analysis.spot, analysis.riskFreeRate, analysis.dividendYield],
  );

  const applyAI = (scenarios: Scenario[]) => {
    setView((v) => ({ ...v, scenarios: scenariosFromAI(scenarios) }));
    setActiveSource("ai");
  };

  const subjForwardProb = 1 - nearestByPrice(edge.subjective.points, expiry.forward).cdf;
  const mktForwardProb = 1 - nearestByPrice(expiry.rnd.points, expiry.forward).cdf;

  return (
    <div>
      <TickerHeader analysis={analysis} />
      <div className="space-y-4 p-4">
        {/* expiry selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] uppercase tracking-wider text-faint">Expiry</span>
          {analysis.expiries.map((e, i) => (
            <button
              key={e.expiry}
              onClick={() => setExpiryIdx(i)}
              className={cn(
                "mono rounded-sm border px-2.5 py-1 text-sm transition-colors",
                i === expiryIdx
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-muted hover:text-fg",
              )}
            >
              {e.dte}D
              {e.earnings && <span className="ml-1 text-down">⚡</span>}
            </button>
          ))}
        </div>

        <ExpectedMoveStrip expiry={expiry} />

        <div className="grid gap-4 lg:grid-cols-3">
          {/* left: the hero chart + price + vol + facts */}
          <div className="space-y-4 lg:col-span-2">
            <Panel>
              <PanelHeader>
                <PanelTitle>Your view vs the market, where the edge lives</PanelTitle>
                <div className="flex items-center gap-3 text-[12px] text-muted">
                  <span className="flex items-center gap-1">
                    <i className="inline-block h-1.5 w-3 bg-info" /> implied (Q)
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="inline-block h-1.5 w-3 bg-warn" /> your view
                  </span>
                </div>
              </PanelHeader>
              <PanelBody>
                <DistributionChart
                  rnd={expiry.rnd.points}
                  subjective={edge.subjective.points}
                  forward={expiry.forward}
                  spot={analysis.spot}
                  scenarios={view.scenarios.map((s) => ({ price: s.price, label: s.label }))}
                  band={{ lower: expiry.expectedMove.lower, upper: expiry.expectedMove.upper }}
                />
                {expiry.warnings.length > 0 && (
                  <p className="mt-1 text-[12px] text-warn">⚠ {expiry.warnings.join(" · ")}</p>
                )}
                <p className="mt-2 text-[13px] leading-snug text-muted">
                  Hover to read the market&apos;s odds vs your odds at any price. Green = you assign
                  more probability than the market is pricing; red = less.{" "}
                  <span className="text-faint">
                    The implied curve is risk-neutral (Q), not real-world odds, see the VRP panel.
                  </span>
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader>
                <PanelTitle>Price · with expected-move band</PanelTitle>
              </PanelHeader>
              <PanelBody>
                <PriceChart
                  bars={analysis.history}
                  band={{
                    upper: expiry.expectedMove.upper,
                    lower: expiry.expectedMove.lower,
                    movePct: expiry.expectedMove.movePct,
                  }}
                />
              </PanelBody>
            </Panel>

            <div className="grid gap-4 md:grid-cols-2">
              <VolPanel analysis={analysis} expiry={expiry} />
              <CompanyFactsPanel facts={analysis.companyFacts} dcf={analysis.dcf} keyRatios={analysis.keyRatios} />
            </div>
          </div>

          {/* right: author a model in the Lab, then stack them all in the Arena */}
          <div>
            <Tabs defaultValue="lab">
              <TabsList>
                <TabsTrigger value="lab">Model Lab</TabsTrigger>
                <TabsTrigger value="arena">Arena</TabsTrigger>
              </TabsList>

              <TabsContent value="lab" className="space-y-4 pt-4">
                <ModelLab
                  ticker={analysis.ticker}
                  view={view}
                  setView={setUserView}
                  edge={edge}
                  onReset={() => setUserView(makeDefaultView(analysis.ticker, expiry, analysis.spot))}
                />
                <div className="flex justify-end">
                  <TrackCallDialog
                    ticker={analysis.ticker}
                    horizon={expiry.expiry}
                    forward={expiry.forward}
                    subjectiveProbAbove={subjForwardProb}
                    marketProbAbove={mktForwardProb}
                    modelSource={activeSource}
                  />
                </div>
                {analysis.analysts && (
                  <StreetPanel
                    analysts={analysis.analysts}
                    spot={analysis.spot}
                    ratingActions={analysis.ratingActions}
                    onSeed={() => {
                      setView(makeViewFromStreet(analysis.ticker, expiry, analysis.spot, analysis.analysts!));
                      setActiveSource("street");
                    }}
                  />
                )}
                <AIPanel
                  ticker={analysis.ticker}
                  expiryIndex={expiryIdx}
                  aiEnabled={aiEnabled}
                  onApply={applyAI}
                />
              </TabsContent>

              <TabsContent value="arena" className="pt-4">
                <ModelArena
                  analysis={analysis}
                  expiry={expiry}
                  expiryIndex={expiryIdx}
                  userView={view}
                  aiEnabled={aiEnabled}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
