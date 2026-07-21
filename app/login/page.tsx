import type { Metadata } from "next";
import Link from "next/link";

import { getSupabasePublicConfig, getPublicSiteUrl } from "@/src/lib/supabase/env";
import { requestAdultSignIn } from "./actions";

export const metadata: Metadata = {
  title: "Adult private evidence — FORGE",
  description: "Optional Supabase-backed private evidence for self-attested adults 18 and over.",
};

const NOTICES: Readonly<Record<string, string>> = {
  adult_required: "Private cloud evidence is only available to people who confirm they are 18 or older.",
  unavailable: "Adult sign-in is not configured in this environment. Device-only learning still works.",
  send_failed: "The sign-in link could not be sent. Try again later; do not create repeated requests.",
  check_email: "Check your email for the secure sign-in link. It may take a minute to arrive.",
  link_failed: "That sign-in link is invalid or expired. Request a new one.",
  signed_out: "You are signed out. Evidence already on this device remains here.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const configured = Boolean(getSupabasePublicConfig() && getPublicSiteUrl());

  return (
    <main className="forge-auth-page" id="forge-main">
      <Link className="forge-auth-back" href="/evidence">← Back to evidence</Link>
      <section className="forge-auth-card" aria-labelledby="adult-auth-title">
        <span>Optional · adults 18+</span>
        <h1 id="adult-auth-title">Keep a private evidence copy across devices.</h1>
        <p>
          FORGE will still save evidence only on this device unless an adult explicitly signs in and chooses to sync.
          Accounts and cloud evidence are not offered to anyone under 18 in this slice.
        </p>

        {notice && NOTICES[notice] ? <p className="forge-auth-notice" role="status">{NOTICES[notice]}</p> : null}

        <form action={requestAdultSignIn}>
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required disabled={!configured} />
          <label className="forge-auth-check">
            <input name="adult" type="checkbox" value="yes" required disabled={!configured} />
            <span>I confirm that I am 18 or older and want to create or use my own FORGE account.</span>
          </label>
          <button type="submit" disabled={!configured}>Email me a secure sign-in link</button>
        </form>

        <div className="forge-auth-boundary">
          <strong>What is stored</strong>
          <p>
            Supabase Auth holds the email and session. The learning plane stores a pseudonymous account ID and bounded proof
            metadata—not raw explanations, chat, confidence, personality inference, or a mastery score.
          </p>
        </div>
      </section>
    </main>
  );
}
