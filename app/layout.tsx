import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";
import "./forge.css";
import "./forge-system.css";

export const metadata: Metadata = {
  title: "FORGE — Working Worlds. Bounded evidence.",
  description:
    "A learner-owned prototype with working learning Worlds, bounded AI support, and browser-local evidence records.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Reading the proxy-provided nonce makes the document request dynamic so
  // Next can attach the same nonce to its framework and hydration scripts.
  await headers();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
