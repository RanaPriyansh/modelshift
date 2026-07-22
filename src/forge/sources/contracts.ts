import { z } from "zod";

import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "../events";

/**
 * ADR-007's first implementation is deliberately local and replay-only. It
 * never retrieves a URL, calls a provider, or turns these declarations into a
 * source-authenticity, durable-storage, human-identity, or publication claim.
 */
export const SOURCE_AUTHORITY_SCHEMA_VERSION = "1.0" as const;
export const SOURCE_MAX_SNAPSHOT_BYTES = 256 * 1024;
export const SOURCE_MAX_SNAPSHOT_BASE64_CHARS = 4 * Math.ceil(SOURCE_MAX_SNAPSHOT_BYTES / 3);

export const SOURCE_ACQUISITION_MODES = [
  "checked-in-authored-fixture",
  "principal-supplied-reviewed-snapshot",
] as const;

export const SOURCE_REVIEW_SCOPES = [
  "acquisition-authenticity",
  "rights",
  "factual-epistemic",
  "pedagogy",
  "accessibility",
  "age-safety",
  "proof-design",
] as const;

export const SOURCE_PRODUCT_USES = [
  "internal-review",
  "curriculum-authoring",
  "bounded-learner-display",
  "bounded-excerpt",
] as const;

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "Use semantic versioning such as 1.0.0.");
const timestampSchema = z.string().datetime({ offset: true });
const boundedIdSchema = z.string().min(3).max(160).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
const sourceItemIdSchema = z.string().max(160).regex(/^source\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourcePackageIdSchema = z.string().max(160).regex(/^source-package\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceLocatorIdSchema = z.string().max(160).regex(/^source-locator\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceClaimIdSchema = z.string().max(160).regex(/^source-claim\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceRightsIdSchema = z.string().max(160).regex(/^source-rights\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceReviewIdSchema = z.string().max(160).regex(/^source-review\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourcePolicyIdSchema = z.string().max(160).regex(/^source-policy\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceCanonicalRefSchema = z.string().max(160).regex(/^source-canonical\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceObjectRefSchema = z.string().max(160).regex(/^source-object\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const reviewerIdentityIdSchema = z.string().max(160).regex(/^reviewer\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const authorIdentityIdSchema = z.string().max(160).regex(/^(?:author|reviewer)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sha256Schema = forgeEventDigestSchema;

function uniqueById<T extends z.ZodTypeAny>(item: T, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const candidate = value as { id?: unknown };
      const id = typeof candidate.id === "string" ? candidate.id : JSON.stringify(value);
      if (seen.has(id)) {
        context.addIssue({ code: "custom", path: [index], message: `Duplicate identifier: ${id}` });
      }
      seen.add(id);
    });
  });
}

function uniqueStrings<T extends z.ZodTypeAny>(item: T, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", message: "Values must be unique." });
    }
  });
}

/** No URL is accepted here: this is an opaque, reviewed locator reference, not an acquisition input. */
const snapshotCanonicalLocatorSchema = z.strictObject({
  kind: z.literal("reviewed-canonical-reference"),
  reference: sourceCanonicalRefSchema,
});

export const sourceSnapshotSchema = z.strictObject({
  /** Immutable bytes are only handled as opaque data. This boundary never treats them as instructions. */
  encodedBytes: z.string().min(4).max(SOURCE_MAX_SNAPSHOT_BASE64_CHARS),
  digest: sha256Schema,
  byteLength: z.number().int().min(1).max(SOURCE_MAX_SNAPSHOT_BYTES),
  mediaType: z.string().trim().min(3).max(100).regex(/^[a-z]+\/[a-z0-9.+-]+$/),
  acquisitionMode: z.enum(SOURCE_ACQUISITION_MODES),
  observedAt: timestampSchema,
  canonicalLocator: snapshotCanonicalLocatorSchema,
  objectReference: sourceObjectRefSchema,
  publisherLabel: z.string().trim().min(1).max(240).nullable(),
  versionLabel: z.string().trim().min(1).max(160).nullable(),
});

export type SourceSnapshot = z.infer<typeof sourceSnapshotSchema>;

const sourceSelectorSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("FragmentSelector"),
    value: z.string().min(2).max(300).regex(/^#[A-Za-z0-9._~!$&'()*+,;=:@/?-]+$/),
  }),
  z.strictObject({
    kind: z.literal("TextQuoteSelector"),
    exact: z.string().trim().min(1).max(640),
    prefix: z.string().trim().min(1).max(160).optional(),
    suffix: z.string().trim().min(1).max(160).optional(),
  }),
  z.strictObject({
    kind: z.literal("TextPositionSelector"),
    start: z.number().int().min(0),
    end: z.number().int().positive(),
  }).refine((selector) => selector.end > selector.start, "Text position selector end must exceed start."),
  z.strictObject({
    kind: z.literal("DataPositionSelector"),
    start: z.number().int().min(0),
    end: z.number().int().positive(),
  }).refine((selector) => selector.end > selector.start, "Data position selector end must exceed start."),
  z.strictObject({
    kind: z.literal("SvgSelector"),
    x: z.number().min(0).max(100_000),
    y: z.number().min(0).max(100_000),
    width: z.number().positive().max(100_000),
    height: z.number().positive().max(100_000),
  }),
  z.strictObject({
    kind: z.literal("TimeStateSelector"),
    startMs: z.number().int().min(0),
    endMs: z.number().int().positive().max(86_400_000),
  }).refine((selector) => selector.endMs > selector.startMs, "Time selector end must exceed start."),
  z.strictObject({
    kind: z.literal("AuthoredFixtureFieldSelector"),
    path: z.string().min(2).max(240).regex(/^\$\.[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/),
  }),
]);

export const sourceLocatorSchema = z.strictObject({
  id: sourceLocatorIdSchema,
  sourceItemId: sourceItemIdSchema,
  snapshotDigest: sha256Schema,
  selector: sourceSelectorSchema,
});

export type SourceLocator = z.infer<typeof sourceLocatorSchema>;

export const sourceItemSchema = z.strictObject({
  /** This remains the existing World-manifest source.* identity; no parallel item namespace is introduced. */
  id: sourceItemIdSchema,
  authoredByIdentityId: authorIdentityIdSchema,
  snapshot: sourceSnapshotSchema,
  locators: uniqueById(sourceLocatorSchema, 1, 64),
});

export type SourceItem = z.infer<typeof sourceItemSchema>;

export const sourceClaimSchema = z.strictObject({
  id: sourceClaimIdSchema,
  sourceItemId: sourceItemIdSchema,
  authoredByIdentityId: authorIdentityIdSchema,
  statement: z.string().trim().min(1).max(1_200),
  relation: z.enum(["supports", "contradicts", "open"]),
  locatorIds: uniqueStrings(sourceLocatorIdSchema, 1, 16),
});

export type SourceClaim = z.infer<typeof sourceClaimSchema>;

export const sourceRightsRecordSchema = z.strictObject({
  id: sourceRightsIdSchema,
  sourceItemId: sourceItemIdSchema,
  authoredByIdentityId: authorIdentityIdSchema,
  permittedProductUses: uniqueStrings(z.enum(SOURCE_PRODUCT_USES), 1, SOURCE_PRODUCT_USES.length),
  /** SPDX is optional; product limits remain required because SPDX alone is not enough for FORGE use. */
  spdxExpression: z.string().trim().min(1).max(240).optional(),
  productLimitations: uniqueStrings(z.string().trim().min(1).max(360), 1, 16),
  attribution: z.string().trim().min(1).max(600).nullable(),
  territory: z.string().trim().min(2).max(120).nullable(),
  expiresAt: timestampSchema,
  reviewTrigger: z.string().trim().min(1).max(240),
});

export type SourceRightsRecord = z.infer<typeof sourceRightsRecordSchema>;

export const sourceReviewDecisionSchema = z
  .strictObject({
    id: sourceReviewIdSchema,
    reviewerId: reviewerIdentityIdSchema,
    /** Accepted decisions are syntactically limited to declared human reviewers; this is not identity verification. */
    actorKind: z.enum(["accountable-human", "ai-worker", "deterministic-code"]),
    scope: z.enum(SOURCE_REVIEW_SCOPES),
    outcome: z.enum(["accepted", "rejected", "recommended"]),
    sourceItemIds: uniqueStrings(sourceItemIdSchema, 1, 32),
    rightsRecordIds: uniqueStrings(sourceRightsIdSchema, 0, 32),
    claimIds: uniqueStrings(sourceClaimIdSchema, 0, 64),
    evidenceDigest: sha256Schema,
    decidedAt: timestampSchema,
    expiresAt: timestampSchema,
  })
  .superRefine((decision, context) => {
    if (decision.outcome === "accepted" && decision.actorKind !== "accountable-human") {
      context.addIssue({
        code: "custom",
        path: ["actorKind"],
        message: "An AI worker or deterministic code cannot create an accepted human-review decision.",
      });
    }
  });

export type SourceReviewDecision = z.infer<typeof sourceReviewDecisionSchema>;

const sourcePolicyReferenceSchema = z.strictObject({
  id: sourcePolicyIdSchema,
  version: semverSchema,
});

const provMappingSchema = z.strictObject({
  standard: z.literal("W3C PROV-O"),
  /** An exact dated recommendation/version, never a floating "current" reference. */
  specVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entityRef: boundedIdSchema,
});

const webAnnotationMappingSchema = z.strictObject({
  standard: z.literal("W3C Web Annotation Data Model"),
  specVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  selectorAlignment: z.literal("snapshot-bound"),
});

const spdxMappingSchema = z.strictObject({
  standard: z.literal("SPDX"),
  specVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});

const c2paMappingSchema = z.strictObject({
  standard: z.literal("C2PA"),
  specVersion: z.string().regex(/^\d+\.\d+(?:\.\d+)?$/),
  /** This pure boundary records metadata only; it does not validate a credential. */
  observation: z.literal("recorded-unverified"),
  establishesFactualTruth: z.literal(false),
  establishesRightsClearance: z.literal(false),
  establishesPublicationAuthority: z.literal(false),
});

export const sourceInteroperabilityMappingsSchema = z.strictObject({
  prov: provMappingSchema.optional(),
  webAnnotation: webAnnotationMappingSchema.optional(),
  spdx: spdxMappingSchema.optional(),
  c2pa: c2paMappingSchema.optional(),
});

export type SourceInteroperabilityMappings = z.infer<typeof sourceInteroperabilityMappingsSchema>;

export const sourceAuthorityPackageSchema = z.strictObject({
  schemaVersion: z.literal(SOURCE_AUTHORITY_SCHEMA_VERSION),
  id: sourcePackageIdSchema,
  version: semverSchema,
  policyRef: sourcePolicyReferenceSchema,
  items: uniqueById(sourceItemSchema, 1, 32),
  claims: uniqueById(sourceClaimSchema, 1, 128),
  /** Candidate assembly can be incomplete; replay rejects a candidate without a matching rights record. */
  rightsRecords: uniqueById(sourceRightsRecordSchema, 0, 64),
  reviewDecisions: uniqueById(sourceReviewDecisionSchema, 1, 128),
  interoperability: sourceInteroperabilityMappingsSchema.optional(),
  packageDigest: sha256Schema,
});

export type SourceAuthorityPackage = z.infer<typeof sourceAuthorityPackageSchema>;
export type SourceAuthorityPackageInput = Omit<SourceAuthorityPackage, "packageDigest">;

export const sourceReviewPolicySchema = z.strictObject({
  schemaVersion: z.literal(SOURCE_AUTHORITY_SCHEMA_VERSION),
  id: sourcePolicyIdSchema,
  version: semverSchema,
  requiredScopes: uniqueStrings(z.enum(SOURCE_REVIEW_SCOPES), 1, SOURCE_REVIEW_SCOPES.length),
  authorizedHumanReviewers: uniqueById(z.strictObject({
    id: reviewerIdentityIdSchema,
    scopes: uniqueStrings(z.enum(SOURCE_REVIEW_SCOPES), 1, SOURCE_REVIEW_SCOPES.length),
  }), 1, 64),
});

export type SourceReviewPolicy = z.infer<typeof sourceReviewPolicySchema>;

function byId<T extends { id: string }>(values: readonly T[]): readonly T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

/** Package array ordering is canonicalized before hashing; event order is intentionally not. */
export function canonicalSourceAuthorityPackagePayload(input: SourceAuthorityPackageInput): object {
  return {
    schemaVersion: input.schemaVersion,
    id: input.id,
    version: input.version,
    policyRef: input.policyRef,
    items: byId(input.items).map((item) => ({
      ...item,
      locators: byId(item.locators),
    })),
    claims: byId(input.claims),
    rightsRecords: byId(input.rightsRecords),
    reviewDecisions: byId(input.reviewDecisions),
    interoperability: input.interoperability,
  };
}

export async function sourceAuthorityPackageDigest(input: SourceAuthorityPackageInput): Promise<string> {
  const parsed = sourceAuthorityPackageSchema.omit({ packageDigest: true }).parse(input);
  return sha256Digest(canonicalJson(canonicalSourceAuthorityPackagePayload(parsed)));
}

export async function createSourceAuthorityPackage(input: SourceAuthorityPackageInput): Promise<SourceAuthorityPackage> {
  const parsed = sourceAuthorityPackageSchema.omit({ packageDigest: true }).parse(input);
  return sourceAuthorityPackageSchema.parse({
    ...parsed,
    packageDigest: await sourceAuthorityPackageDigest(parsed),
  });
}

export async function sourceSnapshotBytes(snapshot: SourceSnapshot): Promise<Uint8Array<ArrayBuffer> | null> {
  if (snapshot.encodedBytes.length > SOURCE_MAX_SNAPSHOT_BASE64_CHARS || typeof globalThis.atob !== "function") return null;
  try {
    const binary = globalThis.atob(snapshot.encodedBytes);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    if (bytes.byteLength !== snapshot.byteLength || bytes.byteLength > SOURCE_MAX_SNAPSHOT_BYTES) return null;
    return bytes;
  } catch {
    return null;
  }
}

export async function verifySourceSnapshot(snapshot: SourceSnapshot): Promise<boolean> {
  const bytes = await sourceSnapshotBytes(snapshot);
  const subtle = globalThis.crypto?.subtle;
  if (!bytes || !subtle) return false;
  // Base64 is retained only as immutable source data. The digest operation does not interpret it as text or instructions.
  const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
  const rendered = `sha256:${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  return rendered === snapshot.digest;
}
