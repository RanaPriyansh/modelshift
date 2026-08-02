import type { MetadataRoute } from "next";

function configuredSiteOrigin(): URL | null {
  const candidates = [
    process.env.NEXT_PUBLIC_FORGE_SITE_ORIGIN,
    process.env.FORGE_SITE_ORIGIN,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
      if (url.protocol === "http:" || url.protocol === "https:") return new URL(url.origin);
    } catch {
      // Ignore an invalid deployment value.
    }
  }

  return null;
}

function mayIndexPublicSite(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.FORGE_PUBLIC_INDEXING === "true";
}

export default function robots(): MetadataRoute.Robots {
  const origin = configuredSiteOrigin();
  const mayIndex = mayIndexPublicSite();

  return {
    rules: {
      userAgent: "*",
      ...(mayIndex ? { allow: "/" } : { disallow: "/" }),
    },
    ...(origin
      ? {
          host: origin.origin,
          sitemap: new URL("/sitemap.xml", origin).toString(),
        }
      : {}),
  };
}
