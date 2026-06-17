import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/ui/tooltip";
import type { EdgeAnalysis } from "@/lib/types";

export function EdgeCard({ edge }: { edge: EdgeAnalysis }) {
  const ev = edge.ev;
  const edgeTone = ev.edgePct > 0.005 ? "up" : ev.edgePct < -0.005 ? "down" : "flat";
  const best = [...edge.strategies]
    .filter((s) => s.label !== "Long stock")
    .sort((a, b) => (b.evEdge ?? 0) - (a.evEdge ?? 0))[0];

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Edge · expected value</PanelTitle>
        <InfoHint>
          Edge = where your subjective density disagrees with the options-implied one. EV replaces a
          price target: a name can be a buy even when consensus IS the modal case, if dispersion or a
          tail dominates.
        </InfoHint>
      </PanelHeader>
      <PanelBody className="space-y-3">
        {/* headline EV sentence */}
        <p className="text-xs leading-relaxed text-muted">
          Market&apos;s expected price is{" "}
          <span className="mono text-info">{fmtMoney(ev.forward)}</span> (the risk-neutral forward).
          Your view implies <span className="mono text-accent">{fmtMoney(ev.expectedPrice)}</span> —{" "}
          <span
            className={`mono font-semibold ${edgeTone === "up" ? "text-up" : edgeTone === "down" ? "text-down" : "text-muted"}`}
          >
            {fmtSignedPct(ev.edgePct)} edge
          </span>
          .
        </p>

        {/* strategies table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-faint">
                <th className="py-1.5 text-left font-medium">Structure</th>
                <th className="py-1.5 text-right font-medium">Cost</th>
                <th className="py-1.5 text-right font-medium">EV</th>
                <th className="py-1.5 text-right font-medium">Edge</th>
                <th className="py-1.5 text-right font-medium">POP</th>
              </tr>
            </thead>
            <tbody className="mono">
              {edge.strategies.map((s) => {
                const t = (s.evEdge ?? 0) > 0 ? "text-up" : (s.evEdge ?? 0) < 0 ? "text-down" : "text-muted";
                const isBest = best && s.label === best.label && (s.evEdge ?? 0) > 0;
                return (
                  <tr key={s.label} className="border-b border-line/60">
                    <td className="py-1.5 text-left text-fg">
                      {s.label}
                      {isBest && <span className="ml-1.5 text-[9px] text-accent">◆ best</span>}
                    </td>
                    <td className="py-1.5 text-right text-muted">{fmtMoney(s.marketPrice)}</td>
                    <td className="py-1.5 text-right text-muted">{fmtMoney(s.evUnderSubjective)}</td>
                    <td className={`py-1.5 text-right ${t}`}>
                      {fmtSignedPct(s.evEdgePct ?? 0)}
                    </td>
                    <td className="py-1.5 text-right text-muted">{fmtPct(s.pop ?? 0, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* kelly sizing */}
        <div className="rounded-sm border border-line bg-panel2 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-faint">
              Half-Kelly size
              <InfoHint>
                f* = (b·p − q)/b, halved to absorb estimation error. Full Kelly assumes your
                probabilities are exactly right; they never are. f* &lt; 0 means don&apos;t bet.
              </InfoHint>
            </span>
            <Badge variant={edge.kelly.halfKelly > 0 ? "up" : "outline"}>
              {edge.kelly.halfKelly > 0 ? fmtPct(edge.kelly.halfKelly, 1) : "no bet"}
            </Badge>
          </div>
          <p className="mt-1 text-[10px] leading-snug text-muted">{edge.kelly.note}</p>
        </div>
      </PanelBody>
    </Panel>
  );
}
