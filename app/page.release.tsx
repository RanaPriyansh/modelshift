import type { Metadata } from "next";

import { SemesterDeskV2PublicHome } from "@/src/components/forge/semester-desk-v2/public/SemesterDeskV2PublicHome";

export const metadata: Metadata = {
  title: "FORGE | Semester Desk for university students",
  description:
    "FORGE helps university students rebuild a broken week from today with checked course facts, honest capacity, active study, and later return.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    title: "FORGE | Semester Desk for university students",
    description:
      "FORGE helps university students rebuild a broken week from today with checked course facts, honest capacity, active study, and later return.",
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
    title: "FORGE | Semester Desk for university students",
    description:
      "FORGE helps university students rebuild a broken week from today with checked course facts, honest capacity, active study, and later return.",
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

export default function HomePage() {
  return <SemesterDeskV2PublicHome />;
}
