"use client";

import * as React from "react";
import { Save, X } from "lucide-react";
import { ScenarioBuilder } from "./scenario-builder";
import { EdgeCard } from "./edge-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPresets, savePreset, deletePreset } from "@/lib/model-presets";
import type { EdgeBundle } from "@/lib/edge";
import type { ModelPreset, SubjectiveView } from "@/lib/types";

/**
 * The Model Lab: author your own model (scenarios + conviction), save it as a
 * named preset, and reload it later. The EV/Kelly readout updates instantly off
 * the same computeEdge the rest of the studio uses. Saved presets are the inputs
 * the Arena compares against the market, the Street, and the AI.
 */
export function ModelLab({
  ticker,
  view,
  setView,
  edge,
  onReset,
}: {
  ticker: string;
  view: SubjectiveView;
  setView: (v: SubjectiveView) => void;
  edge: EdgeBundle;
  onReset: () => void;
}) {
  const [presets, setPresets] = React.useState<ModelPreset[]>([]);
  const [naming, setNaming] = React.useState(false);
  const [name, setName] = React.useState("");

  // localStorage is client-only; load (and reload per ticker) after mount.
  React.useEffect(() => {
    setPresets(listPresets(ticker));
  }, [ticker]);

  const refresh = () => setPresets(listPresets(ticker));

  const commitSave = () => {
    const n = name.trim();
    if (!n) return;
    savePreset(n, ticker, view);
    setName("");
    setNaming(false);
    refresh();
  };

  const remove = (id: string) => {
    deletePreset(id);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="glass shadow-card px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">Models</span>
          {!naming && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNaming(true)}
              title="Save the current view as a named model"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          )}
        </div>

        {naming && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              autoFocus
              value={name}
              placeholder="Name this model, e.g. Momentum"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitSave();
                if (e.key === "Escape") {
                  setNaming(false);
                  setName("");
                }
              }}
              className="h-7 flex-1"
            />
            <Button variant="accent" size="sm" onClick={commitSave}>
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNaming(false);
                setName("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {presets.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-sm border border-line bg-panel2 px-2 py-1 text-[12px]"
              >
                <button
                  className="mono text-muted transition-colors hover:text-accent"
                  onClick={() => setView(p.view)}
                  title="Load this model into the studio"
                >
                  {p.name}
                </button>
                <button
                  className="text-faint transition-colors hover:text-down"
                  onClick={() => remove(p.id)}
                  title="Delete this model"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          !naming && (
            <p className="mt-1.5 text-[12px] leading-snug text-faint">
              Save your scenarios as named models, then reload them here or stack them in the Arena.
            </p>
          )
        )}
      </div>

      <ScenarioBuilder view={view} setView={setView} onReset={onReset} />
      <EdgeCard edge={edge.edge} />
    </div>
  );
}
