"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Activity, BarChart3, BookOpen, Target, TrendingUp } from "lucide-react";
import { UNIVERSE } from "@/lib/config";

const NAV = [
  { label: "Terminal / Home", href: "/", icon: Activity },
  { label: "Edge Screener", href: "/screener", icon: BarChart3 },
  { label: "Calibration scorecard", href: "/calibration", icon: Target },
  { label: "Methodology", href: "/methodology", icon: BookOpen },
];

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  const go = (href: string) => {
    setOpen(false);
    setSearch("");
    router.push(href);
  };

  const typed = search.trim().toUpperCase();
  const isNewTicker =
    /^[A-Z.]{1,6}$/.test(typed) && !UNIVERSE.some((u) => u.ticker === typed);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      className="fixed left-1/2 top-[18%] z-50 w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-md border border-line2 bg-panel shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-line px-3">
        <TrendingUp className="h-3.5 w-3.5 text-accent" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a ticker (e.g. AAPL) or a command…"
          className="mono h-11 w-full bg-transparent text-base text-fg outline-none placeholder:text-faint"
        />
      </div>
      <Command.List className="max-h-[340px] overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-6 text-center text-sm text-faint">
          No matches. Type any ticker symbol to open it live.
        </Command.Empty>

        {isNewTicker && (
          <Command.Group heading="Open live">
            <Item onSelect={() => go(`/t/${typed}`)} icon={TrendingUp}>
              <span className="mono text-accent">{typed}</span>
              <span className="ml-2 text-faint">— pull live chain</span>
            </Item>
          </Command.Group>
        )}

        <Command.Group heading="Tickers">
          {UNIVERSE.map((u) => (
            <Item key={u.ticker} value={`${u.ticker} ${u.name}`} onSelect={() => go(`/t/${u.ticker}`)} icon={TrendingUp}>
              <span className="mono w-14 text-fg">{u.ticker}</span>
              <span className="text-muted">{u.name}</span>
              <span className="ml-auto text-[12px] text-faint">{u.sector}</span>
            </Item>
          ))}
        </Command.Group>

        <Command.Group heading="Navigate">
          {NAV.map((n) => (
            <Item key={n.href} value={n.label} onSelect={() => go(n.href)} icon={n.icon}>
              {n.label}
            </Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function Item({
  children,
  onSelect,
  value,
  icon: Icon,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  value?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-sm text-muted data-[selected=true]:bg-panel2 data-[selected=true]:text-fg"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-faint" />
      {children}
    </Command.Item>
  );
}
