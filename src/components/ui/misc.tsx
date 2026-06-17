import * as React from "react";
import { cn } from "@/lib/utils";

/** A keyboard shortcut chip. */
export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "mono inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-line2 bg-canvas px-1.5 text-[12px] text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** The one repeated structural label device. */
export function SectionLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

/** A labeled stat cell — eyebrow label, confident mono value, optional sub. */
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
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="eyebrow">{label}</span>
      <span className={cn("mono text-2xl font-bold leading-none tracking-tight", toneClass)}>{value}</span>
      {sub != null && <span className="mono text-[13px] leading-tight text-muted">{sub}</span>}
    </div>
  );
}

/** A live status dot. */
export function StatusDot({ tone = "up", live = false }: { tone?: "up" | "down" | "warn" | "muted"; live?: boolean }) {
  const color =
    tone === "up" ? "bg-up" : tone === "down" ? "bg-down" : tone === "warn" ? "bg-warn" : "bg-faint";
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", color, live && "pulse-dot")} />;
}
