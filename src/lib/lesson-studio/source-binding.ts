import { createHash } from "node:crypto";

import { z } from "zod";

import { immutableVersionRefSchema } from "./schema";

const externalIdSchema = z.string().trim().min(2).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/);
const sourceNeedIdSchema = z.string().regex(/^source-need-[a-f0-9]{12}$/);
const upstreamReviewDecisionIdSchema = z.string().trim().regex(/^upstream-review\.[a-z0-9-]+$/);

function uniqueNonemptyList<T extends z.ZodTypeAny>(item: T, max = 64) {
  return z.array(item).min(1).max(max).superRefine((value, context) => {
    if (new Set(value).size !== value.length) {
      context.addIssue({ code: "custom", message: "Identifiers must be unique." });
    }
  });
}

const sourceItemBindingSchema = z.strictObject({
  /** Exact unresolved requirements this source item resolves; overlap is disallowed locally. */
  sourceNeedIds: uniqueNonemptyList(sourceNeedIdSchema, 6),
  sourcePackageId: externalIdSchema,
  sourcePackageVersion: externalIdSchema,
  sourceItemId: externalIdSchema,
  sourceSnapshotDigest: immutableVersionRefSchema,
  locatorIds: uniqueNonemptyList(externalIdSchema),
  claimIds: uniqueNonemptyList(externalIdSchema),
  rightsRecordId: externalIdSchema,
  /** External source/rights/claim review IDs, deliberately not lesson-transition IDs. */
  reviewDecisionIds: uniqueNonemptyList(upstreamReviewDecisionIdSchema),
});

const sourceBindingReceiptBaseSchema = z.strictObject({
  /** Local schema version for the receipt envelope, not an external durability claim. */
  receiptVersion: z.literal("1.0"),
  /** Exact revision candidate whose exact unresolved source plan this package can bind. */
  candidateReviewVersionRef: immutableVersionRefSchema,
  /** One or more complete ADR-003 source item bindings. */
  sourceBindings: z.array(sourceItemBindingSchema).min(1).max(6),
  /** sha256 of every field above in the declared canonical field order. */
  receiptDigest: immutableVersionRefSchema,
});

export type SourceBindingReceipt = z.infer<typeof sourceBindingReceiptBaseSchema>;
export type SourceBindingReceiptInput = Omit<SourceBindingReceipt, "receiptDigest">;

function canonicalReceiptPayload(receipt: SourceBindingReceiptInput): string {
  // This explicit order makes the local digest reproducible across callers.
  return JSON.stringify({
    receiptVersion: receipt.receiptVersion,
    candidateReviewVersionRef: receipt.candidateReviewVersionRef,
    sourceBindings: receipt.sourceBindings.map((binding) => ({
      sourceNeedIds: binding.sourceNeedIds,
      sourcePackageId: binding.sourcePackageId,
      sourcePackageVersion: binding.sourcePackageVersion,
      sourceItemId: binding.sourceItemId,
      sourceSnapshotDigest: binding.sourceSnapshotDigest,
      locatorIds: binding.locatorIds,
      claimIds: binding.claimIds,
      rightsRecordId: binding.rightsRecordId,
      reviewDecisionIds: binding.reviewDecisionIds,
    })),
  });
}

export function sourceBindingReceiptDigest(receipt: SourceBindingReceiptInput): `sha256:${string}` {
  const parsed = sourceBindingReceiptBaseSchema.omit({ receiptDigest: true }).parse(receipt);
  return `sha256:${createHash("sha256").update(canonicalReceiptPayload(parsed)).digest("hex")}`;
}

/**
 * Validates completeness and a reproducible local digest only. It does not
 * attest to external source authenticity, storage durability, rights, review,
 * or publication authority.
 */
export const sourceBindingReceiptSchema = sourceBindingReceiptBaseSchema.superRefine((receipt, context) => {
  const { receiptDigest, ...contents } = receipt;
  const parsed = sourceBindingReceiptBaseSchema.omit({ receiptDigest: true }).safeParse(contents);
  if (!parsed.success) return;
  if (sourceBindingReceiptDigest(parsed.data) !== receiptDigest) {
    context.addIssue({ code: "custom", path: ["receiptDigest"], message: "Receipt digest does not match receipt contents." });
  }
});

export function createSourceBindingReceipt(input: SourceBindingReceiptInput): SourceBindingReceipt {
  const parsed = sourceBindingReceiptBaseSchema.omit({ receiptDigest: true }).parse(input);
  return sourceBindingReceiptSchema.parse({
    ...parsed,
    receiptDigest: sourceBindingReceiptDigest(parsed),
  });
}
