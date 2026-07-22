import { spawn, type ChildProcessByStdio } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import type { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

import { verifyDeployment, writeDeploymentReport } from "./deployment-verifier";

const STARTUP_TIMEOUT_MS = 90_000;
type ServerProcess = ChildProcessByStdio<null, Readable, Readable>;
const arg = (name: string): string | undefined => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
async function availablePort(): Promise<number> { return new Promise((resolvePort, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); if (!address || typeof address === "string") { server.close(); reject(new Error("could not allocate a local verification port")); return; } server.close((error) => error ? reject(error) : resolvePort(address.port)); }); }); }
function boundedLogs(child: ServerProcess): () => string { let output = ""; const append = (chunk: Buffer) => { output = `${output}${chunk.toString("utf8")}`.slice(-16_000); }; child.stdout.on("data", append); child.stderr.on("data", append); return () => output.replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_TOKEN]").replace(/(OPENAI_API_KEY|DATABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=\S+/gi, "$1=[REDACTED]"); }
function serverEnvironment(sha: string): NodeJS.ProcessEnv { const env: NodeJS.ProcessEnv = { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", OPENAI_API_KEY: "", FORGE_RELEASE_SHA: sha, FORGE_BUILD_TIME: new Date().toISOString() }; for (const key of ["PATH", "HOME", "TMPDIR", "PNPM_HOME", "COREPACK_HOME", "CI"]) if (process.env[key]) env[key] = process.env[key]; return env; }
async function waitForServer(baseUrl: string, child: ServerProcess): Promise<void> { const deadline = Date.now() + STARTUP_TIMEOUT_MS; while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`production server exited during startup with code ${child.exitCode}`); try { const response = await fetch(new URL("/api/health", baseUrl), { redirect: "manual", signal: AbortSignal.timeout(1_000) }); if (response.status === 200) return; } catch { /* bounded startup poll */ } await new Promise((done) => setTimeout(done, 250)); } throw new Error("production server did not become ready within 90 seconds"); }
async function stopServer(child: ServerProcess): Promise<void> { if (child.exitCode !== null) return; child.kill("SIGTERM"); await Promise.race([new Promise<void>((done) => child.once("exit", () => done())), new Promise<void>((done) => setTimeout(done, 5_000))]); if (child.exitCode === null) child.kill("SIGKILL"); }
async function main() {
  const expectedSha = arg("--expected-sha");
  if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) throw new Error("--expected-sha must be a full 40-character Git SHA");
  const outputDirectory = resolve(arg("--output-dir") ?? "test-results/release-ops"); const port = await availablePort(); const baseUrl = `http://127.0.0.1:${port}`; const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const child = spawn(command, ["start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: process.cwd(), env: serverEnvironment(expectedSha.toLowerCase()), stdio: ["ignore", "pipe", "pipe"] }); const recentLogs = boundedLogs(child);
  try { await waitForServer(baseUrl, child); const report = await verifyDeployment({ baseUrl, expectedSha, allowLocalhost: true }); await writeDeploymentReport(report, outputDirectory); console.log(`local production verification: ${report.status.toUpperCase()} (${report.summary.passed} passed, ${report.summary.failed} failed)`); console.log(`report: ${resolve(outputDirectory, "deployment-verification.md")}`); if (report.status === "fail") process.exitCode = 1; }
  catch (error) { const logs = recentLogs(); if (logs) console.error(`bounded production server log:\n${logs}`); throw error; }
  finally { await stopServer(child); }
}
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) void main().catch((error: unknown) => { console.error(`local production verification failed: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 1; });
