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

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    accountKind: "cloud_identity",
  };
});
