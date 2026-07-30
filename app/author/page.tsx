import type { Metadata } from "next";
import Link from "next/link";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { ForgeStatus } from "@/src/components/forge/ForgePrimitives";

export const metadata: Metadata = {
  title: "Author access unavailable — FORGE",
  description:
    "The FORGE author workspace is unavailable without a server-owned author entitlement.",
  robots: { index: false, follow: false },
};

export default function AuthorAccessGatePage() {
  return (
    <ForgeShell active="studio" surface="public">
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty" role="alert">
          <ForgeStatus tone="human">Author role required</ForgeStatus>
          <h1>The author workspace is not available.</h1>
          <p>
            This deployment has no server-owned author entitlement. A device
            profile, adult self-attestation, URL, provider key, or cloud
            identity cannot unlock lesson generation, review, or publication.
          </p>
          <Link href="/app">Return to the learner app</Link>
        </section>
      </main>
    </ForgeShell>
  );
}
