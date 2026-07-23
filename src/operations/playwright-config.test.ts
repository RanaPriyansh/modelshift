import { describe, expect, it } from "vitest";

import { resolveLocalPlaywrightServer } from "../../playwright.config";

describe("Playwright checkout isolation", () => {
  it("uses a dedicated non-3000 port and never reuses an existing process", () => {
    expect(resolveLocalPlaywrightServer({})).toEqual({
      port: "3317",
      baseURL: "http://127.0.0.1:3317",
      command: "pnpm dev --hostname 127.0.0.1 --port 3317",
      reuseExistingServer: false,
    });
  });

  it.each(["", "abc", "1", "65536", "123456"])(
    "rejects invalid local port %j",
    (port) => {
      expect(() =>
        resolveLocalPlaywrightServer({ FORGE_PLAYWRIGHT_PORT: port }),
      ).toThrow(/valid TCP port/);
    },
  );

  it("accepts an explicit isolated port", () => {
    expect(
      resolveLocalPlaywrightServer({ FORGE_PLAYWRIGHT_PORT: "3399" }),
    ).toMatchObject({
      port: "3399",
      baseURL: "http://127.0.0.1:3399",
      reuseExistingServer: false,
    });
  });
});
