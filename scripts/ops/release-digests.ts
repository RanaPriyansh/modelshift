import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PRIMARY_SOURCE_RUNTIME_BINDING } from "../../src/forge/world-runtime/primary-source-binding";
import { BUILT_IN_WORLD_PACKS } from "../../src/forge/worlds";

type RetainedContentEntry = {
  readonly id: string;
  readonly version: string;
  readonly route: string;
  readonly runtime_binding_digest?: string;
  readonly package_integrity_hash?: string;
};

type RetainedBuiltInPack = {
  readonly manifest: {
    readonly id: string;
    readonly version: string;
    readonly route: string;
    readonly availability?: { readonly status: string };
  };
  readonly release: {
    readonly status: string;
  };
  readonly runtime?: unknown;
};

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Reference(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  throw new TypeError("Content package identity accepts JSON values only.");
}

function fail(message: string): never {
  throw new Error(`Retained content manifest rejected: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseManifest(manifest: unknown): readonly RetainedContentEntry[] {
  if (!isRecord(manifest)) fail("root must be an object.");
  const rootKeys = Object.keys(manifest).sort();
  const allowedRootKeys = ["packages", "schema_version"];
  if (rootKeys.length !== allowedRootKeys.length || rootKeys.some((key, index) => key !== allowedRootKeys[index])) {
    fail("root must contain only schema_version and packages.");
  }
  if (manifest.schema_version !== "1.0") fail("schema_version must be the string 1.0.");
  if (!Array.isArray(manifest.packages)) fail("packages must be an array.");

  return manifest.packages.map((entry, index) => {
    if (!isRecord(entry)) fail(`package at index ${index} must be an object.`);
    const keys = Object.keys(entry).sort();
    const allowed = ["id", "package_integrity_hash", "route", "runtime_binding_digest", "version"];
    if (keys.some((key) => !allowed.includes(key))) fail(`package at index ${index} has an unsupported field.`);
    if (typeof entry.id !== "string" || typeof entry.version !== "string" || typeof entry.route !== "string") {
      fail(`package at index ${index} must have string id, version, and route.`);
    }
    if ("runtime_binding_digest" in entry && typeof entry.runtime_binding_digest !== "string") {
      fail(`package ${entry.id} has a non-string runtime binding digest.`);
    }
    if ("package_integrity_hash" in entry && typeof entry.package_integrity_hash !== "string") {
      fail(`package ${entry.id} has a non-string package integrity hash.`);
    }
    return entry as RetainedContentEntry;
  });
}

function assertNoDuplicates(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) fail(`duplicate ${label}.`);
}

function publishedBuiltInPacks(packs: readonly RetainedBuiltInPack[]): readonly RetainedBuiltInPack[] {
  return packs.filter(
    (pack) => pack.release.status === "released" && pack.manifest.availability?.status === "available",
  );
}

export function canonicalContentJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function runtimeBindingDigest(binding: unknown): string {
  return sha256Reference(canonicalContentJson(binding));
}

export function packageIntegrityHash(pack: unknown): string {
  return sha256Reference(canonicalContentJson(pack));
}

/** Compatibility export retained for existing release callers. */
export function primarySourceRuntimeBindingDigest(
  binding: typeof PRIMARY_SOURCE_RUNTIME_BINDING = PRIMARY_SOURCE_RUNTIME_BINDING,
): string {
  return runtimeBindingDigest(binding);
}

export function assertRetainedContentPackageManifest(
  manifest: unknown,
  packs: readonly RetainedBuiltInPack[] = BUILT_IN_WORLD_PACKS,
): void {
  const entries = parseManifest(manifest);
  const expected = publishedBuiltInPacks(packs);
  const expectedIds = expected.map((pack) => pack.manifest.id);
  const expectedRoutes = expected.map((pack) => pack.manifest.route);
  const actualIds = entries.map((entry) => entry.id);
  const actualRoutes = entries.map((entry) => entry.route);

  assertNoDuplicates(expectedIds, "built-in published package ID");
  assertNoDuplicates(expectedRoutes, "built-in published package route");
  assertNoDuplicates(actualIds, "manifest package ID");
  assertNoDuplicates(actualRoutes, "manifest package route");

  if (entries.length !== expected.length) fail("package count differs from the built-in published package set.");
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

  for (const pack of expected) {
    const entry = entriesById.get(pack.manifest.id);
    if (!entry) fail(`missing built-in published package ${pack.manifest.id}.`);
    if (entry.version !== pack.manifest.version) fail(`stale version for ${pack.manifest.id}.`);
    if (entry.route !== pack.manifest.route) fail(`stale route for ${pack.manifest.id}.`);

    if (pack.runtime === undefined) {
      if ("runtime_binding_digest" in entry || "package_integrity_hash" in entry) fail(`legacy package ${pack.manifest.id} must not declare runtime or package identity digests.`);
      continue;
    }

    if (entry.runtime_binding_digest !== runtimeBindingDigest(pack.runtime)) {
      fail(`stale runtime binding digest for ${pack.manifest.id}.`);
    }
    if (entry.package_integrity_hash !== packageIntegrityHash(pack)) {
      fail(`stale package integrity hash for ${pack.manifest.id}.`);
    }
  }

  for (const entry of entries) {
    if (!expectedIds.includes(entry.id)) fail(`unexpected package ${entry.id}.`);
    if (!expectedRoutes.includes(entry.route)) fail(`unexpected route ${entry.route}.`);
  }
}

/** Compatibility export retained for existing release callers. */
export function assertPrimarySourceContentPackageManifest(manifest: unknown): void {
  assertRetainedContentPackageManifest(manifest);
}

export function readReleaseDigests(root = process.cwd()) {
  const contentManifestPath = resolve(root, "scripts/ops/content-package-manifest.json");
  const contentManifest = readFileSync(contentManifestPath, "utf8");
  assertRetainedContentPackageManifest(JSON.parse(contentManifest));
  return {
    lockfile: digest(resolve(root, "pnpm-lock.yaml")),
    // Packet D's release contract is the SHA-256 of these exact retained file bytes.
    contentManifest: createHash("sha256").update(contentManifest).digest("hex"),
    evaluatorBaseline: digest(resolve(root, "scripts/ops/evaluation-baseline.json")),
    databaseMigration: "not_configured",
  } as const;
}
