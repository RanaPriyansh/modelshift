import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PRIMARY_SOURCE_WORLD_VERSION } from "../../src/worlds/primary-source-reasoning/content";
import { PRIMARY_SOURCE_RUNTIME_BINDING } from "../../src/forge/world-runtime/primary-source-binding";

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

export function canonicalContentJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function primarySourceRuntimeBindingDigest(
  binding: typeof PRIMARY_SOURCE_RUNTIME_BINDING = PRIMARY_SOURCE_RUNTIME_BINDING,
): string {
  return sha256Reference(canonicalContentJson(binding));
}

export function assertPrimarySourceContentPackageManifest(manifest: unknown): void {
  const candidate = manifest as {
    packages?: Array<{ id?: unknown; version?: unknown; runtime_binding_digest?: unknown }>;
  };
  const primarySource = candidate.packages?.find((entry) => entry.id === "world.primary-source-reasoning");
  if (
    !primarySource
    || primarySource.version !== PRIMARY_SOURCE_WORLD_VERSION
    || primarySource.runtime_binding_digest !== primarySourceRuntimeBindingDigest()
  ) {
    throw new Error("Primary Source content manifest must retain its immutable version and exact runtime-binding digest.");
  }
}

export function readReleaseDigests(root = process.cwd()) {
  const contentManifestPath = resolve(root, "scripts/ops/content-package-manifest.json");
  const contentManifest = readFileSync(contentManifestPath, "utf8");
  assertPrimarySourceContentPackageManifest(JSON.parse(contentManifest));
  return {
    lockfile: digest(resolve(root, "pnpm-lock.yaml")),
    // Packet D's release contract is the SHA-256 of these exact retained file bytes.
    contentManifest: createHash("sha256").update(contentManifest).digest("hex"),
    evaluatorBaseline: digest(resolve(root, "scripts/ops/evaluation-baseline.json")),
    databaseMigration: "not_configured",
  } as const;
}
