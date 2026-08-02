import type { Metadata } from "next";

import { PolicyPage } from "@/src/components/forge/semester-desk-v2/public/policy/PolicyPage";

export const metadata: Metadata = {
  title: "Terms — FORGE",
  description: "Draft product-use terms for FORGE. Legal review is required before publication.",
};

export default function TermsPage() {
  return <PolicyPage kind="terms" />;
}
