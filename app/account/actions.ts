"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

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

  const supabase = await createForgeSupabaseServerClient();
  if (!supabase) redirect("/login?status=cloud-not-configured");

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?status=sign-in-failed");

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signUpAdult(formData: FormData) {
  const parsed = readCredentials(formData);
  const adultConfirmation = formData.get("adult-confirmation");
  if (!parsed.success || adultConfirmation !== "confirmed") redirect("/login?status=adult-required");

  const supabase = await createForgeSupabaseServerClient();
  if (!supabase) redirect("/login?status=cloud-not-configured");

  // The checkbox is a release-entry self-attestation, not an authorization
  // role. No user-editable metadata is trusted for adult or guardian access.
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) redirect("/login?status=sign-up-failed");

  revalidatePath("/", "layout");
  redirect(data?.session ? "/account" : "/login?status=check-email");
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
