/** Display formatting helpers. Numbers render with tabular figures (set on body). */

export function fmtPrice(n: number | null | undefined, dp = 2): string {
  if (n == null || !Number.isFinite(n)) return "--";
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function fmtMoney(n: number | null | undefined, dp = 2): string {
  if (n == null || !Number.isFinite(n)) return "--";
  return `$${fmtPrice(n, dp)}`;
}

export function fmtNum(n: number | null | undefined, dp = 2): string {
  if (n == null || !Number.isFinite(n)) return "--";
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** Fraction (0.123) -> "12.3%". */
export function fmtPct(n: number | null | undefined, dp = 1): string {
  if (n == null || !Number.isFinite(n)) return "--";
  return `${(n * 100).toFixed(dp)}%`;
}

/** Fraction -> "+12.3%" / "-4.2%" with explicit sign. */
export function fmtSignedPct(n: number | null | undefined, dp = 1): string {
  if (n == null || !Number.isFinite(n)) return "--";
  const v = n * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(dp)}%`;
}

export function fmtSigned(n: number | null | undefined, dp = 2): string {
  if (n == null || !Number.isFinite(n)) return "--";
  return `${n >= 0 ? "+" : ""}${n.toFixed(dp)}`;
}

/** Compact notation for OI, volume, market cap: 1.2M, 3.4B. */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "--";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Volatility as a percent: 0.25 -> "25.0%" (alias of fmtPct for readability). */
export const fmtVol = (n: number | null | undefined, dp = 1) => fmtPct(n, dp);

/** Sign class helper for up/down coloring. */
export function tone(n: number | null | undefined): "up" | "down" | "flat" {
  if (n == null || !Number.isFinite(n) || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Days until an ISO date from now (can be negative). */
export function daysUntil(iso: string): number {
  const d = new Date(iso).getTime();
  return Math.round((d - Date.now()) / 86_400_000);
}
