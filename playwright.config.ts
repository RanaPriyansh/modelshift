import { defineConfig, devices } from "@playwright/test";

export type ForgePlaywrightEnvironment = Readonly<Record<string, string | undefined>>;

export function resolveLocalPlaywrightServer(
  environment: ForgePlaywrightEnvironment = process.env,
) {
  const localPort = environment.FORGE_PLAYWRIGHT_PORT ?? "3317";
  if (!/^\d{2,5}$/.test(localPort) || Number(localPort) > 65_535) {
    throw new Error("FORGE_PLAYWRIGHT_PORT must be a valid TCP port.");
  }

  return {
    port: localPort,
    baseURL: `http://127.0.0.1:${localPort}`,
    command: `pnpm dev --hostname 127.0.0.1 --port ${localPort}`,
    reuseExistingServer: false as const,
  };
}

const localServer = resolveLocalPlaywrightServer();
if (process.env.PLAYWRIGHT_BASE_URL === "") {
  throw new Error("PLAYWRIGHT_BASE_URL must be omitted or set to a nonempty URL.");
}
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localServer.baseURL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: localServer.command,
        url: baseURL,
        // Reusing an arbitrary process can silently exercise a different
        // checkout. A collision must fail loudly; exact-SHA release runs use
        // the production verification harness and an explicit base URL.
        reuseExistingServer: localServer.reuseExistingServer,
        timeout: 120_000,
      },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
});
