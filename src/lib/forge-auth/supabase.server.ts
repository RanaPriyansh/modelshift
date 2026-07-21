import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { forgeAuthCookieOptions, readForgeCloudAuthConfig } from "./config";

export async function createForgeSupabaseServerClient() {
  const config = readForgeCloudAuthConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: forgeAuthCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The root proxy performs
          // refresh writes before protected pages are rendered.
        }
      },
    },
  });
}
