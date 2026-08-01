import { describe, expect, it } from "vitest";

import {
  PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX,
  PUBLIC_BUILD_ARTIFACT_MARKER_SCHEMA_VERSION,
  parsePublicBuildArtifactMarkerLine,
  publicBuildBoundaryReceiptLine,
} from "../../../../scripts/ops/public-build-boundary-receipt";
import {
  PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION,
  type ProductionBuildReceipt,
} from "../../../../scripts/ops/production-build-receipt";
import { productionBuildId } from "../../../../scripts/ops/build-source-identity";

const SOURCE_COMMIT = "0123456789abcdef0123456789abcdef01234567";
const SOURCE_TREE = "89abcdef0123456789abcdef0123456789abcdef";
const RECEIPT: ProductionBuildReceipt = {
  schemaVersion: PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION,
  sourceCommit: SOURCE_COMMIT,
  sourceTree: SOURCE_TREE,
  sourceState: "clean",
  buildId: productionBuildId(SOURCE_COMMIT),
  artifactDigest: `sha256:${"a".repeat(64)}`,
  publicAssetDigest: `sha256:${"b".repeat(64)}`,
  artifactFileCount: 1_472,
  publicDirectoryDigest: `sha256:${"c".repeat(64)}`,
  publicDirectoryFileCount: 5,
  runtimeCachePolicy: "fresh_ephemeral_next_cache_v1",
  runtimeConfigurationDigest: `sha256:${"d".repeat(64)}`,
  runtimeConfigurationFileCount: 4,
};

describe("public build artifact marker", () => {
  it("emits one canonical versioned marker with the complete local receipt identity", () => {
    const line = publicBuildBoundaryReceiptLine(RECEIPT, 71);
    expect(line.endsWith("\n")).toBe(true);
    expect(line.startsWith(PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX)).toBe(true);
    expect(parsePublicBuildArtifactMarkerLine(line.slice(0, -1))).toEqual({
      schemaVersion: PUBLIC_BUILD_ARTIFACT_MARKER_SCHEMA_VERSION,
      productionReceiptSchemaVersion:
        PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION,
      sourceCommit: SOURCE_COMMIT,
      sourceTree: SOURCE_TREE,
      sourceState: "clean",
      buildId: productionBuildId(SOURCE_COMMIT),
      artifactDigest: RECEIPT.artifactDigest,
      artifactFileCount: RECEIPT.artifactFileCount,
      publicAssetDigest: RECEIPT.publicAssetDigest,
      publicAssetFileCount: 71,
      publicDirectoryDigest: RECEIPT.publicDirectoryDigest,
      publicDirectoryFileCount: RECEIPT.publicDirectoryFileCount,
      runtimeCachePolicy: "fresh_ephemeral_next_cache_v1",
      runtimeConfigurationDigest: RECEIPT.runtimeConfigurationDigest,
      runtimeConfigurationFileCount:
        RECEIPT.runtimeConfigurationFileCount,
    });
  });

  it.each([
    ["missing field", (marker: Record<string, unknown>) => {
      const incomplete = { ...marker };
      delete incomplete.artifactDigest;
      return JSON.stringify(incomplete);
    }],
    ["extra field", (marker: Record<string, unknown>) =>
      JSON.stringify({ ...marker, extra: true })],
    ["retired schema", (marker: Record<string, unknown>) =>
      JSON.stringify({ ...marker, schemaVersion: "retired.v1" })],
    ["invalid count", (marker: Record<string, unknown>) =>
      JSON.stringify({ ...marker, publicAssetFileCount: 0 })],
    ["invalid runtime cache policy", (marker: Record<string, unknown>) =>
      JSON.stringify({ ...marker, runtimeCachePolicy: "retired" })],
    ["unbound build ID", (marker: Record<string, unknown>) =>
      JSON.stringify({ ...marker, buildId: productionBuildId("f".repeat(40)) })],
  ])("rejects a marker with a %s", (_label, mutate) => {
    const canonical = publicBuildBoundaryReceiptLine(RECEIPT, 71)
      .slice(PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX.length, -1);
    const marker = JSON.parse(canonical) as Record<string, unknown>;
    expect(() => parsePublicBuildArtifactMarkerLine(
      `${PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX}${mutate(marker)}`,
    )).toThrow();
  });

  it("rejects duplicate JSON fields and the retired unversioned line", () => {
    const canonical = publicBuildBoundaryReceiptLine(RECEIPT, 71)
      .slice(0, -1);
    const duplicated = canonical.replace(
      `"sourceCommit":"${SOURCE_COMMIT}"`,
      `"sourceCommit":"${SOURCE_COMMIT}","sourceCommit":"${SOURCE_COMMIT}"`,
    );
    expect(() => parsePublicBuildArtifactMarkerLine(duplicated)).toThrow();
    expect(() => parsePublicBuildArtifactMarkerLine(
      `Public build boundary verified across 71 static assets; public asset digest ${"b".repeat(64)}.`,
    )).toThrow();
  });
});
