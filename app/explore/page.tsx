import type { Metadata } from "next";

import { ExplorePathsPage } from "@/src/components/forge/refoundation/public/PublicPages";

export const metadata: Metadata = {
  title: "Explore learning directions — FORGE",
  description:
    "Inspect outcome-based learning directions and the reviewed Worlds that are genuinely available today.",
};

type Availability = "all" | "with-worlds" | "outline";

function availabilityValue(value: string | undefined): Availability {
  return value === "with-worlds" || value === "outline" ? value : "all";
}

export default async function ExploreRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; availability?: string }>;
}) {
  const query = await searchParams;

  return (
    <ExplorePathsPage
      availability={availabilityValue(query.availability)}
      query={typeof query.q === "string" ? query.q.slice(0, 120) : ""}
    />
  );
}
