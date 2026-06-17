import Link from "next/link";
import { getTickerTape } from "@/lib/screener";
import { fmtMoney, fmtSignedPct } from "@/lib/format";

/**
 * The header marquee. Bloomberg muscle memory and a small sign of life — the
 * universe scrolling by with last + change. Pure CSS animation (server-rendered),
 * paused on hover, disabled under reduced-motion.
 */
export function TickerTape() {
  const rows = getTickerTape();
  const items = [...rows, ...rows]; // duplicated for a seamless -50% loop

  return (
    <div className="overflow-hidden border-b border-line bg-panel">
      <div className="flex w-max animate-tape">
        {items.map((r, i) => (
          <Link
            key={i}
            href={`/t/${r.ticker}`}
            className="flex items-center gap-2 whitespace-nowrap border-r border-line/70 px-4 py-1.5 text-[11px] transition-colors hover:bg-panel2"
            aria-hidden={i >= rows.length}
            tabIndex={i >= rows.length ? -1 : 0}
          >
            <span className="mono font-medium text-fg">{r.ticker}</span>
            <span className="mono text-faint">{fmtMoney(r.price)}</span>
            <span className={`mono ${r.changePct >= 0 ? "text-up" : "text-down"}`}>
              {fmtSignedPct(r.changePct)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
