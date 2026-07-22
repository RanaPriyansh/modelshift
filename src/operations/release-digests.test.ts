import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { PRIMARY_SOURCE_RUNTIME_BINDING } from "../forge/world-runtime/primary-source-binding";
import { BUILT_IN_WORLD_PACKS } from "../forge/worlds";
import {
  assertPrimarySourceContentPackageManifest,
  assertRetainedContentPackageManifest,
  packageIntegrityHash,
  primarySourceRuntimeBindingDigest,
  readReleaseDigests,
  runtimeBindingDigest,
} from "../../scripts/ops/release-digests";
import { assertCanonicalLockfileDigest } from "../../scripts/ops/run-local-production-verification";

type Manifest = {
  schema_version: string;
  packages: Array<{
    id: string;
    version: string;
    route: string;
    runtime_binding_digest?: string;
    package_integrity_hash?: string;
  }>;
};

function manifest(): Manifest {
  return JSON.parse(readFileSync(resolve(process.cwd(), "scripts/ops/content-package-manifest.json"), "utf8")) as Manifest;
}

function packageById(value: Manifest, id: string) {
  const entry = value.packages.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Missing fixture package ${id}.`);
  return entry;
}

function clonedBinding(): Record<string, unknown> {
  return structuredClone(PRIMARY_SOURCE_RUNTIME_BINDING) as Record<string, unknown>;
}

function copyReleaseDigestInputs(): string {
  const root = mkdtempSync(resolve(tmpdir(), "forge-release-digests-"));
  cpSync(resolve(process.cwd(), "pnpm-lock.yaml"), resolve(root, "pnpm-lock.yaml"));
  cpSync(resolve(process.cwd(), "scripts/ops/evaluation-baseline.json"), resolve(root, "scripts/ops/evaluation-baseline.json"));
  cpSync(resolve(process.cwd(), "scripts/ops/content-package-manifest.json"), resolve(root, "scripts/ops/content-package-manifest.json"));
  return root;
}

const immutableLockfileHelper = resolve(process.cwd(), "scripts/operations/immutable-lockfile.mjs");

function createLockfileRepository(lockfile = "lockfile: immutable\n") {
  const root = mkdtempSync(resolve(tmpdir(), "forge-immutable-lockfile-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    execFileSync("git", ["config", "user.email", "forge-test@example.test"], { cwd: root });
    execFileSync("git", ["config", "user.name", "FORGE test"], { cwd: root });
    writeFileSync(resolve(root, "pnpm-lock.yaml"), lockfile, "utf8");
    execFileSync("git", ["add", "pnpm-lock.yaml"], { cwd: root });
    execFileSync("git", ["commit", "--quiet", "-m", "lockfile fixture"], { cwd: root });
    return { root, sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim() };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function runImmutableLockfile(root: string, args: readonly string[], environment: Partial<NodeJS.ProcessEnv> = {}) {
  return spawnSync(process.execPath, [immutableLockfileHelper, ...args], { cwd: root, encoding: "utf8", env: { ...process.env, ...environment } });
}

describe("retained content package identity", () => {
  it("matches every released built-in package and assigns digests only to runtime-bound packs", () => {
    const retained = manifest();
    assertRetainedContentPackageManifest(retained);
    assertPrimarySourceContentPackageManifest(retained);

    const byId = <Entry extends { id: string }>(left: Entry, right: Entry) => left.id.localeCompare(right.id);
    expect(retained.packages.map(({ id, version, route, runtime_binding_digest, package_integrity_hash }) => ({ id, version, route, runtime_binding_digest, package_integrity_hash })).sort(byId)).toEqual(
      BUILT_IN_WORLD_PACKS
        .filter((pack) => pack.release.status === "released")
        .map((pack) => ({
          id: pack.manifest.id,
          version: pack.manifest.version,
          route: pack.manifest.route,
          runtime_binding_digest: "runtime" in pack ? runtimeBindingDigest(pack.runtime) : undefined,
          package_integrity_hash: "runtime" in pack ? packageIntegrityHash(pack) : undefined,
        }))
        .sort(byId),
    );
  });

  it.each([
    ["missing schema version", (candidate: Manifest) => { delete (candidate as unknown as Record<string, unknown>).schema_version; }],
    ["wrong schema version", (candidate: Manifest) => { (candidate as unknown as Record<string, unknown>).schema_version = "2.0"; }],
    ["non-string schema version", (candidate: Manifest) => { (candidate as unknown as Record<string, unknown>).schema_version = 1; }],
    ["unsupported root field", (candidate: Manifest) => { (candidate as unknown as Record<string, unknown>).unexpected = true; }],
    ["missing ID", (candidate: Manifest) => { candidate.packages = candidate.packages.filter((entry) => entry.id !== "world.proportional-reasoning"); }],
    ["extra ID", (candidate: Manifest) => { candidate.packages.push({ id: "world.unreviewed", version: "1.0.0", route: "/learn/unreviewed" }); }],
    ["duplicate ID", (candidate: Manifest) => { candidate.packages.push({ ...packageById(candidate, "world.proportional-reasoning"), route: "/learn/duplicate" }); }],
    ["duplicate route", (candidate: Manifest) => { packageById(candidate, "world.proportional-reasoning").route = "/learn/force-and-motion"; }],
    ["stale version", (candidate: Manifest) => { packageById(candidate, "world.primary-source-reasoning").version = "1.0.0"; }],
    ["stale route", (candidate: Manifest) => { packageById(candidate, "world.primary-source-reasoning").route = "/learn/stale"; }],
    ["stale runtime digest", (candidate: Manifest) => { packageById(candidate, "world.primary-source-reasoning").runtime_binding_digest = "sha256:stale"; }],
    ["stale package digest", (candidate: Manifest) => { packageById(candidate, "world.primary-source-reasoning").package_integrity_hash = "sha256:stale"; }],
    ["invented legacy runtime digest", (candidate: Manifest) => { packageById(candidate, "world.proportional-reasoning").runtime_binding_digest = primarySourceRuntimeBindingDigest(); }],
  ])("rejects a %s attack", (_name, mutate) => {
    const candidate = structuredClone(manifest());
    mutate(candidate);
    expect(() => assertRetainedContentPackageManifest(candidate)).toThrow(/Retained content manifest rejected/);
  });

  it("automatically requires a Ratio runtime digest when its built-in pack gains a runtime binding", () => {
    const futureRuntimePacks = BUILT_IN_WORLD_PACKS.map((pack) =>
      pack.manifest.id === "world.proportional-reasoning"
        ? { ...pack, runtime: clonedBinding() }
        : pack,
    );

    expect(() => assertRetainedContentPackageManifest(manifest(), futureRuntimePacks)).toThrow(
      /stale runtime binding digest for world.proportional-reasoning/,
    );
  });

  it.each([
    ["protocol", (binding: Record<string, unknown>) => { binding.protocolVersion = "1.0.3"; }],
    ["validator", (binding: Record<string, unknown>) => { (binding.proof as Record<string, unknown>).validatorId = "validator.primary-source-reasoning-transfer.v2"; }],
    ["source", (binding: Record<string, unknown>) => { ((binding.sourceBindings as Array<Record<string, unknown>>)[0]!).sourceItemId = "source.loc.changed"; }],
    ["proof lock", (binding: Record<string, unknown>) => { (binding.proof as Record<string, unknown>).blockedActionKinds = ["instructional_support", "model_action"]; }],
    ["access", (binding: Record<string, unknown>) => { ((binding.access as Record<string, unknown>).accommodations as Array<Record<string, unknown>>)[0]!.nonvisualAlternative = false; }],
    ["remains untested", (binding: Record<string, unknown>) => { (binding.evidence as Record<string, unknown>).remainsUntested = ["Forged release limitation."]; }],
  ])("changes the runtime binding digest when %s changes", (_name, mutate) => {
    const candidate = clonedBinding();
    mutate(candidate);
    expect(runtimeBindingDigest(candidate)).not.toBe(primarySourceRuntimeBindingDigest());
    const packsWithMutatedBinding = BUILT_IN_WORLD_PACKS.map((pack) =>
      pack.manifest.id === "world.primary-source-reasoning"
        ? { ...pack, runtime: candidate }
        : pack,
    );
    expect(() => assertRetainedContentPackageManifest(manifest(), packsWithMutatedBinding)).toThrow(
      /stale runtime binding digest for world.primary-source-reasoning/,
    );
  });

  it("rejects an unchanged runtime digest paired with a stale package identity", () => {
    const packsWithMutatedPackage = BUILT_IN_WORLD_PACKS.map((pack) =>
      pack.manifest.id === "world.primary-source-reasoning"
        ? { ...pack, release: { ...pack.release, contentVersion: "9.9.9" } }
        : pack,
    );
    expect(() => assertRetainedContentPackageManifest(manifest(), packsWithMutatedPackage)).toThrow(
      /stale package integrity hash for world.primary-source-reasoning/,
    );
  });

  it("keeps release content identity as the SHA-256 of exact retained file bytes", () => {
    const root = copyReleaseDigestInputs();
    try {
      const manifestPath = resolve(root, "scripts/ops/content-package-manifest.json");
      const originalBytes = readFileSync(manifestPath, "utf8");
      expect(readReleaseDigests(root).contentManifest).toBe(createHash("sha256").update(originalBytes).digest("hex"));

      writeFileSync(manifestPath, `${originalBytes}\n`, "utf8");
      const changedBytes = readFileSync(manifestPath, "utf8");
      expect(readReleaseDigests(root).contentManifest).toBe(createHash("sha256").update(changedBytes).digest("hex"));
      expect(readReleaseDigests(root).contentManifest).not.toBe(createHash("sha256").update(originalBytes).digest("hex"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("immutable dependency identity", () => {
  it.each(["lockfile: committed\n", "lockfile: committed"])("uses exact committed source bytes even when working-tree bytes differ: %j", (sourceBytes) => {
    const { root, sha } = createLockfileRepository(sourceBytes);
    try {
      const environmentPath = resolve(root, "github-env");
      writeFileSync(resolve(root, "pnpm-lock.yaml"), `${sourceBytes}\nworking-tree-only\n`, "utf8");

      const result = runImmutableLockfile(root, ["capture", "--source-ref", sha, "--github-env", environmentPath]);
      const expected = createHash("sha256").update(sourceBytes).digest("hex");
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(expected);
      expect(readFileSync(environmentPath, "utf8")).toBe(`FORGE_LOCKFILE_DIGEST=${expected}\n`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects missing, revision-expression, malformed, and non-commit source refs", () => {
    const missingRef = createLockfileRepository();
    const invalidRef = createLockfileRepository();
    try {
      const tree = execFileSync("git", ["rev-parse", `${invalidRef.sha}^{tree}`], { cwd: invalidRef.root, encoding: "utf8" }).trim();
      const blob = execFileSync("git", ["rev-parse", `${invalidRef.sha}:pnpm-lock.yaml`], { cwd: invalidRef.root, encoding: "utf8" }).trim();
      expect(runImmutableLockfile(missingRef.root, ["capture"], { GITHUB_SHA: "" }).status).toBe(1);
      for (const ref of ["HEAD", `${invalidRef.sha}^{commit}`, invalidRef.sha.slice(0, 12), invalidRef.sha.toUpperCase(), "g".repeat(40)]) {
        expect(runImmutableLockfile(invalidRef.root, ["capture", "--source-ref", ref]).stderr).toMatch(/exact lowercase 40-character Git commit SHA/);
      }
      for (const object of [tree, blob, "0".repeat(40)]) {
        expect(runImmutableLockfile(invalidRef.root, ["capture", "--source-ref", object]).stderr).toMatch(/does not identify a Git commit object/);
      }
    } finally {
      rmSync(missingRef.root, { recursive: true, force: true });
      rmSync(invalidRef.root, { recursive: true, force: true });
    }
  });

  it("rejects empty committed blobs and missing working-tree lockfiles", () => {
    const emptyBlob = createLockfileRepository("");
    const missingWorkingTree = createLockfileRepository();
    try {
      expect(runImmutableLockfile(emptyBlob.root, ["capture", "--source-ref", emptyBlob.sha]).stderr).toMatch(/is empty/);
      rmSync(resolve(missingWorkingTree.root, "pnpm-lock.yaml"));
      expect(runImmutableLockfile(missingWorkingTree.root, ["verify", "--expected-digest", "0".repeat(64)]).stderr).toMatch(/is missing from the working tree/);
    } finally {
      rmSync(emptyBlob.root, { recursive: true, force: true });
      rmSync(missingWorkingTree.root, { recursive: true, force: true });
    }
  });

  it("rejects a deliberately mutated lockfile fixture after installation", () => {
    const { root, sha } = createLockfileRepository("lockfile: clean\n");
    try {
      const capture = runImmutableLockfile(root, ["capture", "--source-ref", sha]);
      expect(capture.status).toBe(0);
      writeFileSync(resolve(root, "pnpm-lock.yaml"), "lockfile: mutated-after-install\n", "utf8");

      const verify = runImmutableLockfile(root, ["verify", "--expected-digest", capture.stdout.trim()]);
      expect(verify.status).toBe(1);
      expect(verify.stderr).toMatch(/digest differs from the immutable source digest and from the checked-out Git source/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts a clean source checkout after installation", () => {
    const { root, sha } = createLockfileRepository("lockfile: clean\n");
    try {
      const capture = runImmutableLockfile(root, ["capture", "--source-ref", sha]);
      const wrongDigest = runImmutableLockfile(root, ["verify", "--expected-digest", "0".repeat(64)]);
      const verify = runImmutableLockfile(root, ["verify", "--expected-digest", capture.stdout.trim()]);
      expect(capture.status).toBe(0);
      expect(wrongDigest.stderr).toMatch(/digest differs from the immutable source digest/);
      expect(verify.status).toBe(0);
      expect(verify.stdout.trim()).toBe(capture.stdout.trim());
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("prevents local verification from replacing the preinstall digest after a later mutation", () => {
    const root = copyReleaseDigestInputs();
    try {
      const canonicalDigest = readReleaseDigests(root).lockfile;
      writeFileSync(resolve(root, "pnpm-lock.yaml"), "post-guard mutation\n", "utf8");
      const mutatedDigest = readReleaseDigests(root).lockfile;

      expect(() => assertCanonicalLockfileDigest(canonicalDigest, mutatedDigest)).toThrow(/changed after its canonical preinstall dependency identity/);
      expect(() => assertCanonicalLockfileDigest(undefined, mutatedDigest)).toThrow(/--expected-lockfile-digest/);
      expect(() => assertCanonicalLockfileDigest(canonicalDigest.toUpperCase(), mutatedDigest)).toThrow(/--expected-lockfile-digest/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
