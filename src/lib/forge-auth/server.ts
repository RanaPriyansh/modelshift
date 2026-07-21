import "server-only";

import { canUseAdultPrivateEvidence, type LearnerProfileAuthority } from "./policy";
import { createClient } from "@/src/lib/supabase/server";

export type AdultPrivateEvidenceAccess =
  | { status: "unavailable" }
  | { status: "signed_out" }
  | { status: "needs_activation"; email: string }
  | { status: "device_only"; email: string }
  | { status: "adult"; userId: string; email: string };

export async function getAdultPrivateEvidenceAccess(): Promise<AdultPrivateEvidenceAccess> {
  const supabase = await createClient();
  if (!supabase) return { status: "unavailable" };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user || !user.email) return { status: "signed_out" };

  const { data, error } = await supabase
    .schema("forge")
    .from("learner_profiles")
    .select("age_band,onboarding_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { status: "unavailable" };
  if (!data) return { status: "needs_activation", email: user.email };

  const profile = data as LearnerProfileAuthority;
  if (!canUseAdultPrivateEvidence(profile)) {
    return profile.age_band === "adult"
      ? { status: "needs_activation", email: user.email }
      : { status: "device_only", email: user.email };
  }

  return { status: "adult", userId: user.id, email: user.email };
}
