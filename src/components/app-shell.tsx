"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd, StatusDot } from "@/components/ui/misc";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/command-palette";

const NAV = [
  { label: "Terminal", href: "/" },
  { label: "Screener", href: "/screener" },
  { label: "Calibration", href: "/calibration" },
  { label: "Methodology", href: "/methodology" },
];

export function AppShell({ children, tape }: { children: React.ReactNode; tape?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

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
        <div className="sticky top-0 z-40 bg-canvas/95 backdrop-blur">
          <header className="flex h-12 items-center gap-5 border-b border-line px-4">
            {/* wordmark */}
            <Link href="/" className="flex items-baseline gap-2">
              <span className="mono text-xl font-semibold leading-none text-accent">Σ</span>
              <span className="mono text-sm font-semibold tracking-[0.22em] text-fg">SIGMA</span>
              <span className="eyebrow ml-1 hidden md:inline">distributions · ev · edge</span>
            </Link>

            <div className="h-4 w-px bg-line2" />

            <nav className="flex items-center">
              {NAV.map((n) => {
                const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "mono relative px-3 py-3.5 text-[11px] uppercase tracking-wider transition-colors",
                      active ? "text-accent" : "text-muted hover:text-fg",
                    )}
                  >
                    {n.label}
                    {active && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setOpen(true)}
                className="flex h-7 items-center gap-2 rounded-sm border border-line bg-panel2 px-2.5 text-xs text-faint transition-colors hover:border-line2 hover:text-muted"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="mono hidden sm:inline">ticker</span>
                <Kbd>⌘K</Kbd>
              </button>

              <ColorblindToggle />

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="mono flex items-center gap-1.5 rounded-sm border border-warn/30 bg-warn/5 px-2 py-1 text-[10px] uppercase tracking-wider text-warn">
                    <StatusDot tone="warn" live />
                    Demo
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Runs on baked, delayed/illustrative snapshots so it never breaks live. Set
                  SIGMA_FORCE_LIVE=1 to pull live chains for any ticker.
                </TooltipContent>
              </Tooltip>
            </div>
          </header>
          {tape}
        </div>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line px-4 py-3">
          <span className="eyebrow">
            Sigma · research in distributions · data delayed / illustrative · not investment advice
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
            "flex h-7 w-7 items-center justify-center rounded-sm border border-line transition-colors hover:border-line2",
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
