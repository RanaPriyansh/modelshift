import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const LOCKFILE = "pnpm-lock.yaml";
const DIGEST = /^[a-f0-9]{64}$/;

function fail(message) {
  throw new Error(`Immutable lockfile identity rejected: ${message}`);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitShow(ref) {
  if (!ref) fail("a non-empty --source-ref (or GITHUB_SHA) is required.");
  if (!/^[a-f0-9]{40}$/.test(ref)) fail("--source-ref (or GITHUB_SHA) must be an exact lowercase 40-character Git commit SHA.");
  const commitCheck = spawnSync("git", ["cat-file", "-e", `${ref}^{commit}`], { encoding: "utf8" });
  const objectType = spawnSync("git", ["cat-file", "-t", ref], { encoding: "utf8" });
  if (commitCheck.error || objectType.error || commitCheck.status !== 0 || objectType.status !== 0 || objectType.stdout.trim() !== "commit") {
    fail(`source SHA ${JSON.stringify(ref)} does not identify a Git commit object.`);
  }
  const result = spawnSync("git", ["show", `${ref}:${LOCKFILE}`], {
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) fail(`could not execute git show for source ref ${JSON.stringify(ref)}.`);
  if (result.status !== 0) fail(`git show could not read ${LOCKFILE} from immutable source ref ${JSON.stringify(ref)}.`);
  if (!result.stdout || result.stdout.length === 0) fail(`${LOCKFILE} is empty in immutable source ref ${JSON.stringify(ref)}.`);
  return result.stdout;
}

function appendGitHubEnvironment(path, value) {
  if (!path) return;
  writeFileSync(path, `FORGE_LOCKFILE_DIGEST=${value}\n`, { encoding: "utf8", flag: "a" });
}

function capture() {
  const ref = argument("--source-ref") ?? process.env.GITHUB_SHA;
  const value = digest(gitShow(ref));
  appendGitHubEnvironment(argument("--github-env"), value);
  process.stdout.write(`${value}\n`);
}

function workingTreeIsClean() {
  const result = spawnSync("git", ["diff", "--exit-code", "--", LOCKFILE], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) fail(`could not inspect ${LOCKFILE} for post-install Git mutation.`);
  return result.status === 0;
}

function verify() {
  const expected = argument("--expected-digest") ?? process.env.FORGE_LOCKFILE_DIGEST;
  if (!expected || !DIGEST.test(expected)) fail("a lowercase 64-character --expected-digest (or FORGE_LOCKFILE_DIGEST) is required.");
  const lockfilePath = resolve(process.cwd(), LOCKFILE);
  if (!existsSync(lockfilePath)) fail(`${LOCKFILE} is missing from the working tree after dependency installation.`);
  const actual = digest(readFileSync(lockfilePath));
  const cleanWorkingTree = workingTreeIsClean();
  if (actual !== expected && !cleanWorkingTree) {
    fail(`${LOCKFILE} digest differs from the immutable source digest and from the checked-out Git source after dependency installation.`);
  }
  if (actual !== expected) fail(`${LOCKFILE} digest differs from the immutable source digest after dependency installation.`);
  if (!cleanWorkingTree) fail(`${LOCKFILE} differs from the checked-out Git source after dependency installation.`);
  process.stdout.write(`${actual}\n`);
}

try {
  const mode = process.argv[2];
  if (mode === "capture") capture();
  else if (mode === "verify") verify();
  else fail("expected command: capture or verify.");
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
