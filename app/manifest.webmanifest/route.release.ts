import manifest from "@/app/manifest";

export function GET(): Response {
  return Response.json(manifest(), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
}
