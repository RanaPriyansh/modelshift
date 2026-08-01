import { describe, expect, it } from "vitest";

import {
  resolveLocalPlaywrightServer,
  resolvePlaywrightOutputDirectory,
} from "../../playwright.config";

describe("Playwright result isolation", () => {
  it("uses a bounded default directory", () => {
    expect(resolvePlaywrightOutputDirectory({})).toBe("test-results/default");
  });

  it("accepts one direct child under test-results", () => {
    expect(
      resolvePlaywrightOutputDirectory({
        FORGE_PLAYWRIGHT_OUTPUT_DIR: "test-results/university-foundation",
      }),
    ).toBe("test-results/university-foundation");
  });

  it.each([
    "",
    ".",
    "/",
    "/tmp/playwright",
    "\\tmp\\playwright",
    "test-results",
    "test-results/",
    "test-results/.",
    "test-results/..",
    "test-results/../outside",
    "test-results/nested/output",
    "test-results\\university-foundation",
  ])("rejects unbounded output directory %j", (outputDirectory) => {
    expect(() =>
      resolvePlaywrightOutputDirectory({
        FORGE_PLAYWRIGHT_OUTPUT_DIR: outputDirectory,
      }),
    ).toThrow(
      "FORGE_PLAYWRIGHT_OUTPUT_DIR must be one bounded directory under test-results.",
    );
  });
});

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
