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

export function robotsText(): string {
  const value = robots();
  const rule = Array.isArray(value.rules) ? value.rules[0] : value.rules;
  const lines = [
    `User-agent: ${Array.isArray(rule.userAgent) ? rule.userAgent.join(" ") : rule.userAgent}`,
    "allow" in rule ? `Allow: ${Array.isArray(rule.allow) ? rule.allow.join(" ") : rule.allow}` : null,
    "disallow" in rule
      ? `Disallow: ${Array.isArray(rule.disallow) ? rule.disallow.join(" ") : rule.disallow}`
      : null,
    value.host ? `Host: ${value.host}` : null,
    value.sitemap
      ? `Sitemap: ${Array.isArray(value.sitemap) ? value.sitemap.join(" ") : value.sitemap}`
      : null,
  ].filter((line): line is string => line !== null);

  return `${lines.join("\n")}\n`;
}
