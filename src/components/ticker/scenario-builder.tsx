"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/tooltip";
import { fmtPct } from "@/lib/format";
import type { Scenario, SubjectiveView } from "@/lib/types";

const LABEL_TONE: Record<string, string> = {
  Bull: "text-up",
  Base: "text-fg",
  Bear: "text-down",
};

export function ScenarioBuilder({
  view,
  setView,
  onReset,
}: {
  view: SubjectiveView;
  setView: (v: SubjectiveView) => void;
  onReset: () => void;
}) {
  const total = view.scenarios.reduce((s, x) => s + Math.max(x.probability, 0), 0) || 1;

  const patch = (id: string, p: Partial<Scenario>) =>
    setView({ ...view, scenarios: view.scenarios.map((s) => (s.id === id ? { ...s, ...p } : s)) });

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Your view · distribution studio</PanelTitle>
        <div className="flex items-center gap-2">
          <InfoHint>
            Each scenario is a probability-weighted price level. We fit a smooth density to them and
            overlay it on the options-implied distribution. Probabilities auto-normalize to 100%.
          </InfoHint>
          <Button variant="ghost" size="icon" onClick={onReset} title="Reset to expected-move default">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PanelHeader>
      <PanelBody className="space-y-4">
        {view.scenarios.map((s) => {
          const normPct = (Math.max(s.probability, 0) / total) * 100;
          return (
            <div key={s.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={LABEL_TONE[s.label] ?? "text-fg"}>
                  {s.label}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-faint">target</span>
                  <Input
                    type="number"
                    value={s.price}
                    step="0.5"
                    onChange={(e) => patch(s.id, { price: parseFloat(e.target.value) || 0 })}
                    className="h-7 w-24 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  value={[s.probability]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={([v]) => patch(s.id, { probability: v })}
                  className="flex-1"
                />
                <span className="mono w-12 text-right text-xs text-accent">{normPct.toFixed(0)}%</span>
              </div>
              {s.rationale && (
                <p className="text-[10px] leading-snug text-faint">
                  {s.source === "ai" && <span className="text-violet">AI · </span>}
                  {s.rationale}
                </p>
              )}
            </div>
          );
        })}

        <div className="border-t border-line pt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-faint">
              Conviction (band width)
            </span>
            <span className="mono text-xs text-muted">{view.spreadMultiplier.toFixed(2)}×</span>
          </div>
          <Slider
            value={[view.spreadMultiplier]}
            min={0.3}
            max={2.5}
            step={0.05}
            onValueChange={([v]) => setView({ ...view, spreadMultiplier: v })}
          />
          <p className="mt-1 text-[10px] text-faint">
            Lower = tighter, more confident scenarios. Higher = wider error bars.
          </p>
        </div>
      </PanelBody>
    </Panel>
  );
}
