import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdultPrivateEvidenceAccess } from "@/src/lib/forge-auth/server";
import { activateAdultAccount } from "./actions";

export const metadata: Metadata = { title: "Activate adult evidence — FORGE" };

const notices: Readonly<Record<string, string>> = {
  confirmation_required: "Both confirmations are required before any cloud learning record is created.",
  unavailable: "Private evidence is not configured in this environment.",
  activation_failed: "Activation was refused. The account may be unconfirmed, inactive, or already age-banded under 18.",
};

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const access = await getAdultPrivateEvidenceAccess();
  const { notice } = await searchParams;
  if (access.status === "adult") redirect("/account");
  if (access.status === "signed_out") redirect("/login");

  if (access.status === "device_only") {
    return (
      <main className="forge-auth-page"><section className="forge-auth-card">
        <span>Device-only boundary</span>
        <h1>Cloud evidence is unavailable for this profile.</h1>
        <p>Under-18 profiles remain device-only and cannot be converted through adult self-attestation.</p>
        <Link href="/evidence">Return to local evidence</Link>
      </section></main>
    );
  }

  return (
    <main className="forge-auth-page">
      <Link className="forge-auth-back" href="/evidence">← Keep evidence on this device</Link>
      <section className="forge-auth-card" aria-labelledby="activate-title">
        <span>Adult private evidence</span>
        <h1 id="activate-title">Make the cloud boundary explicit.</h1>
        <p>Signing in does not upload anything. Activation allows you to choose private sync from the Evidence page.</p>
        {notice && notices[notice] ? <p className="forge-auth-notice" role="alert">{notices[notice]}</p> : null}
        <form action={activateAdultAccount}>
          <label className="forge-auth-check">
            <input name="adult" type="checkbox" value="yes" required />
            <span>I confirm again that I am 18 or older.</span>
          </label>
          <label className="forge-auth-check">
            <input name="privatePersistence" type="checkbox" value="yes" required />
            <span>I want the option to store bounded evidence privately in Supabase and understand that no upload happens until I choose Sync.</span>
          </label>
          <button type="submit">Activate adult private evidence</button>
        </form>
      </section>
    </main>
  );
}
