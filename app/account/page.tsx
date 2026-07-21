import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdultPrivateEvidenceAccess } from "@/src/lib/forge-auth/server";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Account — FORGE" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const access = await getAdultPrivateEvidenceAccess();
  const { notice } = await searchParams;
  if (access.status === "signed_out") redirect("/login");
  if (access.status === "needs_activation") redirect("/account/activate");

  return (
    <main className="forge-auth-page">
      <Link className="forge-auth-back" href="/evidence">← Back to evidence</Link>
      <section className="forge-auth-card">
        <span>Account</span>
        <h1>{access.status === "adult" ? "Adult private evidence is active." : "Private evidence is unavailable."}</h1>
        {notice === "activated" ? <p className="forge-auth-notice" role="status">Activation complete. Nothing uploads until you choose Sync.</p> : null}
        {access.status === "adult" ? (
          <>
            <dl className="forge-auth-details">
              <div><dt>Identity plane</dt><dd>{access.email}</dd></div>
              <div><dt>Learning plane</dt><dd>Pseudonymous account ID under owner-only RLS</dd></div>
              <div><dt>Default</dt><dd>Device-only until each explicit sync</dd></div>
            </dl>
            <Link href="/evidence">Review and sync evidence</Link>
          </>
        ) : (
          <p>Check the Supabase environment and database migration. The public learning Worlds remain device-only.</p>
        )}
        <form action={signOut}><button type="submit">Sign out</button></form>
      </section>
    </main>
  );
}
