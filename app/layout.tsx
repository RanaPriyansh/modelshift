import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORGE — Learn anything. Prove what changed.",
  description:
    "A learner-owned learning system for children with grown-ups, teens, and adults: reviewed Worlds, bounded AI support, and proof after help.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
