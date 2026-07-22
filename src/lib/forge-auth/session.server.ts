import "server-only";

import { cache } from "react";

import { createForgeSupabaseServerClient } from "./supabase.server";

export interface ForgeCloudIdentity {
  readonly id: string;
  readonly email: string | null;
  readonly accountKind: "cloud_identity";
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
