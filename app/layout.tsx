import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORGE — Learn anything. Prove what changed.",
  description:
    "A learner-owned learning system for children with grown-ups, teens, and adults: reviewed Worlds, bounded AI support, and proof after help.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Reading the proxy-provided nonce makes the document request dynamic so
  // Next can attach the same nonce to its framework and hydration scripts.
  await headers();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
