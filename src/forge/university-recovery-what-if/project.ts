import "server-only";

import { types as nodeUtilTypes } from "node:util";

import { ZodError } from "zod";

import { boundedJsonSnapshot } from "../bounded-json-snapshot";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  projectUniversityRecovery,
  type UniversityRecoveryProjectionV1,
  type UniversityRecoveryRequestV1,
} from "../university-recovery";
import {
  UNIVERSITY_RECOVERY_WHAT_IF_PROJECTION_SCHEMA_VERSION,
  type UniversityRecoveryWhatIfAuthority,
  type UniversityRecoveryWhatIfIssue,
  type UniversityRecoveryWhatIfProjectionV1,
  universityRecoveryWhatIfRequestSchema,
} from "./contracts";

const AUTHORITY = deepFreeze({
  identityAuthority: false,
  tenantIsolationAuthority: false,
  rightsEnforcementAuthority: false,
  sourceAuthenticityAuthority: false,
  institutionalCompletenessAuthority: false,
  capacityDeclarationAuthority: "learner_fixture_only",
  protectedBufferChangeAllowed: false,
  courseworkChangeAllowed: false,
  deadlineChangeAllowed: false,
  effortChangeAllowed: false,
  dispositionChangeAllowed: false,
  recommendationAllowed: false,
  planApplicationAllowed: false,
  sessionStartAllowed: false,
  persistenceAllowed: false,
  evidenceClaimAllowed: false,
  messageSendAllowed: false,
  eventEmissionAllowed: false,
  externalSideEffectsAllowed: false,
} satisfies UniversityRecoveryWhatIfAuthority);

function orderedIssues(
  issues: readonly UniversityRecoveryWhatIfIssue[],
): readonly UniversityRecoveryWhatIfIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function invalidProjection(
  issues: readonly UniversityRecoveryWhatIfIssue[],
): Readonly<UniversityRecoveryWhatIfProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_RECOVERY_WHAT_IF_PROJECTION_SCHEMA_VERSION,
    projectionClass:
      "development_only_transient_recovery_capacity_what_if",
    status: "invalid",
    authority: AUTHORITY,
    baseline: null,
    selection: null,
    recovery: null,
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

function zodIssues(error: ZodError): UniversityRecoveryWhatIfIssue[] {
  return error.issues.map((entry) => ({
    code: "schema.invalid",
    path: entry.path.join("."),
    message: entry.message,
  }));
}

function lockedRequest(
  request: UniversityRecoveryRequestV1,
): UniversityRecoveryRequestV1 {
  return {
    ...request,
    recoveryWindow: {
      ...request.recoveryWindow,
      availableMinutes: 0,
    },
  };
}

async function signedProjection(
  projection: Omit<UniversityRecoveryWhatIfProjectionV1, "projectionDigest">,
): Promise<Readonly<UniversityRecoveryWhatIfProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

function usableProjection(
  projection: Readonly<UniversityRecoveryProjectionV1>,
): projection is Readonly<UniversityRecoveryProjectionV1> & {
  readonly projectionDigest: string;
} {
  return projection.status !== "invalid"
    && projection.projectionDigest !== null;
}

/**
 * Recomputes one transient Recovery preview after replacing only the
 * learner-fixture available-minutes declaration. It never applies, saves,
 * recommends, reschedules, sends, or emits the resulting draft.
 */
export async function projectUniversityRecoveryWhatIf(
  value: unknown,
): Promise<Readonly<UniversityRecoveryWhatIfProjectionV1>> {
  try {
    let copied: unknown;
    try {
      copied = boundedJsonSnapshot(value, {
        rejectObject: nodeUtilTypes.isProxy,
      });
    } catch {
      return invalidProjection([{
        code: "schema.invalid",
        path: "",
        message:
          "The recovery what-if request must be bounded accessor-free plain JSON.",
      }]);
    }

    const parsed = universityRecoveryWhatIfRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(zodIssues(parsed.error));
    const request = parsed.data;
    const baselineRecovery = await projectUniversityRecovery(
      request.recoveryRequest,
    );
    if (!usableProjection(baselineRecovery)) {
      return invalidProjection([{
        code: "baseline.invalid",
        path: "recoveryRequest",
        message:
          "The recovery what-if requires one valid canonical Recovery baseline.",
      }]);
    }

    const lockedFieldsDigest = await sha256Digest(
      canonicalJson(lockedRequest(request.recoveryRequest)),
    );
    const baseline = {
      availableMinutes:
        request.recoveryRequest.recoveryWindow.availableMinutes,
      protectedBufferMinutes:
        request.recoveryRequest.recoveryWindow.bufferMinutes,
      lockedFieldsDigest,
      recoveryProjectionDigest: baselineRecovery.projectionDigest,
    };

    if (baselineRecovery.status === "source_review_required") {
      return signedProjection({
        schemaVersion: UNIVERSITY_RECOVERY_WHAT_IF_PROJECTION_SCHEMA_VERSION,
        projectionClass:
          "development_only_transient_recovery_capacity_what_if",
        status: "source_review_required",
        authority: AUTHORITY,
        baseline,
        selection: null,
        recovery: baselineRecovery,
        issues: [{
          code: "source.review_required",
          path: "recoveryRequest.courses",
          message:
            "Review the copied course source before comparing capacity.",
        }],
      });
    }

    const adjustedRequest: UniversityRecoveryRequestV1 = {
      ...request.recoveryRequest,
      recoveryWindow: {
        ...request.recoveryRequest.recoveryWindow,
        availableMinutes: request.availableMinutes,
      },
    };
    if (
      await sha256Digest(canonicalJson(lockedRequest(adjustedRequest)))
      !== lockedFieldsDigest
    ) {
      return invalidProjection([{
        code: "result.invalid",
        path: "recoveryRequest",
        message:
          "A recovery what-if may change only available minutes.",
      }]);
    }

    const recovery = await projectUniversityRecovery(adjustedRequest);
    if (!usableProjection(recovery)) {
      return invalidProjection([{
        code: "result.invalid",
        path: "availableMinutes",
        message:
          "The selected available minutes did not produce a valid canonical Recovery preview.",
      }]);
    }

    return signedProjection({
      schemaVersion: UNIVERSITY_RECOVERY_WHAT_IF_PROJECTION_SCHEMA_VERSION,
      projectionClass:
        "development_only_transient_recovery_capacity_what_if",
      status: recovery.status,
      authority: AUTHORITY,
      baseline,
      selection: {
        availableMinutes: request.availableMinutes,
      },
      recovery,
      issues: [],
    });
  } catch {
    return invalidProjection([{
      code: "projection.unexpected",
      path: "",
      message:
        "The recovery what-if failed closed before producing a usable comparison.",
    }]);
  }
}
