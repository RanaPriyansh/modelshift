import { describe, expect, it } from "vitest";

import {
  resolveLocalPlaywrightServer,
  resolvePlaywrightJsonOutputFile,
  resolvePlaywrightOutputDirectory,
} from "../../playwright.config";

describe("Playwright result isolation", () => {
  it("uses a bounded default directory", () => {
    expect(resolvePlaywrightOutputDirectory({})).toBe(
      "test-results/semester-desk-v2-local",
    );
  });

  it("accepts one direct child under test-results", () => {
    expect(
      resolvePlaywrightOutputDirectory({
        FORGE_PLAYWRIGHT_OUTPUT_DIR: "test-results/semester-desk-v2-local",
      }),
    ).toBe("test-results/semester-desk-v2-local");
  });

  it("writes the established JSON report inside the bounded output directory", () => {
    expect(
      resolvePlaywrightJsonOutputFile({
        FORGE_PLAYWRIGHT_OUTPUT_DIR: "test-results/semester-desk-v2-local",
      }),
    ).toBe("test-results/semester-desk-v2-local/playwright-report.json");
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
    "test-results\\semester-desk-v2-local",
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
