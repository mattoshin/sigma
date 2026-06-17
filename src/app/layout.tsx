import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { TickerTape } from "@/components/ticker-tape";

// terminal-ui's primary sans. Mono is the system SF Mono stack (set in globals).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Oshin, research in distributions, not price targets",
  description:
    "An equity research terminal that puts your view and the options-implied distribution on one axis, quantifies the edge as expected value, and scores your own calibration over time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('oshin-theme')!=='dark')document.documentElement.classList.add('light');if(localStorage.getItem('sigma-cb')==='1')document.documentElement.classList.add('cb-safe');}catch(e){}})();",
          }}
        />
        <AppShell tape={<TickerTape />}>{children}</AppShell>
      </body>
    </html>
  );
}
