import type { Metadata } from "next";

import { PolicyPage } from "@/src/components/forge/semester-desk-v2/public/policy/PolicyPage";

export const metadata: Metadata = {
  title: "Support — FORGE",
  description: "Self-service help for FORGE access, browser-local data, return dates, and page failures.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    url: "/support",
    title: "Support — FORGE",
    description: "Self-service help for FORGE access, browser-local data, return dates, and page failures.",
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
    title: "Support — FORGE",
    description: "Self-service help for FORGE access, browser-local data, return dates, and page failures.",
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

export default function SupportPage() {
  return <PolicyPage kind="support" />;
}
