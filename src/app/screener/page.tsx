import { getScreenerRows } from "@/lib/screener";
import { ScreenerTable } from "@/components/screener-table";
import { InfoHint } from "@/components/ui/tooltip";

export const metadata = {
  title: "Edge Screener · Oshin",
};

export default async function ScreenerPage() {
  const rows = await getScreenerRows();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-fg">Edge Screener</h1>
        <InfoHint>
          Ranked by volatility risk premium (implied − realized): where the market&apos;s vol pricing
          looks richest vs what the stock has delivered. A full build overlays a fundamental/AI
          distribution per name and ranks by its divergence from the implied density.
        </InfoHint>
      </div>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
        Sorted by the volatility risk premium by default, the names where implied vol most exceeds
        realized. Click any column to re-sort, or any ticker to open its distribution studio. This is
        a vol-edge screen, not a cheap-P/E screen.
      </p>
      <ScreenerTable rows={rows} />
    </div>
  );
}
