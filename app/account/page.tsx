import type { Metadata } from "next";

import "../account.css";

import { signOut } from "./actions";
import { DeviceProfileAccess } from "@/src/components/forge/DeviceProfileAccess";
import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { isForgeCloudAuthConfigured } from "@/src/lib/forge-auth/config";
import { readForgeCloudIdentity } from "@/src/lib/forge-auth/session.server";

export const metadata: Metadata = {
  title: "Your FORGE access",
  description: "Manage this device profile and an optional adult cloud identity.",
};

function maskEmail(email: string | null): string {
  if (!email) return "Authenticated cloud session";
  const [name, domain] = email.split("@");
  if (!domain) return "Authenticated cloud session";
  return `${name.slice(0, 2)}•••@${domain}`;
}

export default async function AccountPage() {
  const [identity, configured] = await Promise.all([
    readForgeCloudIdentity(),
    Promise.resolve(isForgeCloudAuthConfigured()),
  ]);

  return (
    <ForgeShell active="account">
      <main className="forge-account-page" id="forge-main" tabIndex={-1}>
        <header className="forge-account-heading">
          <span>Your access</span>
          <h1>Continuity is optional. Your work stays yours.</h1>
          <p>
            FORGE separates device evidence from cloud identity. Signing in does not turn one response into mastery or make private work visible to another person.
          </p>
        </header>

        <div className="forge-account-grid">
          <DeviceProfileAccess compact />
          <section className="forge-cloud-access" aria-labelledby="account-cloud-title">
            <span>Cloud identity</span>
            <h2 id="account-cloud-title">{identity ? maskEmail(identity.email) : "No cloud account active"}</h2>
            <p>
              {identity
                ? "This authenticated session can support future cross-device continuity. It grants no adult, guardian, sharing, or evidence privileges."
                : configured
                  ? "Adult cloud sign-in is available from the access page."
                  : "Cloud identity is not configured on this deployment; no credentials are collected."}
            </p>
            {identity ? (
              <form action={signOut}><button type="submit">Sign out</button></form>
            ) : (
              <a className="forge-account-primary" href="/login">Open access options</a>
            )}
          </section>
        </div>

        <dl className="forge-account-contract">
          <div><dt>Device evidence</dt><dd>Browser-local and removable by the learner.</dd></div>
          <div><dt>Cloud evidence</dt><dd>Off until an explicit private persistence migration is deployed.</dd></div>
          <div><dt>Children</dt><dd>Device-only with a grown-up confirmation; no child account creation.</dd></div>
          <div><dt>Sharing</dt><dd>Off. No guardian, educator, peer, or public evidence access.</dd></div>
        </dl>
      </main>
    </ForgeShell>
  );
}
