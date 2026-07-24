import type { Metadata } from "next";

import { AiLiteracyPage } from "@/src/components/forge/refoundation/public/PublicPages";

export const metadata: Metadata = {
  title: "Become AI-literate — FORGE",
  description:
    "Inspect the intended AI-literacy capability arc, its working source-verification World, and the publication gaps that remain.",
};

export default function AiLiteracyRoute() {
  return <AiLiteracyPage />;
}
