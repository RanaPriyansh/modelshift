import type { Metadata } from "next";

import { EvidencePrototype } from "@/src/components/forge/ForgePrototypePages";

export const metadata: Metadata = {
  title: "My evidence — FORGE",
  description: "Private device evidence: what happened, what support was used, and what remains untested.",
};

export default function AppEvidencePage() {
  return <EvidencePrototype />;
}
