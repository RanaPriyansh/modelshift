export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!validHttpUrl(url) || publishableKey.length < 20) return null;
  return { url, publishableKey };
}

export function getPublicSiteUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  return validHttpUrl(value) ? new URL(value).origin : null;
}
