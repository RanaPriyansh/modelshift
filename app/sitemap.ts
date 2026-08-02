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

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = configuredSiteOrigin();
  if (!origin) return [];

  return [
    { url: new URL("/", origin).toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/how-forge-works", origin).toString(), changeFrequency: "monthly", priority: 0.8 },
    { url: new URL("/university", origin).toString(), changeFrequency: "monthly", priority: 0.8 },
    { url: new URL("/privacy", origin).toString(), changeFrequency: "yearly", priority: 0.4 },
    { url: new URL("/support", origin).toString(), changeFrequency: "monthly", priority: 0.4 },
  ];
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function sitemapXML(): string {
  const entries = sitemap().map((entry) => [
    "  <url>",
    `    <loc>${xmlEscape(entry.url)}</loc>`,
    entry.changeFrequency
      ? `    <changefreq>${entry.changeFrequency}</changefreq>`
      : null,
    typeof entry.priority === "number"
      ? `    <priority>${entry.priority}</priority>`
      : null,
    "  </url>",
  ].filter((line): line is string => line !== null).join("\n"));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}
