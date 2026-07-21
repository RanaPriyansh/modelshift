"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getPublicSiteUrl } from "@/src/lib/supabase/env";
import { createClient } from "@/src/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().trim().email().max(320),
  adult: z.literal("yes"),
});

export async function requestAdultSignIn(formData: FormData): Promise<never> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    adult: formData.get("adult"),
  });
  if (!parsed.success) redirect("/login?notice=adult_required");

  const supabase = await createClient();
  const siteUrl = getPublicSiteUrl();
  if (!supabase || !siteUrl) redirect("/login?notice=unavailable");

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl}/auth/callback?next=/account/activate`,
    },
  });

  redirect(error ? "/login?notice=send_failed" : "/login?notice=check_email");
}
