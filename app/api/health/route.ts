import { buildReleaseHealth } from "@/src/operations/release-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const health = buildReleaseHealth();

  return Response.json(health, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Forge-Release-Sha": health.release_sha,
    },
  });
}
