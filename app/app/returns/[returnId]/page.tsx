import type { Metadata } from "next";

import { ForgeDelayedReturnRuntime } from "@/src/components/forge/ForgeDelayedReturnRuntime";
import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Delayed return — FORGE",
  description: "One opaque, device-local, assistance-withdrawn delayed-return task bound to exact prior evidence.",
};

export default async function ForgeDelayedReturnPage({
  params,
}: {
  readonly params: Promise<{ returnId: string }>;
}) {
  const { returnId } = await params;
  return (
    <ForgeWorldFrame exitHref="/app/returns" worldLabel="Delayed return">
      <ForgeDelayedReturnRuntime returnId={returnId} />
    </ForgeWorldFrame>
  );
}
