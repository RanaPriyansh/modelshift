import type { Metadata } from "next";

import { PolicyPage } from "@/src/components/forge/semester-desk-v2/public/policy/PolicyPage";

export const metadata: Metadata = {
  title: "Terms — FORGE",
  description: "Draft product-use terms for FORGE. Legal review is required before publication.",
  alternates: {
    canonical: "/terms",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    url: "/terms",
    title: "Terms — FORGE",
    description: "Draft product-use terms for FORGE. Legal review is required before publication.",
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
    title: "Terms — FORGE",
    description: "Draft product-use terms for FORGE. Legal review is required before publication.",
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

export default function TermsPage() {
  return <PolicyPage kind="terms" />;
}
