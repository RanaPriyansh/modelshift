import type { NextConfig } from "next";

import {
  productionBuildId,
  readBuildSourceCommit,
} from "./scripts/ops/build-source-identity";

const buildSourceCommit = readBuildSourceCommit();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  pageExtensions: ["release.tsx", "release.ts"],
  env: {
    FORGE_COMPILED_SOURCE_SHA: buildSourceCommit,
  },
  generateBuildId: async () => productionBuildId(buildSourceCommit),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), browsing-topics=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
