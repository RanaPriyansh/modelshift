import type { Metadata } from "next";
import { SprintProof } from "@/src/components/forge-sprint/SprintProof";

export const metadata: Metadata = {
  title: "Project proof",
  description: "An honest, learner-declared record of what shipped, what changed, and what remains open.",
};

export default async function ProofPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SprintProof sprintId={id} />;
}
