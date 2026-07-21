"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "./env";

export function createClient() {
  const config = getSupabasePublicConfig();
  if (!config) throw new Error("Supabase public environment is not configured");
  return createBrowserClient(config.url, config.publishableKey);
}
