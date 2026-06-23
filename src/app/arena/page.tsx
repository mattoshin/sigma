import Link from "next/link";
import { listCalls } from "@/lib/store/calls";
import { calibrate } from "@/lib/quant/calibration";
import { ReliabilityChart } from "@/components/charts/reliability-chart";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { InfoHint } from "@/components/ui/tooltip";
import { MODEL_COLOR } from "@/lib/arena";
import type { ModelSource, TrackedCall } from "@/lib/types";

export const metadata = { title: "Model Arena · Riptide" };

// Reads the (mutable) call store, so render dynamically.
export const dynamic = "force-dynamic";

const MODELS: { source: ModelSource; label: string; blurb: string }[] = [
  { source: "market", label: "Market (implied)", blurb: "the options-implied odds, the line to beat" },
  { source: "user", label: "Your view", blurb: "your own probabilistic calls" },
  { source: "street", label: "Street", blurb: "sell-side consensus, scaled to the horizon" },
  { source: "ai", label: "AI analyst", blurb: "anchored to the implied base rate" },
];

export default async function ArenaPage() {
  const calls = await listCalls();

  // Score every model the same way: Brier on resolved calls. The market column
  // uses the marketImpliedProb recorded on every call; the rest use the calls
  // they actually produced (modelSource), defaulting old untagged calls to user.
  const scored = MODELS.map((m) => {
    const subset: TrackedCall[] =
      m.source === "market"
        ? calls
            .filter((c) => typeof c.marketImpliedProb === "number")
            .map((c) => ({ ...c, predictedProb: c.marketImpliedProb as number }))
        : calls.filter((c) => (c.modelSource ?? "user") === m.source);
    return { ...m, cal: calibrate(subset) };
  });

  // Rank by Brier (lower is better); models with no resolved calls sink last.
  const ranked = [...scored].sort((a, b) => {
    const fa = Number.isFinite(a.cal.brierScore);
    const fb = Number.isFinite(b.cal.brierScore);
    if (fa && fb) return a.cal.brierScore - b.cal.brierScore;
    return fa ? -1 : fb ? 1 : 0;
  });
  const bestBrier = ranked.find((r) => Number.isFinite(r.cal.brierScore))?.cal.brierScore;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-fg">Model arena · the scoreboard</h1>
        <InfoHint>
          Every tracked call is attributed to the model that made it, then each model is graded the
          same way: Brier score on resolved calls. So you see which model has actually been right,
          not just which one sounds the most confident.
        </InfoHint>
      </div>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted">
        Lower Brier is better (0 is perfect, 0.25 is a coin flip answered &quot;50%&quot;). Seeded
        with historical resolved calls; log your own from any ticker&apos;s studio and they are tagged
        with whichever model is loaded.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ranked.map((m) => {
          const finite = Number.isFinite(m.cal.brierScore);
          const isBest = finite && m.cal.brierScore === bestBrier;
          const oc = m.cal.overconfidenceIndex;
          return (
            <Panel key={m.source} className={isBest ? "ring-1 ring-accent" : undefined}>
              <PanelBody className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <i className="inline-block h-2 w-3 rounded-sm" style={{ background: MODEL_COLOR[m.source] }} />
                  <span className="text-[13px] text-muted">{m.label}</span>
                  {isBest && <span className="eyebrow ml-auto text-accent">best</span>}
                </div>
                <div className="mono text-2xl text-fg">{finite ? m.cal.brierScore.toFixed(3) : "—"}</div>
                <div className="text-[12px] text-faint">
                  Brier · {m.cal.resolvedCount} resolved
                  {Number.isFinite(oc) && (
                    <>
                      {" · "}
                      {oc > 0.03 ? "overconfident" : oc < -0.03 ? "underconfident" : "calibrated"}
                    </>
                  )}
                </div>
              </PanelBody>
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ranked
          .filter((m) => m.cal.bins.length > 0)
          .map((m) => (
            <Panel key={m.source}>
              <PanelHeader>
                <PanelTitle>
                  <i className="inline-block h-2 w-3 rounded-sm" style={{ background: MODEL_COLOR[m.source] }} />
                  {m.label} · reliability
                </PanelTitle>
                <span className="text-[12px] text-faint">{m.cal.resolvedCount} calls</span>
              </PanelHeader>
              <PanelBody>
                <ReliabilityChart bins={m.cal.bins} />
              </PanelBody>
            </Panel>
          ))}
      </div>

      <div className="mt-6">
        <Link href="/calibration" className="text-[13px] text-accent hover:underline">
          ← Your full calibration scorecard
        </Link>
      </div>
    </div>
  );
}
