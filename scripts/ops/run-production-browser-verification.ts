import { spawn, type ChildProcessByStdio } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import type { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

type ServerProcess = ChildProcessByStdio<null, Readable, Readable>;
const STARTUP_TIMEOUT_MS = 90_000;
const arg = (name: string): string | undefined => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };

async function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); if (!address || typeof address === "string") { server.close(); reject(new Error("could not allocate a production browser port")); return; } server.close((error) => error ? reject(error) : resolvePort(address.port)); });
  });
}
async function waitForServer(baseUrl: string, child: ServerProcess): Promise<void> { const deadline = Date.now() + STARTUP_TIMEOUT_MS; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`production server exited during startup with code ${child.exitCode}`); try { const response = await fetch(new URL("/api/health", baseUrl), { signal: AbortSignal.timeout(1_000), redirect: "manual" }); if (response.status === 200) return; } catch { /* bounded startup poll */ } await new Promise((done) => setTimeout(done, 250)); } throw new Error("production browser server did not become ready within 90 seconds"); }
async function stop(child: ServerProcess): Promise<void> { if (child.exitCode !== null) return; child.kill("SIGTERM"); await Promise.race([new Promise<void>((done) => child.once("exit", () => done())), new Promise<void>((done) => setTimeout(done, 5_000))]); if (child.exitCode === null) child.kill("SIGKILL"); }
async function main() {
  const expectedSha = arg("--expected-sha"); if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) throw new Error("--expected-sha must be a full 40-character Git SHA");
  const port = await availablePort(); const baseUrl = `http://127.0.0.1:${port}`; const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const serverEnv: NodeJS.ProcessEnv = { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", OPENAI_API_KEY: "", OPENAI_INTERPRETATION_ENABLED: "false", OPENAI_FORGE_PLANNER_ENABLED: "false", FORGE_LESSON_STUDIO_OPENAI_ENABLED: "false", FORGE_CLOUD_ACCOUNTS_ENABLED: "false", FORGE_RELEASE_SHA: expectedSha.toLowerCase(), FORGE_BUILD_TIME: process.env.FORGE_BUILD_TIME ?? "unknown", FORGE_LOCKFILE_DIGEST: process.env.FORGE_LOCKFILE_DIGEST, FORGE_CONTENT_MANIFEST_DIGEST: process.env.FORGE_CONTENT_MANIFEST_DIGEST, FORGE_EVALUATOR_BASELINE_DIGEST: process.env.FORGE_EVALUATOR_BASELINE_DIGEST, FORGE_DATABASE_MIGRATION_IDENTITY: process.env.FORGE_DATABASE_MIGRATION_IDENTITY ?? "not_configured" };
  for (const key of ["PATH", "HOME", "TMPDIR", "PNPM_HOME", "COREPACK_HOME", "CI"]) if (process.env[key]) serverEnv[key] = process.env[key];
  const child = spawn(command, ["start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: process.cwd(), env: serverEnv, stdio: ["ignore", "pipe", "pipe"] });
  const logs: Buffer[] = []; child.stdout.on("data", (chunk: Buffer) => logs.push(chunk)); child.stderr.on("data", (chunk: Buffer) => logs.push(chunk));
  try { await waitForServer(baseUrl, child); const result = await new Promise<number>((resolveExit) => { const browser = spawn(command, ["exec", "playwright", "test"], { cwd: process.cwd(), env: { ...process.env, CI: "true", PLAYWRIGHT_BASE_URL: baseUrl }, stdio: "inherit" }); browser.once("exit", (code) => resolveExit(code ?? 1)); }); if (result !== 0) process.exitCode = result; }
  catch (error) { const bounded = Buffer.concat(logs).toString("utf8").slice(-16_000).replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_TOKEN]"); if (bounded) console.error(`bounded production server log:\n${bounded}`); throw error; }
  finally { await stop(child); }
}
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) void main().catch((error: unknown) => { console.error(`production browser verification failed: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
