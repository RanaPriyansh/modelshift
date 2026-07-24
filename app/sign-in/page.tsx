import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import "../account.css";

import { DeviceProfileAccess } from "@/src/components/forge/DeviceProfileAccess";
import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { readForgeCloudIdentity } from "@/src/lib/forge-auth/session.server";

export const metadata: Metadata = {
  title: "Access FORGE",
  description:
    "Use a private device profile. Cloud accounts and cross-device continuity are unavailable in this build.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const identity = await readForgeCloudIdentity();
  if (identity) redirect("/app/settings");

  const { status } = await searchParams;
  const message = status
    ? "Cloud accounts are not enabled in this build. No credential, email confirmation, or cross-device state was created."
    : null;

  return (
    <ForgeShell active="account" surface="public">
      <main className="forge-account-page" id="forge-main" tabIndex={-1}>
        <header className="forge-account-heading">
          <span>Access, without surveillance</span>
          <h1>Pick where your learning trail lives.</h1>
          <p>
            A device profile is private and immediate. All continuity in this
            build stays in this browser; cloud accounts and cross-device sync
            are not enabled.
          </p>
        </header>

        {message ? (
          <p className="forge-account-banner" role="status">{message}</p>
        ) : null}

        <div className="forge-account-grid">
          <DeviceProfileAccess />

          <section
            className="forge-cloud-access"
            aria-labelledby="cloud-access-title"
          >
            <span>Cloud continuity · unavailable</span>
            <h2 id="cloud-access-title">
              Cross-device continuity is not available.
            </h2>
            <p>
              No cloud identity project is connected to this build. FORGE does
              not show a credential form, collect an email or password, or
              imply that browser-local work is backed up somewhere else.
            </p>
            <span className="forge-cloud-state">
              Cloud identity · structurally disabled
            </span>
          </section>
        </div>

        <p className="forge-account-boundary">
          Under-18 cloud identity, guardian relationships, organization access,
          and evidence sharing remain disabled until their consent and
          safeguarding controls are implemented and reviewed.{" "}
          <Link href="/trust">See the evidence boundary.</Link>
        </p>
      </main>
    </ForgeShell>
  );
}
