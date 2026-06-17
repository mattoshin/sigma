import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[12px] font-medium uppercase tracking-wide leading-none",
  {
    variants: {
      variant: {
        default: "border-line bg-panel2 text-muted",
        accent: "border-accent/40 bg-accent/10 text-accent",
        up: "border-up/40 bg-up/10 text-up",
        down: "border-down/40 bg-down/10 text-down",
        info: "border-info/40 bg-info/10 text-info",
        warn: "border-warn/40 bg-warn/10 text-warn",
        violet: "border-violet/40 bg-violet/10 text-violet",
        outline: "border-line text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
