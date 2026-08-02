import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FORGE",
    short_name: "FORGE",
    description:
      "A private Semester Desk that helps university students rebuild a broken week from today.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#edf0e8",
    theme_color: "#173c29",
    lang: "en",
    dir: "ltr",
    orientation: "any",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
