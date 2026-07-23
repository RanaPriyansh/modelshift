import { spawn, type ChildProcessByStdio } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { resolve } from "node:path";
import type { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

import { readPublicAssetDigest } from "./release-digests";

type ServerProcess = ChildProcessByStdio<null, Readable, Readable>;
const STARTUP_TIMEOUT_MS = 90_000;
export const MAX_SERVER_LOG_BYTES = 16_000;
const arg = (name: string): string | undefined => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const require = createRequire(import.meta.url);

/** Start the actual Next CLI process so shutdown cannot orphan a pnpm child. */
export function productionServerInvocation(port: number): { command: string; args: string[] } {
  return {
    command: process.execPath,
    args: [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)],
  };
}

/** Keep only a rolling tail; never concatenate an unbounded server-log buffer. */
export function appendBoundedServerLog(current: Buffer, chunk: Buffer, maximumBytes = MAX_SERVER_LOG_BYTES): Buffer {
  if (maximumBytes <= 0) return Buffer.alloc(0);
  if (chunk.length >= maximumBytes) return chunk.subarray(chunk.length - maximumBytes);
  const retainedCurrent = current.subarray(Math.max(0, current.length - (maximumBytes - chunk.length)));
  return Buffer.concat([retainedCurrent, chunk], retainedCurrent.length + chunk.length);
}

async function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); if (!address || typeof address === "string") { server.close(); reject(new Error("could not allocate a production browser port")); return; } server.close((error) => error ? reject(error) : resolvePort(address.port)); });
  });
}
async function waitForServer(baseUrl: string, child: ServerProcess): Promise<void> { const deadline = Date.now() + STARTUP_TIMEOUT_MS; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`production server exited during startup with code ${child.exitCode}`); try { const response = await fetch(new URL("/api/health", baseUrl), { signal: AbortSignal.timeout(1_000), redirect: "manual" }); if (response.status === 200) return; } catch { /* bounded startup poll */ } await new Promise((done) => setTimeout(done, 250)); } throw new Error("production browser server did not become ready within 90 seconds"); }
function hasExited(child: ServerProcess): boolean { return child.exitCode !== null || child.signalCode !== null; }
async function waitForExit(child: ServerProcess, timeoutMs: number): Promise<boolean> {
  if (hasExited(child)) return true;
  return new Promise((resolveExit) => {
    const finish = () => { clearTimeout(timer); child.off("exit", finish); resolveExit(true); };
    const timer = setTimeout(() => { child.off("exit", finish); resolveExit(hasExited(child)); }, timeoutMs);
    child.once("exit", finish);
    if (hasExited(child)) finish();
  });
}
export async function stopProductionServer(child: ServerProcess): Promise<void> {
  if (hasExited(child)) return;
  child.kill("SIGTERM");
  if (await waitForExit(child, 5_000)) return;
  child.kill("SIGKILL");
  if (!(await waitForExit(child, 5_000))) throw new Error("production browser server did not exit after SIGKILL");
}
function browserEnvironment(baseUrl: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    CI: "true",
    NODE_ENV: "production",
    PLAYWRIGHT_BASE_URL: baseUrl,
    OPENAI_API_KEY: "",
    OPENAI_INTERPRETATION_ENABLED: "false",
    OPENAI_INTERPRETATION_DISABLED: "true",
    OPENAI_FORGE_PLANNER_ENABLED: "false",
    OPENAI_FORGE_PLANNER_DISABLED: "true",
    FORGE_CLOUD_ACCOUNTS_ENABLED: "false",
    FORGE_SUPABASE_URL: "",
    FORGE_SUPABASE_PUBLISHABLE_KEY: "",
    DATABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    FORGE_SUPABASE_SERVICE_ROLE_KEY: "",
  };
  for (const key of ["PATH", "HOME", "TMPDIR", "PNPM_HOME", "COREPACK_HOME"]) if (process.env[key]) env[key] = process.env[key];
  return env;
}
async function main() {
  const expectedSha = arg("--expected-sha"); if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) throw new Error("--expected-sha must be a full 40-character Git SHA");
  const port = await availablePort(); const baseUrl = `http://127.0.0.1:${port}`; const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const serverEnv: NodeJS.ProcessEnv = { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", OPENAI_API_KEY: "", OPENAI_INTERPRETATION_ENABLED: "false", OPENAI_FORGE_PLANNER_ENABLED: "false", FORGE_CLOUD_ACCOUNTS_ENABLED: "false", FORGE_RELEASE_SHA: expectedSha.toLowerCase(), FORGE_BUILD_TIME: process.env.FORGE_BUILD_TIME ?? "unknown", FORGE_LOCKFILE_DIGEST: process.env.FORGE_LOCKFILE_DIGEST, FORGE_PUBLIC_ASSET_DIGEST: readPublicAssetDigest(), FORGE_CONTENT_MANIFEST_DIGEST: process.env.FORGE_CONTENT_MANIFEST_DIGEST, FORGE_EVALUATOR_BASELINE_DIGEST: process.env.FORGE_EVALUATOR_BASELINE_DIGEST, FORGE_DATABASE_MIGRATION_IDENTITY: process.env.FORGE_DATABASE_MIGRATION_IDENTITY ?? "not_configured" };
  for (const key of ["PATH", "HOME", "TMPDIR", "PNPM_HOME", "COREPACK_HOME", "CI"]) if (process.env[key]) serverEnv[key] = process.env[key];
  const server = productionServerInvocation(port);
  const child = spawn(server.command, server.args, { cwd: process.cwd(), env: serverEnv, stdio: ["ignore", "pipe", "pipe"] });
  let logs: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  const appendLog = (chunk: Buffer) => { logs = appendBoundedServerLog(logs, chunk); };
  child.stdout.on("data", appendLog); child.stderr.on("data", appendLog);
  try { await waitForServer(baseUrl, child); const result = await new Promise<number>((resolveExit) => { const browser = spawn(command, ["exec", "playwright", "test"], { cwd: process.cwd(), env: browserEnvironment(baseUrl), stdio: "inherit" }); browser.once("exit", (code) => resolveExit(code ?? 1)); }); if (result !== 0) process.exitCode = result; }
  catch (error) { const bounded = logs.toString("utf8").replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_TOKEN]"); if (bounded) console.error(`bounded production server log:\n${bounded}`); throw error; }
  finally { await stopProductionServer(child); }
}
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) void main().catch((error: unknown) => { console.error(`production browser verification failed: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
