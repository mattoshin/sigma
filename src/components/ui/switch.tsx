"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-line transition-colors",
      "data-[state=checked]:bg-accent/80 data-[state=unchecked]:bg-panel2",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-3 w-3 rounded-full bg-fg shadow-lg transition-transform data-[state=checked]:translate-x-3.5 data-[state=unchecked]:translate-x-0.5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
