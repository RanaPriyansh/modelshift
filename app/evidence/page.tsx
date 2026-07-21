import type { Metadata } from "next";

import { EvidencePrototype } from "@/src/components/forge/ForgePrototypePages";
import { getAdultPrivateEvidenceAccess } from "@/src/lib/forge-auth/server";

export const metadata: Metadata = {
  title: "Evidence — FORGE",
  description: "Bounded proof after help: what happened, what support was used, and what remains untested.",
};

// Auth state and the adult/device-only boundary must be evaluated per request,
// even when Supabase variables are absent during a build.
export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const access = await getAdultPrivateEvidenceAccess();
  return <EvidencePrototype privateEvidenceStatus={access.status} />;
}
