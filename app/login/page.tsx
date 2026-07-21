import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import "../account.css";

import { signIn, signUpAdult } from "@/app/account/actions";
import { DeviceProfileAccess } from "@/src/components/forge/DeviceProfileAccess";
import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { isForgeCloudAuthConfigured } from "@/src/lib/forge-auth/config";
import { readForgeCloudIdentity } from "@/src/lib/forge-auth/session.server";

export const metadata: Metadata = {
  title: "Access FORGE",
  description: "Use a private device profile or an adult cloud account to continue learning in FORGE.",
};

const STATUS_MESSAGES: Readonly<Record<string, string>> = {
  "invalid-fields": "Use a valid email and a password of at least 10 characters.",
  "adult-required": "Cloud accounts are currently limited to adults who confirm they are signing up for themselves.",
  "sign-in-failed": "That sign-in did not work. Check the details or use private device access.",
  "sign-up-failed": "The account could not be created. No learner evidence was uploaded.",
  "check-email": "Check your email to confirm the account, then return here to sign in.",
  "cloud-not-configured": "Cloud accounts are not enabled on this deployment. Private device access still works.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const identity = await readForgeCloudIdentity();
  if (identity) redirect("/account");

  const configured = isForgeCloudAuthConfigured();
  const { status } = await searchParams;
  const message = status ? STATUS_MESSAGES[status] : null;

  return (
    <ForgeShell active="account">
      <main className="forge-account-page" id="forge-main" tabIndex={-1}>
        <header className="forge-account-heading">
          <span>Access, without surveillance</span>
          <h1>Pick where your learning trail lives.</h1>
          <p>
            A device profile is private and immediate. Adult cloud accounts are optional and exist for cross-device continuity—not ranking, ads, streaks, or hidden monitoring.
          </p>
        </header>

        {message ? <p className="forge-account-banner" role="status">{message}</p> : null}

        <div className="forge-account-grid">
          <DeviceProfileAccess />

          <section className="forge-cloud-access" aria-labelledby="cloud-access-title">
            <span>Adult cloud account · optional</span>
            <h2 id="cloud-access-title">Continue across devices.</h2>
            {configured ? (
              <>
                <p>
                  Account creation is an adult-only release entry point. The checkbox is self-attestation, not verified age or an authorization role; learner evidence is not uploaded by this form.
                </p>
                <form className="forge-cloud-form">
                  <label htmlFor="account-email">Email</label>
                  <input id="account-email" name="email" type="email" autoComplete="email" required maxLength={254} />
                  <label htmlFor="account-password">Password</label>
                  <input
                    id="account-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={10}
                    maxLength={128}
                  />
                  <label className="forge-account-confirmation">
                    <input name="adult-confirmation" type="checkbox" value="confirmed" />
                    <span>I am 18 or older and creating this account for myself.</span>
                  </label>
                  <div className="forge-account-actions">
                    <button className="forge-account-primary" formAction={signIn}>Sign in</button>
                    <button formAction={signUpAdult}>Create adult account</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <p>
                  The secure cloud project has not been connected to this deployment, so this control is deliberately unavailable. FORGE will not collect credentials into a fake account.
                </p>
                <span className="forge-cloud-state">Cloud identity · not configured</span>
              </>
            )}
          </section>
        </div>

        <p className="forge-account-boundary">
          Under-18 cloud identity, guardian relationships, organization access, and evidence sharing remain disabled until their consent and safeguarding controls are implemented and reviewed. <Link href="/evidence">See the evidence boundary.</Link>
        </p>
      </main>
    </ForgeShell>
  );
}
