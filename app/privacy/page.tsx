import type { Metadata } from "next";

import { PolicyPage } from "@/src/components/forge/semester-desk-v2/public/policy/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy — FORGE",
  description: "How the current FORGE product uses browser-local study data and what you can remove.",
};

export default function PrivacyPage() {
  return <PolicyPage kind="privacy" />;
}
