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
  },
  twitter: {
    card: "summary",
    title: "Terms — FORGE",
    description: "Draft product-use terms for FORGE. Legal review is required before publication.",
  },
};

export default function TermsPage() {
  return <PolicyPage kind="terms" />;
}
