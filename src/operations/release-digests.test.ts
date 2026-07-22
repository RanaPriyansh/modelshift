import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { PRIMARY_SOURCE_RUNTIME_BINDING } from "../forge/world-runtime/primary-source-binding";
import { BUILT_IN_WORLD_PACKS } from "../forge/worlds";
import {
  assertPrimarySourceContentPackageManifest,
  assertRetainedContentPackageManifest,
  primarySourceRuntimeBindingDigest,
  readReleaseDigests,
  runtimeBindingDigest,
} from "../../scripts/ops/release-digests";

type Manifest = {
  schema_version: string;
  packages: Array<{
    id: string;
    version: string;
    route: string;
    runtime_binding_digest?: string;
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

describe("retained content package identity", () => {
  it("matches every released built-in package and assigns digests only to runtime-bound packs", () => {
    const retained = manifest();
    assertRetainedContentPackageManifest(retained);
    assertPrimarySourceContentPackageManifest(retained);

    const byId = <Entry extends { id: string }>(left: Entry, right: Entry) => left.id.localeCompare(right.id);
    expect(retained.packages.map(({ id, version, route, runtime_binding_digest }) => ({ id, version, route, runtime_binding_digest })).sort(byId)).toEqual(
      BUILT_IN_WORLD_PACKS
        .filter((pack) => pack.release.status === "released")
        .map((pack) => ({
          id: pack.manifest.id,
          version: pack.manifest.version,
          route: pack.manifest.route,
          runtime_binding_digest: "runtime" in pack ? runtimeBindingDigest(pack.runtime) : undefined,
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
