import type { Metadata } from "next";

import { PublicProductPage } from "@/src/components/forge/semester-desk-v2/public/product/PublicProductPage";

export const metadata: Metadata = {
  title: "How FORGE works | Semester Desk",
  description:
    "See how FORGE helps university students check course facts, state capacity, recover a broken week, study actively, and return later.",
};

export default function HowForgeWorksPage() {
  return <PublicProductPage kind="how-forge-works" />;
}
