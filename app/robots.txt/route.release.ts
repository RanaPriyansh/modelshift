import { robotsText } from "@/app/robots";

export function GET(): Response {
  return new Response(robotsText(), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
