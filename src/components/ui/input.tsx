import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-8 w-full rounded-sm border border-line bg-panel2 px-2.5 text-sm text-fg placeholder:text-faint",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent/60",
          "disabled:opacity-50 mono",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
