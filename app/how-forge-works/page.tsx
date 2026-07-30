import type { Metadata } from "next";

import { HowForgeWorks } from "@/src/components/forge/ForgeMethodPages";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "How FORGE works",
  description: "The FORGE learning loop, active study operations, personalization boundary, and proof-after-help method.",
};

export default function HowForgeWorksPage() {
  return <ForgeShell active="learn" surface="public"><HowForgeWorks /></ForgeShell>;
}
