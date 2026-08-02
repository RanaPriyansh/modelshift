import type { Metadata } from "next";

import { PublicProductPage } from "@/src/components/forge/semester-desk-v2/public/product/PublicProductPage";

export const metadata: Metadata = {
  title: "FORGE for university students | Semester Desk",
  description:
    "FORGE gives university students one calm place to check course facts, declare real capacity, recover a week, and study independently.",
  alternates: {
    canonical: "/university",
  },
  openGraph: {
    url: "/university",
    title: "FORGE for university students | Semester Desk",
    description:
      "FORGE gives university students one calm place to check course facts, declare real capacity, recover a week, and study independently.",
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
    title: "FORGE for university students | Semester Desk",
    description:
      "FORGE gives university students one calm place to check course facts, declare real capacity, recover a week, and study independently.",
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

export default function UniversityPage() {
  return <PublicProductPage kind="university" />;
}
