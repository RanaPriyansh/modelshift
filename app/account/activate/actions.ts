"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";

export async function activateAdultAccount(formData: FormData): Promise<never> {
  if (formData.get("adult") !== "yes" || formData.get("privatePersistence") !== "yes") {
    redirect("/account/activate?notice=confirmation_required");
  }

  const supabase = await createClient();
  if (!supabase) redirect("/account/activate?notice=unavailable");

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) redirect("/login?notice=link_failed");

  const { error } = await supabase.schema("forge").rpc("activate_adult_account", {
    p_adult_self_attested: true,
    p_private_persistence_opt_in: true,
  });
  redirect(error ? "/account/activate?notice=activation_failed" : "/account?notice=activated");
}
