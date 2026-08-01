import type { Metadata } from "next";
import { Geist, Geist_Mono, Libre_Baskerville } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { WorldRouteFocus } from "@/src/components/forge/WorldRouteFocus";
import "./globals.css";
import "./forge.css";
import "./forge-system.css";
import "./forge-product.css";
import "./forge-sprint.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-forge-reflection",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FORGE — Working Worlds. Bounded evidence.",
  description:
    "A learner-controlled Learning OS with working Worlds, bounded AI support, and browser-local evidence records.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Reading the proxy-provided nonce makes the document request dynamic so
  // Next can attach the same nonce to its framework and hydration scripts.
  await headers();
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} ${libreBaskerville.variable}`}
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <WorldRouteFocus />
        {children}
      </body>
    </html>
  );
}
