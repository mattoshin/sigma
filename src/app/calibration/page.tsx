import { listCalls } from "@/lib/store/calls";
import { calibrate } from "@/lib/quant/calibration";
import { ReliabilityChart } from "@/components/charts/reliability-chart";
import { CallsTable } from "@/components/calls-table";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Stat } from "@/components/ui/misc";
import { InfoHint } from "@/components/ui/tooltip";
import { fmtPct } from "@/lib/format";

export const metadata = { title: "Calibration · Riptide" };

// This page mutates via the resolve action, so render it dynamically.
export const dynamic = "force-dynamic";

export default async function CalibrationPage() {
  const calls = await listCalls();
  const cal = calibrate(calls);

  const oc = cal.overconfidenceIndex;
  const ocLabel =
    !Number.isFinite(oc)
      ? "-"
      : oc > 0.03
        ? "Systematically overconfident"
        : oc < -0.03
          ? "Underconfident"
          : "Well-calibrated";
  const ocTone = oc > 0.03 ? "down" : oc < -0.03 ? "accent" : "up";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-fg">Calibration scorecard</h1>
        <InfoHint>
          The verified white space: forecast accuracy is tracked for sell-side analysts, but never
          for your OWN probabilistic calls outside prediction markets. This grades decision quality
          independent of any single outcome, exactly how a poker-and-EV shop would want to be
          measured.
        </InfoHint>
      </div>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted">
        When you say 60%, does it happen ~60% of the time? Brier score measures that (0 is perfect,
        0.25 is a coin flip answered &quot;50%&quot;). Seeded here with historical resolved calls;
        log your own from any ticker&apos;s studio.
      </p>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Panel>
          <PanelBody>
            <Stat
              label="Brier score"
              value={Number.isFinite(cal.brierScore) ? cal.brierScore.toFixed(3) : "-"}
              sub={`${cal.resolvedCount} resolved of ${cal.count}`}
              tone="accent"
            />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelBody>
            <Stat
              label="Overconfidence index"
              value={Number.isFinite(oc) ? `${oc >= 0 ? "+" : ""}${(oc * 100).toFixed(1)} pts` : "-"}
              sub={ocLabel}
              tone={ocTone}
            />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelBody>
            <Stat
              label="Open calls"
              value={`${cal.count - cal.resolvedCount}`}
              sub="awaiting resolution"
            />
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>Reliability diagram</PanelTitle>
            <span className="text-[12px] text-faint">below diagonal = overconfident</span>
          </PanelHeader>
          <PanelBody>
            <ReliabilityChart bins={cal.bins} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Tracked calls</PanelTitle>
          </PanelHeader>
          <PanelBody className="p-0">
            <CallsTable calls={calls} />
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
