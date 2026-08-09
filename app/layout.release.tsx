import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

const DEFAULT_METADATA_BASE = new URL("http://localhost:3000");

function resolveMetadataBase(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_FORGE_SITE_ORIGIN,
    process.env.FORGE_SITE_ORIGIN,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
      if (url.protocol === "http:" || url.protocol === "https:") return new URL(url.origin);
    } catch {
      // Ignore an invalid deployment value and continue to the safe fallback.
    }
  }

  // Do not invent a production domain. Localhost is a deterministic fallback.
  return DEFAULT_METADATA_BASE;
}

const metadataBase = resolveMetadataBase();
const mayIndex =
  process.env.VERCEL_ENV === "production" || process.env.FORGE_PUBLIC_INDEXING === "true";

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "FORGE | Semester Desk for university students",
    template: "%s",
  },
  description:
    "FORGE helps university students rebuild a broken week from today with checked course facts, honest capacity, active study, and later return.",
  applicationName: "FORGE",
  category: "education",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: mayIndex,
    follow: mayIndex,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FORGE",
    url: "/",
    title: "FORGE | Semester Desk for university students",
    description:
      "FORGE helps university students rebuild a broken week from today with checked course facts, honest capacity, active study, and later return.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FORGE Semester Desk. Rebuild a broken university week from today.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FORGE | Semester Desk for university students",
    description:
      "FORGE helps university students rebuild a broken week from today with checked course facts, honest capacity, active study, and later return.",
    images: [
      {
        url: "/twitter-image",
        width: 1200,
        height: 630,
        alt: "FORGE Semester Desk. Rebuild a broken university week from today.",
      },
    ],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Reading the proxy-provided nonce makes the document request dynamic so
  // Next can attach the same nonce to its framework and hydration scripts.
  await headers();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="forge-document">{children}</body>
    </html>
  );
}
