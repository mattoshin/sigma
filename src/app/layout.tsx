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
  title: "Riptide, AI-powered research in distributions",
  description:
    "Run an AI Morning Scan across options-implied and Street distributions, rank the widest gaps, and turn research into expected value.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('riptide-theme')==='light')document.documentElement.classList.add('light');if(localStorage.getItem('riptide-cb')==='1')document.documentElement.classList.add('cb-safe');}catch(e){}})();",
          }}
        />
        <AppShell tape={<TickerTape />}>{children}</AppShell>
      </body>
    </html>
  );
}
