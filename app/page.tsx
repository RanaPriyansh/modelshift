import type { Metadata } from "next";

import { PublicHome } from "@/src/components/forge/refoundation/public/PublicHome";

export const metadata: Metadata = {
  title: "FORGE — A path from ambition to capability",
  description:
    "Turn a real learning goal into focused work, ModelShift experiences, and evidence that distinguishes supported practice from independent proof.",
};

export default function HomePage() {
  return <PublicHome />;
}
