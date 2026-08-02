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
  },
  twitter: {
    card: "summary",
    title: "FORGE for university students | Semester Desk",
    description:
      "FORGE gives university students one calm place to check course facts, declare real capacity, recover a week, and study independently.",
  },
};

export default function UniversityPage() {
  return <PublicProductPage kind="university" />;
}
