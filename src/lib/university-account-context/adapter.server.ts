import "server-only";

import { createHmac } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import { z, type ZodError } from "zod";

import { boundedJsonSnapshot } from "@/src/forge/bounded-json-snapshot";
import { deepFreeze } from "@/src/forge/deep-freeze";
import {
  projectUniversityStudentContext,
  UNIVERSITY_STUDENT_CONTEXT_REQUEST_SCHEMA_VERSION,
} from "@/src/forge/university-student-context";
import { readForgeCloudIdentity } from "@/src/lib/forge-auth/session.server";

import {
  type UniversityAccountContextAuthority,
  type UniversityAccountContextInvalidReason,
  type UniversityAccountContextIssue,
  type UniversityAccountContextResult,
  type UniversityAccountContextUnavailableResult,
  UNIVERSITY_ACCOUNT_CONTEXT_RESULT_VERSION,
  universityAccountContextRequestSchema,
} from "./contracts";
import { readUniversityAccountContextBindingKey } from "./binding-key-provider.server";

const UNIVERSITY_ACCOUNT_CONTEXT_BINDING_DOMAIN =
  "forge.university-account-context.binding.hmac-sha256.v1";
const UNIVERSITY_ACCOUNT_CONTEXT_BINDING_PREFIX =
  "learner.hmac-sha256.v1";
const MINIMUM_BINDING_KEY_BYTES = 32;
const MAXIMUM_BINDING_KEY_BYTES = 4_096;
const MAX_RETURNED_ISSUES = 64;
const ARRAY_INDEX = /^(0|[1-9]\d*)$/;
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const typedArrayByteLength = Object.getOwnPropertyDescriptor(
  typedArrayPrototype,
  "byteLength",
)?.get;

const forgeCloudIdentitySchema = z.strictObject({
  id: z.string().uuid(),
  email: z.string().email().max(254).nullable(),
  accountKind: z.literal("cloud_identity"),
});

function authority(
  bound: boolean,
): Readonly<UniversityAccountContextAuthority> {
  return deepFreeze({
    accountBindingAuthority: bound
      ? "authenticated_active_adult_cloud_profile"
      : "not_established",
    bindingIdentifierAuthority: bound
      ? "server_derived_context_specific_hmac_sha256_v1"
      : "not_established",
    bindingKeyAuthority: bound
      ? "server_injected_minimum_32_byte_key"
      : "not_established",
    ageVerificationAuthority: "not_established",
    learnerContentAuthority: "learner_declared_not_verified",
    institutionalAuthorityEstablished: false,
    tenantAuthorityEstablished: false,
    persistenceAllowed: false,
    eventEmissionAllowed: false,
    providerCallAllowed: false,
    recommendationAllowed: false,
    answerGenerationAllowed: false,
    masteryInferenceAllowed: false,
    networkBeyondIdentityReaderAllowed: false,
    externalEffectsAllowed: false,
  });
}

const UNBOUND_AUTHORITY = authority(false);
const BOUND_AUTHORITY = authority(true);

function snapshot(value: unknown): unknown {
  return boundedJsonSnapshot(value, {
    rejectObject: nodeUtilTypes.isProxy,
    rejectRepeatedReferences: true,
  });
}

function orderedIssues(
  issues: readonly UniversityAccountContextIssue[],
): readonly UniversityAccountContextIssue[] {
  return [...issues]
    .sort((left, right) => (
      left.code.localeCompare(right.code)
      || left.path.localeCompare(right.path)
      || left.message.localeCompare(right.message)
    ))
    .slice(0, MAX_RETURNED_ISSUES);
}

function invalid(
  reason: UniversityAccountContextInvalidReason,
  issues: readonly UniversityAccountContextIssue[],
): Readonly<UniversityAccountContextResult> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_ACCOUNT_CONTEXT_RESULT_VERSION,
    status: "invalid",
    reason,
    context: null,
    authority: UNBOUND_AUTHORITY,
    issues: orderedIssues(issues),
  });
}

function unavailable(
  reason: UniversityAccountContextUnavailableResult["reason"],
): Readonly<UniversityAccountContextResult> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_ACCOUNT_CONTEXT_RESULT_VERSION,
    status: "unavailable",
    reason,
    context: null,
    authority: UNBOUND_AUTHORITY,
    issues: [],
  });
}

function invalidInput(error?: ZodError): Readonly<UniversityAccountContextResult> {
  const issues = error
    ? error.issues.map((entry) => ({
      code: "input.invalid" as const,
      path: entry.path.join("."),
      message: "The account-context request contains an invalid field.",
    }))
    : [{
      code: "input.invalid" as const,
      path: "",
      message: "The account-context request must be bounded plain JSON.",
    }];
  return invalid("input_invalid", issues);
}

function opaqueBindingId(accountId: string, bindingKey: Uint8Array): string {
  try {
    const digest = createHmac("sha256", bindingKey)
      .update(UNIVERSITY_ACCOUNT_CONTEXT_BINDING_DOMAIN)
      .update("\0")
      .update(accountId)
      .digest("hex");
    return `${UNIVERSITY_ACCOUNT_CONTEXT_BINDING_PREFIX}.${digest}`;
  } finally {
    bindingKey.fill(0);
  }
}

function copyBindingKey(value: unknown): Uint8Array | null {
  if (
    typeof value !== "object"
    || value === null
    || nodeUtilTypes.isProxy(value)
    || !nodeUtilTypes.isUint8Array(value)
    || !typedArrayByteLength
  ) {
    return null;
  }
  const byteLength = Reflect.apply(typedArrayByteLength, value, []) as number;
  if (
    byteLength < MINIMUM_BINDING_KEY_BYTES
    || byteLength > MAXIMUM_BINDING_KEY_BYTES
    || Object.getPrototypeOf(value) !== Uint8Array.prototype
  ) {
    return null;
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== byteLength
    || keys.some((key) => (
      typeof key !== "string"
      || !ARRAY_INDEX.test(key)
    ))
    || keys.some((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        !descriptor
        || !("value" in descriptor)
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      );
    })
  ) {
    return null;
  }
  const copy = new Uint8Array(byteLength);
  Uint8Array.prototype.set.call(copy, value);
  return copy;
}

/**
 * Binds strict learner declarations to the current authenticated active-adult
 * cloud profile. The account identifier never enters request data or output.
 */
export async function bindUniversityAccountContext(
  value: unknown,
): Promise<Readonly<UniversityAccountContextResult>> {
  try {
    let detachedInput: unknown;
    try {
      detachedInput = snapshot(value);
    } catch {
      return invalidInput();
    }

    const parsedInput = universityAccountContextRequestSchema.safeParse(
      detachedInput,
    );
    if (!parsedInput.success) return invalidInput(parsedInput.error);

    let rawIdentity: unknown;
    try {
      rawIdentity = await readForgeCloudIdentity();
    } catch {
      return invalid("identity_reader_failed", [{
        code: "identity.reader_failed",
        path: "",
        message: "The server identity reader failed closed.",
      }]);
    }

    if (rawIdentity === null) {
      return unavailable("cloud_identity_unavailable");
    }

    let detachedIdentity: unknown;
    try {
      detachedIdentity = snapshot(rawIdentity);
    } catch {
      return invalid("identity_record_invalid", [{
        code: "identity.record_invalid",
        path: "",
        message: "The server identity record is invalid.",
      }]);
    }
    const parsedIdentity = forgeCloudIdentitySchema.safeParse(detachedIdentity);
    if (!parsedIdentity.success) {
      return invalid("identity_record_invalid", [{
        code: "identity.record_invalid",
        path: "",
        message: "The server identity record is invalid.",
      }]);
    }

    let rawBindingKey: unknown;
    try {
      rawBindingKey = readUniversityAccountContextBindingKey();
    } catch {
      return unavailable("binding_key_unavailable");
    }

    if (rawBindingKey === null) {
      return unavailable("binding_key_unavailable");
    }
    const bindingKey = copyBindingKey(rawBindingKey);
    if (!bindingKey) {
      return unavailable("binding_key_invalid");
    }

    const projection = projectUniversityStudentContext({
      schemaVersion: UNIVERSITY_STUDENT_CONTEXT_REQUEST_SCHEMA_VERSION,
      contextBinding: {
        bindingId: opaqueBindingId(parsedIdentity.data.id, bindingKey),
        ownershipDeclaration: "adult_learner_self_attested",
      },
      degreeMapRequest: parsedInput.data.degreeMapRequest,
      learningMapRequest: parsedInput.data.learningMapRequest,
    });

    if (
      projection.status === "invalid"
      || !projection.contextBinding
      || !projection.degreeAxis
      || !projection.learningAxis
    ) {
      const issues = projection.issues.length > 0
        ? projection.issues.map((entry) => ({
          code: "student_context.invalid" as const,
          path: entry.path,
          message: "The canonical student context rejected this request.",
        }))
        : [{
          code: "student_context.invalid" as const,
          path: "",
          message: "The canonical student context rejected this request.",
        }];
      return invalid("student_context_invalid", issues);
    }

    return deepFreeze({
      schemaVersion: UNIVERSITY_ACCOUNT_CONTEXT_RESULT_VERSION,
      status: "bound_for_inspection",
      reason: null,
      context: {
        canonicalStatus: projection.status,
        contextBinding: projection.contextBinding,
        degreeAxis: projection.degreeAxis,
        learningAxis: projection.learningAxis,
      },
      authority: BOUND_AUTHORITY,
      issues: [],
    });
  } catch {
    return invalid("adapter_unexpected", [{
      code: "adapter.unexpected",
      path: "",
      message: "The account-context adapter failed closed.",
    }]);
  }
}
