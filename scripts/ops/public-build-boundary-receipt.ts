import {
  PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION,
  PRODUCTION_RUNTIME_CONFIGURATION_FILES,
  type ProductionBuildReceipt,
} from "./production-build-receipt";
import { productionBuildId } from "./build-source-identity";

const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const MAX_MARKER_BYTES = 8_192;

export const PUBLIC_BUILD_ARTIFACT_MARKER_SCHEMA_VERSION =
  "forge-public-build-artifact-marker.v2" as const;
export const PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX =
  "FORGE_PUBLIC_BUILD_ARTIFACT_MARKER.v2 " as const;

export type PublicBuildArtifactMarker = Readonly<{
  schemaVersion: typeof PUBLIC_BUILD_ARTIFACT_MARKER_SCHEMA_VERSION;
  productionReceiptSchemaVersion:
    typeof PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION;
  sourceCommit: string | "unknown";
  sourceTree: string | "unknown";
  sourceState: ProductionBuildReceipt["sourceState"];
  buildId: string;
  artifactDigest: string;
  artifactFileCount: number;
  publicAssetDigest: string;
  publicAssetFileCount: number;
  publicDirectoryDigest: string;
  publicDirectoryFileCount: number;
  runtimeCachePolicy: ProductionBuildReceipt["runtimeCachePolicy"];
  runtimeConfigurationDigest: string;
  runtimeConfigurationFileCount: number;
}>;

const MARKER_KEYS = Object.freeze([
  "artifactDigest",
  "artifactFileCount",
  "buildId",
  "productionReceiptSchemaVersion",
  "publicAssetDigest",
  "publicAssetFileCount",
  "publicDirectoryDigest",
  "publicDirectoryFileCount",
  "runtimeCachePolicy",
  "runtimeConfigurationDigest",
  "runtimeConfigurationFileCount",
  "schemaVersion",
  "sourceCommit",
  "sourceState",
  "sourceTree",
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  return (
    keys.length === MARKER_KEYS.length
    && keys.every((key, index) => key === MARKER_KEYS[index])
  );
}

function isSourceIdentity(value: unknown): value is string | "unknown" {
  return value === "unknown" || (
    typeof value === "string"
    && SHA.test(value)
  );
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST.test(value);
}

function isFileCount(value: unknown, allowZero = false): value is number {
  return (
    typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= (allowZero ? 0 : 1)
  );
}

export function isPublicBuildArtifactMarker(
  value: unknown,
): value is PublicBuildArtifactMarker {
  if (!hasExactKeys(value)) return false;
  if (
    value.schemaVersion !== PUBLIC_BUILD_ARTIFACT_MARKER_SCHEMA_VERSION
    || value.productionReceiptSchemaVersion
      !== PRODUCTION_BUILD_RECEIPT_SCHEMA_VERSION
    || !isSourceIdentity(value.sourceCommit)
    || !isSourceIdentity(value.sourceTree)
    || (
      value.sourceState !== "clean"
      && value.sourceState !== "dirty"
      && value.sourceState !== "unverified"
    )
    || typeof value.buildId !== "string"
    || value.buildId.length < 1
    || value.buildId.length > 180
    || /[\r\n]/.test(value.buildId)
    || !isDigest(value.artifactDigest)
    || !isFileCount(value.artifactFileCount)
    || !isDigest(value.publicAssetDigest)
    || !isFileCount(value.publicAssetFileCount)
    || !isDigest(value.publicDirectoryDigest)
    || !isFileCount(value.publicDirectoryFileCount, true)
    || value.runtimeCachePolicy !== "fresh_ephemeral_next_cache_v1"
    || !isDigest(value.runtimeConfigurationDigest)
    || value.runtimeConfigurationFileCount
      !== PRODUCTION_RUNTIME_CONFIGURATION_FILES.length
  ) {
    return false;
  }
  const expectedBuildId = productionBuildId(
    value.sourceCommit === "unknown"
      ? "unverified"
      : value.sourceCommit,
  );
  if (value.buildId !== expectedBuildId) return false;
  return !(
    (value.sourceState === "clean" || value.sourceState === "dirty")
    && (
      value.sourceCommit === "unknown"
      || value.sourceTree === "unknown"
    )
  );
}

function canonicalPublicBuildArtifactMarker(
  marker: PublicBuildArtifactMarker,
): PublicBuildArtifactMarker {
  return {
    schemaVersion: marker.schemaVersion,
    productionReceiptSchemaVersion:
      marker.productionReceiptSchemaVersion,
    sourceCommit: marker.sourceCommit,
    sourceTree: marker.sourceTree,
    sourceState: marker.sourceState,
    buildId: marker.buildId,
    artifactDigest: marker.artifactDigest,
    artifactFileCount: marker.artifactFileCount,
    publicAssetDigest: marker.publicAssetDigest,
    publicAssetFileCount: marker.publicAssetFileCount,
    publicDirectoryDigest: marker.publicDirectoryDigest,
    publicDirectoryFileCount: marker.publicDirectoryFileCount,
    runtimeCachePolicy: marker.runtimeCachePolicy,
    runtimeConfigurationDigest: marker.runtimeConfigurationDigest,
    runtimeConfigurationFileCount: marker.runtimeConfigurationFileCount,
  };
}

export function createPublicBuildArtifactMarker(
  receipt: ProductionBuildReceipt,
  publicAssetFileCount: number,
): PublicBuildArtifactMarker {
  const marker: PublicBuildArtifactMarker = {
    schemaVersion: PUBLIC_BUILD_ARTIFACT_MARKER_SCHEMA_VERSION,
    productionReceiptSchemaVersion: receipt.schemaVersion,
    sourceCommit: receipt.sourceCommit,
    sourceTree: receipt.sourceTree,
    sourceState: receipt.sourceState,
    buildId: receipt.buildId,
    artifactDigest: receipt.artifactDigest,
    artifactFileCount: receipt.artifactFileCount,
    publicAssetDigest: receipt.publicAssetDigest,
    publicAssetFileCount,
    publicDirectoryDigest: receipt.publicDirectoryDigest,
    publicDirectoryFileCount: receipt.publicDirectoryFileCount,
    runtimeCachePolicy: receipt.runtimeCachePolicy,
    runtimeConfigurationDigest: receipt.runtimeConfigurationDigest,
    runtimeConfigurationFileCount: receipt.runtimeConfigurationFileCount,
  };
  if (!isPublicBuildArtifactMarker(marker)) {
    throw new Error(
      "Public build artifact marker rejected an incomplete local production receipt.",
    );
  }
  return Object.freeze(canonicalPublicBuildArtifactMarker(marker));
}

export function publicBuildBoundaryReceiptLine(
  receipt: ProductionBuildReceipt,
  publicAssetFileCount: number,
): string {
  const marker = createPublicBuildArtifactMarker(
    receipt,
    publicAssetFileCount,
  );
  return `${PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX}${JSON.stringify(marker)}\n`;
}

/**
 * Parse only the canonical emitted line. Comparing the serialized object with
 * the source JSON rejects duplicate keys, reordered fields, and alternate
 * encodings that JSON.parse would otherwise normalize.
 */
export function parsePublicBuildArtifactMarkerLine(
  line: unknown,
): PublicBuildArtifactMarker {
  if (
    typeof line !== "string"
    || Buffer.byteLength(line, "utf8") > MAX_MARKER_BYTES
    || line.includes("\r")
    || line.includes("\n")
    || !line.startsWith(PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX)
  ) {
    throw new Error(
      "Public build artifact marker line is absent, malformed, or oversized.",
    );
  }
  const serialized = line.slice(PUBLIC_BUILD_ARTIFACT_MARKER_PREFIX.length);
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("Public build artifact marker is not canonical JSON.");
  }
  if (
    !isPublicBuildArtifactMarker(parsed)
  ) {
    throw new Error(
      "Public build artifact marker does not match its strict versioned schema.",
    );
  }
  const canonical = canonicalPublicBuildArtifactMarker(parsed);
  if (JSON.stringify(canonical) !== serialized) {
    throw new Error(
      "Public build artifact marker does not use its canonical field encoding.",
    );
  }
  return Object.freeze(canonical);
}
