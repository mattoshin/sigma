"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd, StatusDot } from "@/components/ui/misc";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/command-palette";
import { SettingsMenu } from "@/components/settings-menu";

const NAV = [
  { label: "Terminal", href: "/" },
  { label: "Screener", href: "/screener" },
  { label: "Radar", href: "/radar" },
  { label: "Arena", href: "/arena" },
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
            {/* wordmark, a distribution-curve mark + RIPTIDE */}
            <Link href="/" className="flex items-center gap-2">
              <svg viewBox="0 0 24 16" className="h-4 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
                <path d="M1 15 C 6 15, 8 2, 12 2 S 18 15, 23 15" strokeLinecap="round" />
              </svg>
              <span className="mono text-base font-bold tracking-[0.22em] text-fg">RIPTIDE</span>
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
                      "mono relative px-3 py-3.5 text-[13px] uppercase tracking-wider transition-colors",
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
                className="flex h-9 items-center gap-2.5 rounded-md border border-line2 bg-panel2 px-3 text-sm text-muted transition-colors hover:border-accent/60 hover:text-fg sm:min-w-[220px]"
              >
                <Search className="h-4 w-4 text-accent" />
                <span className="mono">Search ticker</span>
                <Kbd className="ml-auto">⌘K</Kbd>
              </button>

              <SettingsMenu />

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="mono flex items-center gap-1.5 rounded-sm border border-warn/30 bg-warn/5 px-2 py-1 text-[12px] uppercase tracking-wider text-warn">
                    <StatusDot tone="warn" live />
                    Demo
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Runs on baked, delayed/illustrative snapshots so it never breaks live. Set
                  RIPTIDE_FORCE_LIVE=1 to pull live chains for any ticker.
                </TooltipContent>
              </Tooltip>
            </div>
          </header>
          {tape}
        </div>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line px-4 py-3">
          <span className="eyebrow">
            Riptide · research in distributions · data delayed / illustrative · not investment advice
          </span>
        </footer>
      </div>

      <CommandPalette open={open} setOpen={setOpen} />
    </TooltipProvider>
  );
}
