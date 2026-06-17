"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-panel2 text-fg border border-line hover:border-line2 hover:bg-line2/40",
        accent: "bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25",
        ghost: "text-muted hover:text-fg hover:bg-panel2",
        outline: "border border-line text-fg hover:bg-panel2",
        up: "bg-up/15 text-up border border-up/40 hover:bg-up/25",
        down: "bg-down/15 text-down border border-down/40 hover:bg-down/25",
      },
      size: {
        sm: "h-7 px-2.5",
        md: "h-8 px-3",
        lg: "h-9 px-4 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
