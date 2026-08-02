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
  },
  twitter: {
    card: "summary",
    title: "FORGE | Semester Desk for university students",
    description:
      "FORGE helps university students rebuild a broken week from today with checked course facts, honest capacity, active study, and later return.",
  },
};

export default function HomePage() {
  return <SemesterDeskV2PublicHome />;
}
