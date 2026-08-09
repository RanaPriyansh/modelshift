import type { Metadata } from "next";

import { PolicyPage } from "@/src/components/forge/semester-desk-v2/public/policy/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy — FORGE",
  description: "How the current FORGE product uses browser-local study data and what you can remove.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    url: "/privacy",
    title: "Privacy — FORGE",
    description: "How the current FORGE product uses browser-local study data and what you can remove.",
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
    title: "Privacy — FORGE",
    description: "How the current FORGE product uses browser-local study data and what you can remove.",
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

export default function PrivacyPage() {
  return <PolicyPage kind="privacy" />;
}
