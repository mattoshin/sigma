/**
 * PortfolioBar, the matthewoshin.com strip across the top of every page, the
 * same bar every portfolio demo carries. It is brand-neutral (it sits above
 * Riptide's own chrome), links back to the portfolio and out to the main site,
 * and flags the data as sample: universe tickers resolve to baked snapshots
 * unless RIPTIDE_FORCE_LIVE=1 (see src/lib/config.ts).
 *
 * Its height (h-12) is mirrored by --portfolio-bar-h in globals.css, which the
 * app header uses to stick directly below it.
 *
 * The border colors carry Tailwind's `!` because globals.css sets an unlayered
 * `* { border-color }`, which otherwise outranks layered border utilities.
 */
export function PortfolioBar() {
  return (
    <div className="sticky top-0 z-50 border-b border-white/10! bg-[#05080f]/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-3 px-4 font-[family-name:var(--font-portfolio-bar)] text-[11px] uppercase tracking-[0.18em] sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 text-white/55 sm:gap-3">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <a
              href="https://matthewoshin.com/portfolio"
              className="flex shrink-0 items-center gap-2 py-3.5 text-white/80 transition-colors hover:text-white"
            >
              <span aria-hidden="true">&lt;-</span> Portfolio
            </a>
            <span aria-hidden="true" className="shrink-0 text-white/25">
              &rsaquo;
            </span>
            <span aria-current="page" className="min-w-0 shrink truncate text-white/45">
              Options-Implied Distribution Terminal
            </span>
          </nav>

          <span className="demo-blink flex shrink-0 items-center gap-1.5 rounded-full border border-yellow-400/70! bg-yellow-400/15 px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-yellow-300">
            <span className="h-2 w-2 shrink-0 rounded-full bg-yellow-400" />
            <span className="hidden sm:inline">Interactive demo · sample data</span>
            <span className="sm:hidden">Sample data</span>
          </span>
        </div>

        <a
          href="https://matthewoshin.com"
          className="shrink-0 py-3.5 text-white/60 transition-colors hover:text-white"
        >
          <span className="hidden sm:inline">Exit to matthewoshin.com </span>
          <span className="sm:hidden">Exit </span>
          <span aria-hidden="true">-&gt;</span>
        </a>
      </div>
    </div>
  );
}
