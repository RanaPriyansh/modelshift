import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { WorldRouteFocus } from "@/src/components/forge/WorldRouteFocus";
import "./globals.css";
import "./forge.css";
import "./forge-system.css";
import "./forge-product-reset.css";

export const metadata: Metadata = {
  title: "FORGE — Goal to path to proof.",
  description:
    "Forge turns a real learning goal into an editable path, bounded work, and evidence that survives AI assistance.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Reading the proxy-provided nonce makes the document request dynamic so
  // Next can attach the same nonce to its framework and hydration scripts.
  await headers();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <WorldRouteFocus />
        {children}
      </body>
    </html>
  );
}
