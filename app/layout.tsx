import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { WorldRouteFocus } from "@/src/components/forge/WorldRouteFocus";
import "./globals.css";
import "./forge.css";
import "./forge-system.css";
import "./forge-product-reset.css";
import "./forge-sprint.css";

export const metadata: Metadata = {
  title: {
    default: "FORGE — Build something real. Prove it’s yours.",
    template: "%s — FORGE",
  },
  description:
    "A practical seven-day project sprint that helps students turn an idea into a useful artifact and an honest, inspectable proof of their work.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
