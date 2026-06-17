import * as React from "react";
import { cn } from "@/lib/utils";

/** A keyboard shortcut chip. */
export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "mono inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-line bg-panel2 px-1.5 text-[10px] text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** A small uppercase section label. */
export function SectionLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("text-[10px] font-semibold uppercase tracking-[0.1em] text-faint", className)}>
      {children}
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

/** A labeled stat cell — label above, big mono value below, optional sub. */
export function Stat({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "up" | "down" | "flat" | "accent";
  className?: string;
}) {
  const toneClass =
    tone === "up"
      ? "text-up"
      : tone === "down"
        ? "text-down"
        : tone === "accent"
          ? "text-accent"
          : "text-fg";
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <SectionLabel>{label}</SectionLabel>
      <div className={cn("mono text-lg font-semibold leading-tight", toneClass)}>{value}</div>
      {sub != null && <div className="mono text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

/** A live status dot. */
export function StatusDot({ tone = "up", live = false }: { tone?: "up" | "down" | "warn" | "muted"; live?: boolean }) {
  const color =
    tone === "up" ? "bg-up" : tone === "down" ? "bg-down" : tone === "warn" ? "bg-warn" : "bg-faint";
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", color, live && "pulse-dot")} />;
}
