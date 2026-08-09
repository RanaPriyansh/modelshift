import "server-only";

import { cache } from "react";

import { createForgeSupabaseServerClient } from "./supabase.server";

export interface ForgeCloudIdentity {
  readonly id: string;
  readonly email: string | null;
  readonly accountKind: "cloud_identity";
}

export type ForgeCloudIdentitySubject = Pick<
  ForgeCloudIdentity,
  "id" | "accountKind"
>;

export function projectForgeCloudIdentitySubject(
  identity: ForgeCloudIdentity,
): ForgeCloudIdentitySubject {
  return {
    id: identity.id,
    accountKind: identity.accountKind,
  };
}

export const readForgeCloudIdentity = cache(async (): Promise<ForgeCloudIdentity | null> => {
  const supabase = await createForgeSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  // A cloud Auth session alone is not an active FORGE identity. This avoids
  // presenting a child or unreviewed account as a usable cloud account.
  const { data: learnerProfile, error: learnerError } = await supabase
    .schema("forge")
    .from("learner_profiles")
    .select("age_band, onboarding_status")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (learnerError || learnerProfile?.age_band !== "adult" || learnerProfile.onboarding_status !== "active") return null;

  const { data: accountProfile, error: accountError } = await supabase
    .schema("forge")
    .from("profiles")
    .select("account_status")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (accountError || accountProfile?.account_status !== "active") return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    accountKind: "cloud_identity",
  };
});

/**
 * Returns the minimum active-adult identity projection for server boundaries
 * that need account correlation but do not need contact data.
 */
export const readForgeCloudIdentitySubject = cache(
  async (): Promise<ForgeCloudIdentitySubject | null> => {
    const identity = await readForgeCloudIdentity();
    if (!identity) return null;
    return projectForgeCloudIdentitySubject(identity);
  },
);
