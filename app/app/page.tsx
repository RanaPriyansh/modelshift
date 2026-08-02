import type { Metadata } from "next";

import { SemesterDeskV2App } from "@/src/components/forge/semester-desk-v2/app/SemesterDeskV2App";

export const metadata: Metadata = {
  title: "Semester Desk — FORGE",
  description: "A calm private desk for university students to rebuild a broken week from today.",
};

export default function ForgeAppPage() {
  return <SemesterDeskV2App />;
}
