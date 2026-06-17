"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/command-palette";

const NAV = [
  { label: "Terminal", href: "/" },
  { label: "Screener", href: "/screener" },
  { label: "Calibration", href: "/calibration" },
  { label: "Methodology", href: "/methodology" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // ⌘K / Ctrl+K opens the command palette.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 flex h-12 items-center gap-4 border-b border-line bg-canvas/95 px-4 backdrop-blur">
          <Link href="/" className="flex items-center gap-2">
            <span className="mono text-lg font-semibold text-accent leading-none">Σ</span>
            <span className="mono text-sm font-semibold tracking-[0.2em] text-fg">SIGMA</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                    active ? "text-accent" : "text-muted hover:text-fg",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="flex h-8 items-center gap-2 rounded-sm border border-line bg-panel2 px-2.5 text-xs text-faint transition-colors hover:border-line2 hover:text-muted"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search ticker</span>
              <Kbd>⌘K</Kbd>
            </button>

            <ColorblindToggle />

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Badge variant="warn">Demo data</Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Demo runs on baked, delayed/illustrative snapshots so it never breaks live. Set
                SIGMA_FORCE_LIVE=1 to pull live chains for any ticker.
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line px-4 py-3 text-[10px] text-faint">
          <span className="mono">
            Sigma · research in distributions, not price targets · data delayed / illustrative · not
            investment advice
          </span>
        </footer>
      </div>

      <CommandPalette open={open} setOpen={setOpen} />
    </TooltipProvider>
  );
}

function ColorblindToggle() {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const saved = localStorage.getItem("sigma-cb") === "1";
    setOn(saved);
    document.documentElement.classList.toggle("cb-safe", saved);
  }, []);
  const toggle = () => {
    const next = !on;
    setOn(next);
    document.documentElement.classList.toggle("cb-safe", next);
    localStorage.setItem("sigma-cb", next ? "1" : "0");
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-sm border border-line transition-colors hover:border-line2",
            on ? "text-info" : "text-faint",
          )}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        Colorblind-safe palette (blue/orange){on ? " · on" : " · off"}. ~8% of men have red/green
        deficiency; a real terminal ships this.
      </TooltipContent>
    </Tooltip>
  );
}
