import { z } from "zod";

import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "../events";
import {
  SOURCE_PRODUCT_USES,
  SOURCE_AUTHORITY_SCHEMA_VERSION,
  canonicalCodeUnitCompare,
  sourceAuthorityPackageDigest,
  sourceAuthorityPackageSchema,
  sourceReviewPolicyDigest,
  sourceReviewPolicySchema,
  sourceSnapshotBytes,
  verifySourceSnapshot,
  type SourceAuthorityPackage,
  type SourceReviewPolicy,
} from "./contracts";

const sourceEventIdSchema = z.string().max(160).regex(/^source-event\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceCorrectionIdSchema = z.string().max(160).regex(/^source-correction\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceExpiryIdSchema = z.string().max(160).regex(/^source-expiry\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceWithdrawalIdSchema = z.string().max(160).regex(/^source-withdrawal\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceItemIdSchema = z.string().max(160).regex(/^source\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceClaimIdSchema = z.string().max(160).regex(/^source-claim\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceRightsIdSchema = z.string().max(160).regex(/^source-rights\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const reviewCandidateIdSchema = z.string().max(160).regex(/^review-candidate\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const timestampSchema = z.string().datetime({ offset: true });
const genesisDigestSchema = z.literal("genesis");

function uniqueStrings<T extends z.ZodTypeAny>(item: T, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", message: "Values must be unique." });
    }
  });
}

const sourceAuthorityEventBase = {
  sequence: z.number().int().positive(),
  id: sourceEventIdSchema,
  occurredAt: timestampSchema,
  priorEventDigest: z.union([genesisDigestSchema, forgeEventDigestSchema]),
  eventDigest: forgeEventDigestSchema,
};

export const sourceAuthorityReplayEventSchema = z.discriminatedUnion("type", [
  z.strictObject({
    ...sourceAuthorityEventBase,
    type: z.literal("package-recorded"),
    packageId: z.string().max(160).regex(/^source-package\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    packageVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    packageDigest: forgeEventDigestSchema,
  }),
  z.strictObject({
    ...sourceAuthorityEventBase,
    type: z.literal("correction-recorded"),
    correctionId: sourceCorrectionIdSchema,
    sourceItemId: sourceItemIdSchema,
    affectedSnapshotDigest: forgeEventDigestSchema,
    affectedClaimIds: uniqueStrings(sourceClaimIdSchema, 1, 64),
    /** A correction can name a later snapshot, but cannot rewrite its affected snapshot in place. */
    replacementSnapshotDigest: forgeEventDigestSchema.nullable(),
  }),
  z.strictObject({
    ...sourceAuthorityEventBase,
    type: z.literal("withdrawal-recorded"),
    withdrawalId: sourceWithdrawalIdSchema,
    sourceItemId: sourceItemIdSchema,
    snapshotDigest: forgeEventDigestSchema,
    reasonCode: z.enum(["rights", "factual", "safety", "accessibility", "other"]),
  }),
  z.strictObject({
    ...sourceAuthorityEventBase,
    type: z.literal("rights-expiry-recorded"),
    expiryId: sourceExpiryIdSchema,
    sourceItemId: sourceItemIdSchema,
    rightsRecordId: sourceRightsIdSchema,
    expiresAt: timestampSchema,
  }),
]);

export type SourceAuthorityReplayEvent = z.infer<typeof sourceAuthorityReplayEventSchema>;
type DistributiveOmit<T, Key extends PropertyKey> = T extends unknown ? Omit<T, Key> : never;
export type SourceAuthorityReplayEventInput = DistributiveOmit<SourceAuthorityReplayEvent, "eventDigest">;
export type SourceAuthorityReplayEventDraft = DistributiveOmit<SourceAuthorityReplayEvent, "eventDigest" | "sequence" | "priorEventDigest">;

export const sourceAuthorityReplaySchema = z.strictObject({
  schemaVersion: z.literal(SOURCE_AUTHORITY_SCHEMA_VERSION),
  package: sourceAuthorityPackageSchema,
  events: z.array(sourceAuthorityReplayEventSchema).min(1).max(128),
  headDigest: forgeEventDigestSchema,
});

export type SourceAuthorityReplay = z.infer<typeof sourceAuthorityReplaySchema>;

export const sourceDependentCandidateSchema = z.strictObject({
  /** Deliberately a review-candidate ID, not a World release or publication mutation. */
  id: reviewCandidateIdSchema,
  sourceBindings: z.array(z.strictObject({
    sourcePackageId: z.string().max(160).regex(/^source-package\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    sourcePackageVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    sourcePackageDigest: forgeEventDigestSchema,
    sourceItemId: sourceItemIdSchema,
    claimIds: uniqueStrings(sourceClaimIdSchema, 1, 32),
    rightsRecordId: sourceRightsIdSchema,
    requiredProductUses: uniqueStrings(z.enum(SOURCE_PRODUCT_USES), 1, SOURCE_PRODUCT_USES.length),
  })).min(1).max(32),
});

export type SourceDependentCandidate = z.infer<typeof sourceDependentCandidateSchema>;

export const SOURCE_AUTHORITY_ISSUE_CODES = [
  "schema.invalid",
  "policy.invalid",
  "policy.digest-mismatch",
  "policy.mismatch",
  "package.digest-mismatch",
  "snapshot.invalid-bytes",
  "snapshot.digest-mismatch",
  "snapshot.observed-after-as-of",
  "locator.snapshot-mismatch",
  "locator.outside-snapshot",
  "locator.text-not-found",
  "locator.text-ambiguous",
  "locator.locally-unverifiable",
  "claim.source-missing",
  "claim.locator-missing",
  "claim.locator-source-mismatch",
  "rights.missing",
  "rights.source-mismatch",
  "rights.expired",
  "review.scope-impersonation",
  "review.self-review",
  "review.expired",
  "review.decided-after-as-of",
  "review.invalid-validity-window",
  "review.snapshot-after-decision",
  "review.target-missing",
  "review.artifact-binding-missing",
  "review.incomplete",
  "event.sequence-invalid",
  "event.chain-mismatch",
  "event.digest-mismatch",
  "event.head-mismatch",
  "event.package-binding-invalid",
  "event.correction-rewrite",
  "event.rights-expiry-invalid",
  "event.occurred-after-as-of",
  "event.snapshot-after-event",
  "event.duplicate-id",
  "event.duplicate-lifecycle-id",
  "event.target-missing",
  "candidate.binding-invalid",
  "candidate.duplicate-id",
] as const;

export type SourceAuthorityIssueCode = (typeof SOURCE_AUTHORITY_ISSUE_CODES)[number];

export interface SourceAuthorityIssue {
  readonly code: SourceAuthorityIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface SourceAuthorityReplayResult {
  readonly status: "review-candidate-complete" | "review-candidate-incomplete";
  /** The source boundary only reports candidates; it never publishes or disables a World. */
  readonly publicationAuthority: "not-established";
  readonly sourceAuthenticity: "not-established";
  readonly durableStorage: "not-established";
  readonly accountableHumanApproval: "not-established";
  readonly rightsClearance: "not-established";
  readonly invalidatedCandidates: readonly {
    readonly candidateId: string;
    readonly reasons: readonly string[];
  }[];
  readonly issues: readonly SourceAuthorityIssue[];
}

function parseReplayEventInput(input: SourceAuthorityReplayEventInput): SourceAuthorityReplayEventInput {
  const parsed = sourceAuthorityReplayEventSchema.parse({
    ...input,
    eventDigest: `sha256:${"0".repeat(64)}`,
  });
  const { eventDigest, ...unsigned } = parsed;
  void eventDigest;
  if (unsigned.type === "correction-recorded") {
    return { ...unsigned, affectedClaimIds: [...unsigned.affectedClaimIds].sort(canonicalCodeUnitCompare) };
  }
  return unsigned;
}

export async function sourceAuthorityReplayEventDigest(input: SourceAuthorityReplayEventInput): Promise<string> {
  return sha256Digest(canonicalJson(parseReplayEventInput(input)));
}

export async function createSourceAuthorityReplayEvent(input: SourceAuthorityReplayEventInput): Promise<SourceAuthorityReplayEvent> {
  const parsed = parseReplayEventInput(input);
  return sourceAuthorityReplayEventSchema.parse({
    ...parsed,
    eventDigest: await sourceAuthorityReplayEventDigest(parsed),
  });
}

export async function createSourceAuthorityReplay(input: {
  readonly package: SourceAuthorityPackage;
  readonly events: readonly SourceAuthorityReplayEventDraft[];
}): Promise<SourceAuthorityReplay> {
  const events: SourceAuthorityReplayEvent[] = [];
  let priorEventDigest = "genesis";
  for (let index = 0; index < input.events.length; index += 1) {
    const event = input.events[index]!;
    events.push(await createSourceAuthorityReplayEvent({
      ...event,
      sequence: index + 1,
      priorEventDigest,
    }));
    priorEventDigest = events.at(-1)!.eventDigest;
  }
  if (events.length === 0) throw new Error("A source-authority replay needs a package-recorded event.");
  return sourceAuthorityReplaySchema.parse({
    schemaVersion: SOURCE_AUTHORITY_SCHEMA_VERSION,
    package: input.package,
    events,
    headDigest: events.at(-1)!.eventDigest,
  });
}

function issue(issues: SourceAuthorityIssue[], code: SourceAuthorityIssueCode, path: string, message: string): void {
  issues.push({ code, path, message });
}

function asOfDate(value: string): Date | null {
  const parsed = timestampSchema.safeParse(value);
  if (!parsed.success) return null;
  const date = new Date(parsed.data);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function hasExpired(value: string, asOf: Date): boolean {
  return new Date(value).valueOf() <= asOf.valueOf();
}

function occursAfter(left: string, right: Date | string): boolean {
  return new Date(left).valueOf() > (typeof right === "string" ? new Date(right).valueOf() : right.valueOf());
}

function structuralIssues(candidate: unknown, schema: z.ZodTypeAny, code: "schema.invalid" | "policy.invalid"): SourceAuthorityIssue[] {
  const parsed = schema.safeParse(candidate);
  if (parsed.success) return [];
  return parsed.error.issues.map((entry) => ({
    code,
    path: entry.path.join("."),
    message: entry.message,
  }));
}

async function validatePackageRelations(
  sourcePackage: SourceAuthorityPackage,
  policy: SourceReviewPolicy,
  asOf: Date,
  issues: SourceAuthorityIssue[],
  evaluateReviewScopes: boolean,
): Promise<void> {
  const itemById = new Map(sourcePackage.items.map((item) => [item.id, item]));
  const locatorById = new Map(sourcePackage.items.flatMap((item) => item.locators.map((locator) => [locator.id, locator] as const)));
  const claimById = new Map(sourcePackage.claims.map((claim) => [claim.id, claim]));
  const rightsById = new Map(sourcePackage.rightsRecords.map((record) => [record.id, record]));
  const reviewerById = new Map(policy.authorizedHumanReviewers.map((reviewer) => [reviewer.id, reviewer]));

  for (const item of sourcePackage.items) {
    const bytes = await sourceSnapshotBytes(item.snapshot);
    let decodedText: string | null = null;
    if (occursAfter(item.snapshot.observedAt, asOf)) {
      issue(issues, "snapshot.observed-after-as-of", `items.${item.id}.snapshot.observedAt`, "A snapshot observed after replay time cannot support this candidate.");
    }
    if (!bytes) {
      issue(issues, "snapshot.invalid-bytes", `items.${item.id}.snapshot`, "Snapshot bytes are malformed, unavailable, or oversized.");
    } else if (!await verifySourceSnapshot(item.snapshot)) {
      issue(issues, "snapshot.digest-mismatch", `items.${item.id}.snapshot.digest`, "Snapshot digest does not match immutable bytes.");
    } else {
      try {
        decodedText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        // Binary snapshots remain valid source data, but text selectors cannot be verified against them.
      }
    }

    for (const locator of item.locators) {
      if (locator.sourceItemId !== item.id || locator.snapshotDigest !== item.snapshot.digest) {
        issue(issues, "locator.snapshot-mismatch", `locators.${locator.id}`, "Locator must target its containing item and exact snapshot digest.");
      }
      switch (locator.selector.kind) {
        case "DataPositionSelector":
          if (locator.selector.end > item.snapshot.byteLength) {
            issue(issues, "locator.outside-snapshot", `locators.${locator.id}.selector.end`, "Data position must remain within immutable snapshot bytes.");
          }
          break;
        case "TextPositionSelector":
          if (decodedText === null) {
            issue(issues, "locator.locally-unverifiable", `locators.${locator.id}`, "Text positions require a valid UTF-8 snapshot.");
          } else if (locator.selector.end > Array.from(decodedText).length) {
            issue(issues, "locator.outside-snapshot", `locators.${locator.id}.selector.end`, "Text position must remain within decoded snapshot Unicode code points.");
          }
          break;
        case "TextQuoteSelector": {
          if (decodedText === null) {
            issue(issues, "locator.locally-unverifiable", `locators.${locator.id}`, "Text quotes require a valid UTF-8 snapshot.");
            break;
          }
          const quoteOffsets: number[] = [];
          for (let searchFrom = 0; searchFrom <= decodedText.length - locator.selector.exact.length;) {
            const candidateOffset = decodedText.indexOf(locator.selector.exact, searchFrom);
            if (candidateOffset === -1) break;
            const prefixMatches = !locator.selector.prefix ||
              decodedText.slice(Math.max(0, candidateOffset - locator.selector.prefix.length), candidateOffset) === locator.selector.prefix;
            const suffixOffset = candidateOffset + locator.selector.exact.length;
            const suffixMatches = !locator.selector.suffix ||
              decodedText.slice(suffixOffset, suffixOffset + locator.selector.suffix.length) === locator.selector.suffix;
            if (prefixMatches && suffixMatches) quoteOffsets.push(candidateOffset);
            // Advance one code unit so overlapping text quotes are also checked.
            searchFrom = candidateOffset + 1;
          }
          if (quoteOffsets.length === 0) {
            issue(issues, "locator.text-not-found", `locators.${locator.id}.selector.exact`, "Text quote must occur in the immutable snapshot.");
            break;
          }
          if (quoteOffsets.length > 1) {
            issue(issues, "locator.text-ambiguous", `locators.${locator.id}.selector`, "Text quote context must resolve to exactly one immutable snapshot occurrence.");
          }
          break;
        }
        case "AuthoredFixtureFieldSelector": {
          if (decodedText === null || item.snapshot.mediaType !== "application/json") {
            issue(issues, "locator.locally-unverifiable", `locators.${locator.id}`, "Authored fixture field selectors require an exact JSON snapshot.");
            break;
          }
          try {
            const document: unknown = JSON.parse(decodedText);
            const path = locator.selector.path.slice(2).split(".");
            let target: unknown = document;
            for (const segment of path) {
              if (!target || typeof target !== "object" || !Object.hasOwn(target, segment)) throw new Error("missing fixture field");
              target = (target as Record<string, unknown>)[segment];
            }
          } catch {
            issue(issues, "locator.outside-snapshot", `locators.${locator.id}.selector.path`, "Authored fixture field must exist in the immutable JSON snapshot.");
          }
          break;
        }
        case "FragmentSelector":
        case "SvgSelector":
        case "TimeStateSelector":
          issue(issues, "locator.locally-unverifiable", `locators.${locator.id}`, `${locator.selector.kind} requires reviewed media-specific verification unavailable in this pure replay slice.`);
          break;
      }
    }
  }

  for (const claim of sourcePackage.claims) {
    if (!itemById.has(claim.sourceItemId)) {
      issue(issues, "claim.source-missing", `claims.${claim.id}.sourceItemId`, "Claim references an unknown source item.");
    }
    for (const locatorId of claim.locatorIds) {
      const locator = locatorById.get(locatorId);
      if (!locator) {
        issue(issues, "claim.locator-missing", `claims.${claim.id}.locatorIds`, "Claim references an unknown locator.");
      } else if (locator.sourceItemId !== claim.sourceItemId) {
        issue(issues, "claim.locator-source-mismatch", `claims.${claim.id}.locatorIds`, "Claim locators must belong to the claim source item.");
      }
    }
  }

  for (const item of sourcePackage.items) {
    const matchingRights = sourcePackage.rightsRecords.filter((record) => record.sourceItemId === item.id);
    if (matchingRights.length === 0) {
      issue(issues, "rights.missing", `items.${item.id}`, "Every source item requires one or more explicit rights records.");
    }
  }
  for (const record of sourcePackage.rightsRecords) {
    if (!itemById.has(record.sourceItemId)) {
      issue(issues, "rights.source-mismatch", `rightsRecords.${record.id}.sourceItemId`, "Rights record references an unknown source item.");
    }
    if (hasExpired(record.expiresAt, asOf)) {
      issue(issues, "rights.expired", `rightsRecords.${record.id}.expiresAt`, "Expired rights cannot be used by a review candidate.");
    }
  }

  // A policy whose content/digest is not exactly bound to the package cannot
  // authorize any scope or reviewer evaluation.
  if (!evaluateReviewScopes) return;

  const acceptedScopesByItem = new Set<string>();
  for (const decision of sourcePackage.reviewDecisions) {
    const reviewer = reviewerById.get(decision.reviewerId);
    let canSatisfyScope = decision.outcome === "accepted";
    if (occursAfter(decision.decidedAt, asOf)) {
      issue(issues, "review.decided-after-as-of", `reviewDecisions.${decision.id}.decidedAt`, "Future review decisions cannot satisfy a historical replay.");
      canSatisfyScope = false;
    }
    if (new Date(decision.expiresAt).valueOf() <= new Date(decision.decidedAt).valueOf()) {
      issue(issues, "review.invalid-validity-window", `reviewDecisions.${decision.id}.expiresAt`, "Review expiry must occur strictly after its decision time.");
      canSatisfyScope = false;
    }
    if (!reviewer || !reviewer.scopes.includes(decision.scope)) {
      issue(issues, "review.scope-impersonation", `reviewDecisions.${decision.id}`, "Reviewer is not authorized for this scoped decision.");
      canSatisfyScope = false;
    }
    if (hasExpired(decision.expiresAt, asOf)) {
      issue(issues, "review.expired", `reviewDecisions.${decision.id}.expiresAt`, "Expired review decisions cannot complete a candidate.");
      canSatisfyScope = false;
    }

    for (const sourceItemId of decision.sourceItemIds) {
      const item = itemById.get(sourceItemId);
      if (!item) {
        issue(issues, "review.target-missing", `reviewDecisions.${decision.id}.sourceItemIds`, "Review decision references an unknown source item.");
        canSatisfyScope = false;
      } else if (item.authoredByIdentityId === decision.reviewerId) {
        issue(issues, "review.self-review", `reviewDecisions.${decision.id}`, "A reviewer cannot accept their own authored source item.");
        canSatisfyScope = false;
      }
      if (item && occursAfter(item.snapshot.observedAt, decision.decidedAt)) {
        issue(issues, "review.snapshot-after-decision", `reviewDecisions.${decision.id}.sourceItemIds`, "A decision cannot review a snapshot observed after the decision time.");
        canSatisfyScope = false;
      }
    }
    for (const rightsRecordId of decision.rightsRecordIds) {
      const record = rightsById.get(rightsRecordId);
      if (!record) {
        issue(issues, "review.target-missing", `reviewDecisions.${decision.id}.rightsRecordIds`, "Review decision references an unknown rights record.");
        canSatisfyScope = false;
      } else if (!decision.sourceItemIds.includes(record.sourceItemId)) {
        issue(issues, "review.artifact-binding-missing", `reviewDecisions.${decision.id}.rightsRecordIds`, "Reviewed rights records must belong to a source item named by this decision.");
        canSatisfyScope = false;
      } else if (record.authoredByIdentityId === decision.reviewerId) {
        issue(issues, "review.self-review", `reviewDecisions.${decision.id}`, "A reviewer cannot accept their own authored rights record.");
        canSatisfyScope = false;
      }
    }
    for (const claimId of decision.claimIds) {
      const claim = claimById.get(claimId);
      if (!claim) {
        issue(issues, "review.target-missing", `reviewDecisions.${decision.id}.claimIds`, "Review decision references an unknown claim.");
        canSatisfyScope = false;
      } else if (!decision.sourceItemIds.includes(claim.sourceItemId)) {
        issue(issues, "review.artifact-binding-missing", `reviewDecisions.${decision.id}.claimIds`, "Reviewed claims must belong to a source item named by this decision.");
        canSatisfyScope = false;
      } else if (claim.authoredByIdentityId === decision.reviewerId) {
        issue(issues, "review.self-review", `reviewDecisions.${decision.id}`, "A reviewer cannot accept their own authored claim.");
        canSatisfyScope = false;
      }
    }
    for (const sourceItemId of decision.sourceItemIds) {
      if (decision.scope === "rights") {
        const requiredRightsIds = sourcePackage.rightsRecords
          .filter((record) => record.sourceItemId === sourceItemId)
          .map((record) => record.id);
        if (requiredRightsIds.some((rightsRecordId) => !decision.rightsRecordIds.includes(rightsRecordId))) {
          issue(issues, "review.artifact-binding-missing", `reviewDecisions.${decision.id}.rightsRecordIds`, "Accepted rights review must bind every rights record for its reviewed source item.");
          canSatisfyScope = false;
        }
      }
      if (decision.scope === "factual-epistemic") {
        const requiredClaimIds = sourcePackage.claims
          .filter((claim) => claim.sourceItemId === sourceItemId)
          .map((claim) => claim.id);
        if (requiredClaimIds.some((claimId) => !decision.claimIds.includes(claimId))) {
          issue(issues, "review.artifact-binding-missing", `reviewDecisions.${decision.id}.claimIds`, "Accepted factual review must bind every claim for its reviewed source item.");
          canSatisfyScope = false;
        }
      }
    }
    if (canSatisfyScope) {
      for (const sourceItemId of decision.sourceItemIds) acceptedScopesByItem.add(`${sourceItemId}:${decision.scope}`);
    }
  }

  for (const item of sourcePackage.items) {
    for (const scope of policy.requiredScopes) {
      if (!acceptedScopesByItem.has(`${item.id}:${scope}`)) {
        issue(issues, "review.incomplete", `items.${item.id}`, `Missing a current accepted ${scope} decision for this review candidate.`);
      }
    }
  }
}

async function validateReplayEvents(replay: SourceAuthorityReplay, asOf: Date, issues: SourceAuthorityIssue[]): Promise<void> {
  let priorEventDigest = "genesis";
  const itemById = new Map(replay.package.items.map((item) => [item.id, item]));
  const claimById = new Map(replay.package.claims.map((claim) => [claim.id, claim]));
  const eventIds = new Set<string>();
  const lifecycleFactIds = new Set<string>();

  for (let index = 0; index < replay.events.length; index += 1) {
    const event = replay.events[index]!;
    if (eventIds.has(event.id)) {
      issue(issues, "event.duplicate-id", `events.${index}.id`, "Replay event IDs must be unique; retries are not defined by this contract.");
    }
    eventIds.add(event.id);
    const lifecycleFactId = event.type === "correction-recorded" ? event.correctionId
      : event.type === "withdrawal-recorded" ? event.withdrawalId
        : event.type === "rights-expiry-recorded" ? event.expiryId
          : null;
    if (lifecycleFactId) {
      if (lifecycleFactIds.has(lifecycleFactId)) {
        issue(issues, "event.duplicate-lifecycle-id", `events.${index}`, "Correction, withdrawal, and expiry fact IDs must be unique.");
      }
      lifecycleFactIds.add(lifecycleFactId);
    }
    if (occursAfter(event.occurredAt, asOf)) {
      issue(issues, "event.occurred-after-as-of", `events.${index}.occurredAt`, "Future lifecycle facts cannot be silently applied to a historical replay.");
    }
    if (event.sequence !== index + 1) {
      issue(issues, "event.sequence-invalid", `events.${index}.sequence`, "Replay sequences must be contiguous and begin at one.");
    }
    if (event.priorEventDigest !== priorEventDigest) {
      issue(issues, "event.chain-mismatch", `events.${index}.priorEventDigest`, "Replay event does not continue the prior immutable event digest.");
    }
    if (event.eventDigest !== await sourceAuthorityReplayEventDigest(event)) {
      issue(issues, "event.digest-mismatch", `events.${index}.eventDigest`, "Replay event digest does not match its canonical contents.");
    }
    if (index === 0) {
      if (event.type !== "package-recorded" || event.packageId !== replay.package.id || event.packageVersion !== replay.package.version || event.packageDigest !== replay.package.packageDigest) {
        issue(issues, "event.package-binding-invalid", `events.${index}`, "First replay event must bind the exact source package identity, version, and digest.");
      }
      for (const item of replay.package.items) {
        if (occursAfter(item.snapshot.observedAt, event.occurredAt)) {
          issue(issues, "event.snapshot-after-event", `events.${index}`, "Package recording cannot use a snapshot observed after the event time.");
        }
      }
    } else if (event.type === "package-recorded") {
      issue(issues, "event.package-binding-invalid", `events.${index}`, "A source replay records its immutable package exactly once at sequence one.");
    }

    if (event.type === "correction-recorded") {
      const sourceItem = itemById.get(event.sourceItemId);
      if (!sourceItem || sourceItem.snapshot.digest !== event.affectedSnapshotDigest) {
        issue(issues, "event.target-missing", `events.${index}`, "Correction must target an exact snapshot in this immutable package.");
      }
      if (event.replacementSnapshotDigest === event.affectedSnapshotDigest) {
        issue(issues, "event.correction-rewrite", `events.${index}.replacementSnapshotDigest`, "A correction cannot rewrite an existing snapshot in place.");
      }
      if (sourceItem && occursAfter(sourceItem.snapshot.observedAt, event.occurredAt)) {
        issue(issues, "event.snapshot-after-event", `events.${index}`, "Correction cannot use a snapshot observed after the correction event.");
      }
      for (const claimId of event.affectedClaimIds) {
        const claim = claimById.get(claimId);
        if (!claim || claim.sourceItemId !== event.sourceItemId) {
          issue(issues, "event.target-missing", `events.${index}.affectedClaimIds`, "Correction claims must belong to its source item.");
        }
      }
    }
    if (event.type === "withdrawal-recorded") {
      const sourceItem = itemById.get(event.sourceItemId);
      if (!sourceItem || sourceItem.snapshot.digest !== event.snapshotDigest) {
        issue(issues, "event.target-missing", `events.${index}`, "Withdrawal must target an exact snapshot in this immutable package.");
      }
      if (sourceItem && occursAfter(sourceItem.snapshot.observedAt, event.occurredAt)) {
        issue(issues, "event.snapshot-after-event", `events.${index}`, "Withdrawal cannot use a snapshot observed after the withdrawal event.");
      }
    }
    if (event.type === "rights-expiry-recorded") {
      const sourceItem = itemById.get(event.sourceItemId);
      const rights = replay.package.rightsRecords.find((record) => record.id === event.rightsRecordId);
      if (!sourceItem || !rights || rights.sourceItemId !== event.sourceItemId || rights.expiresAt !== event.expiresAt ||
        new Date(event.occurredAt).valueOf() < new Date(event.expiresAt).valueOf()) {
        issue(issues, "event.rights-expiry-invalid", `events.${index}`, "Expiry facts must append the exact matured rights record without changing it.");
      }
      if (sourceItem && occursAfter(sourceItem.snapshot.observedAt, event.occurredAt)) {
        issue(issues, "event.snapshot-after-event", `events.${index}`, "Rights expiry cannot use a snapshot observed after the expiry event.");
      }
    }
    priorEventDigest = event.eventDigest;
  }
  if (replay.headDigest !== priorEventDigest) {
    issue(issues, "event.head-mismatch", "headDigest", "Replay head digest rejects shortened or reordered event histories.");
  }
}

interface CollectedDependentCandidates {
  readonly candidates: readonly SourceDependentCandidate[];
  readonly candidateIds: readonly string[];
  readonly invalidCandidateIds: ReadonlySet<string>;
}

function dependentCandidateId(candidate: unknown, index: number): string {
  if (candidate && typeof candidate === "object" && "id" in candidate && reviewCandidateIdSchema.safeParse(candidate.id).success) {
    return candidate.id as string;
  }
  return `malformed-dependent.${index}`;
}

function collectDependentCandidates(values: readonly unknown[], issues: SourceAuthorityIssue[]): CollectedDependentCandidates {
  const candidates: SourceDependentCandidate[] = [];
  const candidateIds: string[] = [];
  const seenCandidateIds = new Set<string>();
  const invalidCandidateIds = new Set<string>();
  values.forEach((candidate, index) => {
    const candidateId = dependentCandidateId(candidate, index);
    if (seenCandidateIds.has(candidateId)) {
      issue(issues, "candidate.duplicate-id", `dependentCandidates.${index}.id`, "Dependent candidate IDs must be unique.");
      invalidCandidateIds.add(candidateId);
    } else {
      seenCandidateIds.add(candidateId);
      candidateIds.push(candidateId);
    }
    const parsed = sourceDependentCandidateSchema.safeParse(candidate);
    if (parsed.success) {
      candidates.push(parsed.data);
      return;
    }
    invalidCandidateIds.add(candidateId);
    for (const entry of parsed.error.issues) {
      issue(issues, "candidate.binding-invalid", `dependentCandidates.${index}.${entry.path.join(".")}`, entry.message);
    }
  });
  return { candidates, candidateIds, invalidCandidateIds };
}

function validateCandidateBindings(
  candidates: readonly SourceDependentCandidate[],
  replay: SourceAuthorityReplay,
  issues: SourceAuthorityIssue[],
  initialInvalidCandidateIds: ReadonlySet<string>,
): ReadonlySet<string> {
  const invalidCandidateIds = new Set(initialInvalidCandidateIds);
  const itemById = new Map(replay.package.items.map((item) => [item.id, item]));
  const claimById = new Map(replay.package.claims.map((claim) => [claim.id, claim]));
  const rightsById = new Map(replay.package.rightsRecords.map((record) => [record.id, record]));
  for (const candidate of candidates) {
    for (const [bindingIndex, binding] of candidate.sourceBindings.entries()) {
      const path = `dependentCandidates.${candidate.id}.sourceBindings.${bindingIndex}`;
      const invalid = (message: string, field = "") => {
        invalidCandidateIds.add(candidate.id);
        issue(issues, "candidate.binding-invalid", `${path}${field}`, message);
      };
      if (binding.sourcePackageId !== replay.package.id || binding.sourcePackageVersion !== replay.package.version || binding.sourcePackageDigest !== replay.package.packageDigest) {
        invalid("Candidate must bind the exact source package identity, version, and digest.");
        continue;
      }
      const sourceItem = itemById.get(binding.sourceItemId);
      if (!sourceItem) invalid("Candidate references an unknown source item.", ".sourceItemId");
      for (const claimId of binding.claimIds) {
        const claim = claimById.get(claimId);
        if (!claim || claim.sourceItemId !== binding.sourceItemId) {
          invalid("Candidate claims must exist and belong to its exact source item.", ".claimIds");
        }
      }
      const rights = rightsById.get(binding.rightsRecordId);
      if (!rights || rights.sourceItemId !== binding.sourceItemId) {
        invalid("Candidate rights record must exist and belong to its exact source item.", ".rightsRecordId");
      } else if (binding.requiredProductUses.some((productUse) => !rights.permittedProductUses.includes(productUse))) {
        invalid("Candidate required product uses must be explicitly permitted by its rights record.", ".requiredProductUses");
      }
    }
  }
  return invalidCandidateIds;
}

function candidateInvalidations(
  candidates: readonly SourceDependentCandidate[],
  candidateIds: readonly string[],
  replay: SourceAuthorityReplay,
  asOf: Date,
  hasBlockingAuthorityIssue: boolean,
  invalidCandidateIds: ReadonlySet<string>,
): readonly { readonly candidateId: string; readonly reasons: readonly string[] }[] {
  const rightsById = new Map(replay.package.rightsRecords.map((record) => [record.id, record]));
  const reasonsByCandidateId = new Map(candidateIds.map((candidateId) => [candidateId, new Set<string>()]));

  for (const candidate of candidates) {
    const reasons = reasonsByCandidateId.get(candidate.id) ?? new Set<string>();
    reasonsByCandidateId.set(candidate.id, reasons);
    if (invalidCandidateIds.has(candidate.id)) reasons.add("candidate-binding-invalid");
    for (const binding of candidate.sourceBindings) {
      if (binding.sourcePackageId !== replay.package.id || binding.sourcePackageVersion !== replay.package.version || binding.sourcePackageDigest !== replay.package.packageDigest) {
        reasons.add("exact-source-package-binding-mismatch");
        continue;
      }
      const rights = rightsById.get(binding.rightsRecordId);
      if (!rights) reasons.add("missing-rights-record");
      else if (hasExpired(rights.expiresAt, asOf)) reasons.add("rights-expired");
      for (const event of replay.events) {
        if (occursAfter(event.occurredAt, asOf)) continue;
        if (event.type === "withdrawal-recorded" && event.sourceItemId === binding.sourceItemId) reasons.add("source-withdrawn");
        if (event.type === "correction-recorded" && event.sourceItemId === binding.sourceItemId && event.affectedClaimIds.some((claimId) => binding.claimIds.includes(claimId))) {
          reasons.add("source-corrected");
        }
        if (event.type === "rights-expiry-recorded" && event.sourceItemId === binding.sourceItemId && event.rightsRecordId === binding.rightsRecordId) {
          reasons.add("rights-expired");
        }
      }
    }
    if (hasBlockingAuthorityIssue) reasons.add("source-authority-invalid");
  }
  for (const candidateId of invalidCandidateIds) {
    const reasons = reasonsByCandidateId.get(candidateId) ?? new Set<string>();
    reasons.add("candidate-binding-invalid");
    reasonsByCandidateId.set(candidateId, reasons);
  }
  if (hasBlockingAuthorityIssue) {
    for (const reasons of reasonsByCandidateId.values()) reasons.add("source-authority-invalid");
  }
  return [...reasonsByCandidateId.entries()]
    .filter(([, reasons]) => reasons.size > 0)
    .map(([candidateId, reasons]) => ({ candidateId, reasons: [...reasons].sort(canonicalCodeUnitCompare) }));
}

/**
 * Replays immutable source package facts. A complete result means only that
 * this local candidate is structurally complete under the supplied policy; it
 * does not attest live source authenticity, durable records, human identity,
 * rights clearance, or publication.
 */
export async function replaySourceAuthority(input: {
  readonly replay: unknown;
  readonly reviewPolicy: unknown;
  readonly asOf: string;
  readonly dependentCandidates?: readonly unknown[];
}): Promise<SourceAuthorityReplayResult> {
  const issues = [
    ...structuralIssues(input.replay, sourceAuthorityReplaySchema, "schema.invalid"),
    ...structuralIssues(input.reviewPolicy, sourceReviewPolicySchema, "policy.invalid"),
  ];
  const asOf = asOfDate(input.asOf);
  if (!asOf) issue(issues, "schema.invalid", "asOf", "Replay evaluation time must be an offset timestamp.");
  const replayResult = sourceAuthorityReplaySchema.safeParse(input.replay);
  const policyResult = sourceReviewPolicySchema.safeParse(input.reviewPolicy);
  const collectedCandidates = collectDependentCandidates(input.dependentCandidates ?? [], issues);

  if (!replayResult.success || !policyResult.success || !asOf) {
    const invalidatedCandidates = collectedCandidates.candidateIds.map((candidateId) => ({
      candidateId,
      reasons: [
        ...(collectedCandidates.invalidCandidateIds.has(candidateId) ? ["candidate-binding-invalid"] : []),
        "source-authority-invalid",
      ],
    }));
    return {
      status: "review-candidate-incomplete",
      publicationAuthority: "not-established",
      sourceAuthenticity: "not-established",
      durableStorage: "not-established",
      accountableHumanApproval: "not-established",
      rightsClearance: "not-established",
      invalidatedCandidates,
      issues,
    };
  }

  const replay = replayResult.data;
  const policy = policyResult.data;
  const { digest: policyDigest, ...policyInput } = policy;
  void policyDigest;
  const suppliedPolicyDigestMatches = policy.digest === await sourceReviewPolicyDigest(policyInput);
  if (!suppliedPolicyDigestMatches) {
    issue(issues, "policy.digest-mismatch", "reviewPolicy.digest", "Supplied policy digest does not match its canonical policy contents.");
  }
  const packagePolicyMatches = replay.package.policyRef.id === policy.id &&
    replay.package.policyRef.version === policy.version &&
    replay.package.policyRef.digest === policy.digest;
  if (!packagePolicyMatches) {
    issue(issues, "policy.mismatch", "package.policyRef", "Package policy reference must equal the supplied policy identity, version, and canonical digest.");
  }
  const { packageDigest, ...packageInput } = replay.package;
  void packageDigest;
  if (replay.package.packageDigest !== await sourceAuthorityPackageDigest(packageInput)) {
    issue(issues, "package.digest-mismatch", "package.packageDigest", "Package digest does not match all canonical package contents.");
  }
  await validatePackageRelations(replay.package, policy, asOf, issues, suppliedPolicyDigestMatches && packagePolicyMatches);
  await validateReplayEvents(replay, asOf, issues);

  const invalidCandidateIds = validateCandidateBindings(collectedCandidates.candidates, replay, issues, collectedCandidates.invalidCandidateIds);
  // Any package/replay failure invalidates supplied dependents. Only a
  // candidate's own malformed binding is excluded from this package-wide flag.
  const hasBlockingAuthorityIssue = issues.some((entry) => entry.code !== "candidate.binding-invalid" && entry.code !== "candidate.duplicate-id");
  const invalidatedCandidates = candidateInvalidations(collectedCandidates.candidates, collectedCandidates.candidateIds, replay, asOf, hasBlockingAuthorityIssue, invalidCandidateIds);
  return {
    status: issues.length === 0 ? "review-candidate-complete" : "review-candidate-incomplete",
    publicationAuthority: "not-established",
    sourceAuthenticity: "not-established",
    durableStorage: "not-established",
    accountableHumanApproval: "not-established",
    rightsClearance: "not-established",
    invalidatedCandidates,
    issues,
  };
}
