"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { allowCloudCredentialAttempt } from "@/src/lib/forge-auth/abuse-controls.server";
import { createForgeSupabaseServerClient } from "@/src/lib/forge-auth/supabase.server";

const credentialsSchema = z.strictObject({
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
});

function readCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function signIn(formData: FormData) {
  const parsed = readCredentials(formData);
  if (!parsed.success) redirect("/login?status=invalid-fields");
  if (!allowCloudCredentialAttempt(parsed.data.email)) redirect("/login?status=try-again-later");

  const supabase = await createForgeSupabaseServerClient();
  if (!supabase) redirect("/login?status=cloud-not-configured");

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) redirect("/login?status=sign-in-failed");

  // Age mode is a server-owned profile property. A browser checkbox, Auth
  // metadata, or session claim can never qualify a person for cloud access.
  const { data: learnerProfile, error: profileError } = await supabase
    .schema("forge")
    .from("learner_profiles")
    .select("age_band, onboarding_status")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (profileError || learnerProfile?.age_band !== "adult" || learnerProfile.onboarding_status !== "active") {
    await supabase.auth.signOut();
    redirect("/login?status=adult-account-required");
  }
  const { data: accountProfile, error: accountError } = await supabase
    .schema("forge")
    .from("profiles")
    .select("account_status")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (accountError || accountProfile?.account_status !== "active") {
    await supabase.auth.signOut();
    redirect("/login?status=adult-account-required");
  }

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signUpAdult(formData: FormData) {
  void formData;
  // There is intentionally no self-service account creation in this packet.
  // Until a separately reviewed server-owned adult enrollment gate exists,
  // accepting an age checkbox would let a minor obtain cloud identity.
  redirect("/login?status=adult-enrollment-unavailable");
}

export async function signOut() {
  const supabase = await createForgeSupabaseServerClient();
  if (!supabase) redirect("/login");

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
