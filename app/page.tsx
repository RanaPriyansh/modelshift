import type { Metadata } from "next";

import { PublicHome } from "@/src/components/forge/refoundation/public/PublicHome";

export const metadata: Metadata = {
  title: "FORGE | Learn what matters next",
  description:
    "Turn one real learning goal into difficult practice, clear feedback, independent proof, and a planned return.",
};

export default function HomePage() {
  return <PublicHome />;
}
