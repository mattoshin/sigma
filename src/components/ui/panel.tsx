import * as React from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border border-line bg-panel", className)} {...props} />;
}

export function PanelHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-line px-3 py-2",
        className,
      )}
      {...props}
    />
  );
}

export function PanelTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-3", className)} {...props} />;
}
