import { sitemapXML } from "@/app/sitemap";

export function GET(): Response {
  return new Response(sitemapXML(), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
