import { types as nodeUtilTypes } from "node:util";

import { type ZodError } from "zod";

import { boundedJsonSnapshot } from "../bounded-json-snapshot";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION,
  projectUniversityDegreeMap,
} from "../university-degree-map";
import {
  UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION,
  projectUniversityLearningMap,
} from "../university-learning-map";
import {
  UNIVERSITY_DECLARATION_DOCUMENT_CANONICALIZER_VERSION,
  UNIVERSITY_DECLARATION_DOCUMENT_DIGEST_DOMAIN,
  type UniversityDeclarationDocumentAuthority,
  type UniversityDeclarationDocumentIssue,
  type UniversityDeclarationDocumentRequestV1,
  type UniversityDeclarationDocumentResult,
  UNIVERSITY_DECLARATION_DOCUMENT_RESULT_SCHEMA_VERSION,
  UNIVERSITY_DECLARATION_DOCUMENT_SCHEMA_VERSION,
  universityDeclarationDocumentRequestSchema,
} from "./contracts";

const MAXIMUM_STRING_LENGTH = 4_096;
const MAXIMUM_SERIALIZED_JSON_BYTES = 512 * 1_024;

const AUTHORITY = deepFreeze({
  ownerAuthorityEstablished: false,
  tenantAuthorityEstablished: false,
  adultStatusAuthority: "self_attested_not_verified",
  adultEntitlementEstablished: false,
  institutionalAuthorityEstablished: false,
  sourceAuthorityEstablished: false,
  persistenceAllowed: false,
  networkAllowed: false,
  eventEmissionAllowed: false,
  providerCallAllowed: false,
  identityAuthorityEstablished: false,
  recommendationAllowed: false,
  masteryInferenceAllowed: false,
  tutoringAllowed: false,
  answerGenerationAllowed: false,
  externalEffectsAllowed: false,
} satisfies UniversityDeclarationDocumentAuthority);

function issue(
  code: UniversityDeclarationDocumentIssue["code"],
  path: string,
  message: string,
): UniversityDeclarationDocumentIssue {
  return { code, path, message };
}

function orderedIssues(
  issues: readonly UniversityDeclarationDocumentIssue[],
): readonly UniversityDeclarationDocumentIssue[] {
  return [...issues].sort((left, right) => (
    left.code.localeCompare(right.code)
    || left.path.localeCompare(right.path)
    || left.message.localeCompare(right.message)
  ));
}

function structuralIssues(
  error: ZodError,
): readonly UniversityDeclarationDocumentIssue[] {
  return orderedIssues(error.issues.map((entry) => {
    const root = entry.path[0];
    const child = root === "degreeMapRequest" || root === "learningMapRequest";
    return issue(
      child ? "child.invalid" : "schema.invalid",
      entry.path.join("."),
      entry.message,
    );
  }));
}

function invalidResult(
  issues: readonly UniversityDeclarationDocumentIssue[],
): Readonly<UniversityDeclarationDocumentResult> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_DECLARATION_DOCUMENT_RESULT_SCHEMA_VERSION,
    document: null,
    inspection: {
      status: "invalid",
      issues: orderedIssues(issues),
    },
    authority: AUTHORITY,
  });
}

function containsUnsafeNumber(value: unknown): boolean {
  if (typeof value === "number") return !Number.isSafeInteger(value);
  if (Array.isArray(value)) return value.some(containsUnsafeNumber);
  if (value === null || typeof value !== "object") return false;
  return Object.values(value).some(containsUnsafeNumber);
}

function canonicalDigestMaterial(
  request: UniversityDeclarationDocumentRequestV1,
): string {
  return canonicalJson({
    documentSchemaVersion: UNIVERSITY_DECLARATION_DOCUMENT_SCHEMA_VERSION,
    canonicalizerVersion:
      UNIVERSITY_DECLARATION_DOCUMENT_CANONICALIZER_VERSION,
    degreeMapRequestSchemaVersion: request.degreeMapRequest.schemaVersion,
    learningMapRequestSchemaVersion: request.learningMapRequest.schemaVersion,
    degreeMapProjectionSchemaVersion:
      UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION,
    learningMapProjectionSchemaVersion:
      UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION,
    degreeMapRequest: request.degreeMapRequest,
    learningMapRequest: request.learningMapRequest,
  });
}

/**
 * Computes identity from complete raw documents and every document version.
 * Process state, identity, and revision data are excluded.
 */
function universityDeclarationDocumentDigest(
  request: UniversityDeclarationDocumentRequestV1,
): Promise<`sha256:${string}`> {
  return sha256Digest(
    `${UNIVERSITY_DECLARATION_DOCUMENT_DIGEST_DOMAIN}\u0000${canonicalDigestMaterial(request)}`,
  ) as Promise<`sha256:${string}`>;
}

/**
 * Builds one detached, deterministic declaration document for local
 * inspection. This function performs no persistence, network, event, provider,
 * identity, or external-effect operation.
 */
export async function projectUniversityDeclarationDocument(
  value: unknown,
): Promise<Readonly<UniversityDeclarationDocumentResult>> {
  try {
    let detached: unknown;
    try {
      detached = boundedJsonSnapshot(value, {
        rejectObject: (candidate) => nodeUtilTypes.isProxy(candidate),
        rejectRepeatedReferences: true,
        maximumStringLength: MAXIMUM_STRING_LENGTH,
        maximumSerializedJsonBytes: MAXIMUM_SERIALIZED_JSON_BYTES,
      });
    } catch {
      return invalidResult([issue(
        "schema.invalid",
        "",
        "The declaration request must be bounded accessor-free plain JSON.",
      )]);
    }

    if (containsUnsafeNumber(detached)) {
      return invalidResult([issue(
        "schema.invalid",
        "",
        "The declaration request must contain safe integer numbers only.",
      )]);
    }

    const parsed = universityDeclarationDocumentRequestSchema.safeParse(
      detached,
    );
    if (!parsed.success) return invalidResult(structuralIssues(parsed.error));
    const request = parsed.data;

    const degreeProjection = projectUniversityDegreeMap(
      request.degreeMapRequest,
    );
    const learningProjection = projectUniversityLearningMap(
      request.learningMapRequest,
    );
    const childIssues: UniversityDeclarationDocumentIssue[] = [];
    if (degreeProjection.status === "invalid") {
      childIssues.push(issue(
        "child.invalid",
        "degreeMapRequest",
        "The raw degree-map request did not produce a valid canonical projection.",
      ));
    }
    if (learningProjection.status === "invalid") {
      childIssues.push(issue(
        "child.invalid",
        "learningMapRequest",
        "The raw learning-map request did not produce a valid canonical projection.",
      ));
    }
    if (childIssues.length > 0) return invalidResult(childIssues);

    if (!request.degreeMapRequest.courses.some(
      (course) => course.courseId === request.learningMapRequest.course.courseRef,
    )) {
      return invalidResult([issue(
        "linkage.course_mismatch",
        "learningMapRequest.course.courseRef",
        "The learning-map course must exist in the raw degree map.",
      )]);
    }

    const document = {
      schemaVersion: UNIVERSITY_DECLARATION_DOCUMENT_SCHEMA_VERSION,
      canonicalizerVersion:
        UNIVERSITY_DECLARATION_DOCUMENT_CANONICALIZER_VERSION,
      degreeMapRequestSchemaVersion: request.degreeMapRequest.schemaVersion,
      learningMapRequestSchemaVersion: request.learningMapRequest.schemaVersion,
      degreeMapProjectionSchemaVersion:
        UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION,
      learningMapProjectionSchemaVersion:
        UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION,
      degreeMapRequest: request.degreeMapRequest,
      learningMapRequest: request.learningMapRequest,
      documentDigest: await universityDeclarationDocumentDigest(request),
    } as const;
    const reviewIssues = orderedIssues([
      ...(degreeProjection.status === "review_required"
        ? [issue(
          "degree.review_required",
          "degreeMapRequest",
          "The raw degree-map request requires process-local review.",
        )]
        : []),
      ...(learningProjection.status === "review_required"
        ? [issue(
          "learning.review_required",
          "learningMapRequest",
          "The raw learning-map request requires process-local review.",
        )]
        : []),
    ]);

    return deepFreeze({
      schemaVersion: UNIVERSITY_DECLARATION_DOCUMENT_RESULT_SCHEMA_VERSION,
      document,
      inspection: {
        status: reviewIssues.length > 0
          ? "review_required"
          : "ready_for_inspection",
        issues: reviewIssues,
      },
      authority: AUTHORITY,
    });
  } catch {
    return invalidResult([issue(
      "projection.unexpected",
      "",
      "The declaration projector failed closed before exposing an inspection state.",
    )]);
  }
}
