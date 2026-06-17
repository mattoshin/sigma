"use client";

import * as React from "react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "mono flex-1 rounded-sm px-2 py-1.5 text-[12px] transition-colors",
        active ? "bg-accent/15 text-accent" : "text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function SettingsMenu() {
  const [open, setOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [cb, setCb] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
    setCb(document.documentElement.classList.contains("cb-safe"));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const applyTheme = (t: "light" | "dark") => {
    setTheme(t);
    document.documentElement.classList.toggle("light", t === "light");
    localStorage.setItem("oshin-theme", t);
  };
  const applyCb = (on: boolean) => {
    setCb(on);
    document.documentElement.classList.toggle("cb-safe", on);
    localStorage.setItem("sigma-cb", on ? "1" : "0");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Display settings"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
          open ? "border-accent/60 text-fg" : "border-line2 text-muted hover:border-accent/60 hover:text-fg",
        )}
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-md border border-line2 bg-panel p-3 shadow-card">
          <div className="eyebrow mb-2.5">Display</div>

          <div className="mb-3">
            <div className="mb-1 text-[12px] text-muted">Theme</div>
            <div className="flex gap-0.5 rounded-sm border border-line p-0.5">
              <Seg active={theme === "light"} onClick={() => applyTheme("light")}>Light</Seg>
              <Seg active={theme === "dark"} onClick={() => applyTheme("dark")}>Dark</Seg>
            </div>
          </div>

          <div>
            <div className="mb-1 text-[12px] text-muted">Up / down colors</div>
            <div className="flex gap-0.5 rounded-sm border border-line p-0.5">
              <Seg active={!cb} onClick={() => applyCb(false)}>Green / red</Seg>
              <Seg active={cb} onClick={() => applyCb(true)}>Colorblind</Seg>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-faint">
              Colorblind-safe swaps green/red for blue/orange.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
