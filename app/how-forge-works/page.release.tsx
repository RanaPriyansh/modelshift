import type { Metadata } from "next";

import { PublicProductPage } from "@/src/components/forge/semester-desk-v2/public/product/PublicProductPage";

export const metadata: Metadata = {
  title: "How FORGE works | Semester Desk",
  description:
    "See how FORGE helps university students check course facts, state capacity, recover a broken week, study actively, and return later.",
  alternates: {
    canonical: "/how-forge-works",
  },
  openGraph: {
    url: "/how-forge-works",
    title: "How FORGE works | Semester Desk",
    description:
      "See how FORGE helps university students check course facts, state capacity, recover a broken week, study actively, and return later.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FORGE Semester Desk. Rebuild a broken university week from today.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How FORGE works | Semester Desk",
    description:
      "See how FORGE helps university students check course facts, state capacity, recover a broken week, study actively, and return later.",
    images: [
      {
        url: "/twitter-image",
        width: 1200,
        height: 630,
        alt: "FORGE Semester Desk. Rebuild a broken university week from today.",
      },
    ],
  },
};

export default function HowForgeWorksPage() {
  return <PublicProductPage kind="how-forge-works" />;
}
