import { getEdgeRadarRows } from "@/lib/screener";
import { EdgeRadarTable } from "@/components/edge-radar-table";
import { AI_ENABLED } from "@/lib/config";
import { InfoHint } from "@/components/ui/tooltip";

export const metadata = { title: "Edge Radar · Riptide" };

export default async function RadarPage() {
  const rows = await getEdgeRadarRows();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-fg">Edge Radar</h1>
        <InfoHint>
          A deterministic scan, no model opinion of its own: for every name in the universe it builds
          the sell-side (Street) consensus distribution from analyst targets, compares it against the
          options-implied density, and ranks by where the two disagree most. These are the spots a
          single consensus price target hides, where the options market is pricing one distribution
          and the Street implies another.
        </InfoHint>
      </div>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
        Ranked by the size of the gap between the Street&apos;s consensus distribution and the
        options-implied one. No per-name fundamental or AI forecast is computed here; the ranking is
        pure Street-vs-market divergence. Click a column to re-sort, or a ticker to open its studio and
        build your own view against it. With an AI key set, you can ask the analyst why the top gaps
        exist.
      </p>
      <EdgeRadarTable rows={rows} aiEnabled={AI_ENABLED} />
    </div>
  );
}
