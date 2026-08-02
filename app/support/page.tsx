import type { Metadata } from "next";

import { PolicyPage } from "@/src/components/forge/semester-desk-v2/public/policy/PolicyPage";

export const metadata: Metadata = {
  title: "Support — FORGE",
  description: "Self-service help for FORGE access, browser-local data, return dates, and page failures.",
};

export default function SupportPage() {
  return <PolicyPage kind="support" />;
}
