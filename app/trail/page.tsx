import type { Metadata } from "next";

import { TrailPrototype } from "@/src/components/forge/ForgePrototypePages";

export const metadata: Metadata = {
  title: "Your Trail — FORGE",
  description: "The FORGE contract for learner-owned questions, capability evidence, and unresolved edges.",
};

export default function TrailPage() {
  return <TrailPrototype />;
}
