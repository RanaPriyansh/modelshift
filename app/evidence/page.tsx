import type { Metadata } from "next";

import { EvidencePrototype } from "@/src/components/forge/ForgePrototypePages";

export const metadata: Metadata = {
  title: "Evidence — FORGE",
  description: "Bounded proof after help: what happened, what support was used, and what remains untested.",
};

export default function EvidencePage() {
  return <EvidencePrototype />;
}
