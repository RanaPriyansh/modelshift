import "server-only";

import { deepFreeze } from "@/src/forge/deep-freeze";
import {
  projectUniversityLearningMap,
  type UniversityLearningMapRequestV2,
} from "@/src/forge/university-learning-map";
import type {
  UniversityLearningMapPresentation,
} from "@/src/components/forge/university-learning-map/presentation";

const SYNTHETIC_REQUEST = deepFreeze({
  schemaVersion: "university-learning-map-request.v2",
  course: {
    courseRef: "course.synthetic-systems-01",
    ownershipDeclaration: "learner_self_attested",
    sourceAuthority: "learner_declared_unverified",
  },
  outcomes: [
    {
      outcomeRef: "outcome.01-source-boundary",
      declaration: "learner_declared_unverified",
    },
    {
      outcomeRef: "outcome.02-new-case",
      declaration: "learner_declared_unverified",
    },
  ],
  concepts: [
    {
      conceptRef: "concept.01-source-boundary",
      outcomeRefs: ["outcome.01-source-boundary"],
      prerequisiteConceptRefs: [],
      prerequisiteKnowledge: "declared",
    },
    {
      conceptRef: "concept.02-source-comparison",
      outcomeRefs: ["outcome.01-source-boundary"],
      prerequisiteConceptRefs: ["concept.01-source-boundary"],
      prerequisiteKnowledge: "declared",
    },
    {
      conceptRef: "concept.03-new-case",
      outcomeRefs: ["outcome.02-new-case"],
      prerequisiteConceptRefs: ["concept.02-source-comparison"],
      prerequisiteKnowledge: "unknown",
    },
  ],
  evidence: [
    {
      evidenceRef: "evidence.01-attempt",
      kind: "attempt_receipt",
      authority: "bounded_reference_only",
      contentCaptured: false,
    },
    {
      evidenceRef: "evidence.02-help",
      kind: "source_reference",
      authority: "bounded_reference_only",
      contentCaptured: false,
    },
    {
      evidenceRef: "evidence.03-attempt",
      kind: "attempt_receipt",
      authority: "bounded_reference_only",
      contentCaptured: false,
    },
  ],
  attempts: [
    {
      attemptRef: "attempt.01-source-boundary",
      conceptRefs: ["concept.01-source-boundary"],
      attemptedOn: "2026-08-01",
      disposition: "completed",
      evidenceRefs: ["evidence.01-attempt"],
      helpUsed: [{
        helpRef: "help.01-resource",
        kind: "resource",
        provenanceEvidenceRef: "evidence.02-help",
        effect: "unknown",
      }],
    },
    {
      attemptRef: "attempt.02-source-comparison",
      conceptRefs: ["concept.02-source-comparison"],
      attemptedOn: "2026-08-03",
      disposition: "incomplete",
      evidenceRefs: ["evidence.03-attempt"],
      helpUsed: [],
    },
  ],
  delayedReturns: [{
    returnRef: "return.01-source-boundary",
    sourceAttemptRef: "attempt.01-source-boundary",
    conceptRefs: ["concept.01-source-boundary"],
    dueOn: "2026-08-15",
    completion: "scheduled",
  }],
  unknowns: [
    {
      unknownRef: "unknown.01-prerequisite",
      scopeRef: "concept.03-new-case",
      kind: "prerequisite_unknown",
      state: "explicit",
    },
    {
      unknownRef: "unknown.02-evidence",
      scopeRef: "evidence.03-attempt",
      kind: "evidence_authority_unknown",
      state: "explicit",
    },
  ],
} satisfies UniversityLearningMapRequestV2);

const OUTCOME_LABELS = Object.freeze({
  "outcome.01-source-boundary":
    "Explain when a copied source can support a claim.",
  "outcome.02-new-case":
    "Apply the same source check to a new case.",
} as const);

const CONCEPT_LABELS = Object.freeze({
  "concept.01-source-boundary":
    "Separate a source copy from university truth.",
  "concept.02-source-comparison":
    "Compare two sources before using a claim.",
  "concept.03-new-case":
    "Use the source check in a new case.",
} as const);

function dateLabel(value: string): string | null {
  const labels: Readonly<Record<string, string>> = {
    "2026-08-01": "1 August 2026",
    "2026-08-03": "3 August 2026",
    "2026-08-15": "15 August 2026",
  };
  return labels[value] ?? null;
}

export function universityLearningMapFixtureRequest(): UniversityLearningMapRequestV2 {
  return structuredClone(SYNTHETIC_REQUEST);
}

export function universityLearningMapFixture(): UniversityLearningMapPresentation | null {
  const projection = projectUniversityLearningMap(
    universityLearningMapFixtureRequest(),
  );
  if (
    projection.status !== "review_required"
    || !projection.map
    || !projection.review
  ) return null;

  const attemptsByConcept = new Map(
    projection.map.attempts.map((attempt) => [
      attempt.conceptRefs[0],
      attempt,
    ]),
  );
  const returnsByConcept = new Map(
    projection.map.delayedReturns.map((entry) => [
      entry.conceptRefs[0],
      entry,
    ]),
  );

  const outcomes = projection.map.outcomes.map((outcome) => {
    const label = OUTCOME_LABELS[
      outcome.outcomeRef as keyof typeof OUTCOME_LABELS
    ];
    if (!label) return null;
    const conceptCount = projection.map!.concepts.filter(
      (concept) => concept.outcomeRefs.includes(outcome.outcomeRef),
    ).length;
    return {
      label,
      coverageLabel: conceptCount === 1
        ? "One declared concept"
        : `${conceptCount} declared concepts`,
    };
  });

  const concepts = projection.map.concepts.map((concept, index) => {
    const label = CONCEPT_LABELS[
      concept.conceptRef as keyof typeof CONCEPT_LABELS
    ];
    const outcomeLabel = OUTCOME_LABELS[
      concept.outcomeRefs[0] as keyof typeof OUTCOME_LABELS
    ];
    const attempt = attemptsByConcept.get(concept.conceptRef);
    const delayedReturn = returnsByConcept.get(concept.conceptRef);
    const attemptedOn = attempt ? dateLabel(attempt.attemptedOn) : null;
    const dueOn = delayedReturn ? dateLabel(delayedReturn.dueOn) : null;
    if (!label || !outcomeLabel || (attempt && !attemptedOn) || (delayedReturn && !dueOn)) {
      return null;
    }

    return {
      orderLabel: String(index + 1).padStart(2, "0"),
      label,
      outcomeLabel,
      prerequisiteLabel: concept.prerequisiteConceptRefs.length === 0
        ? "No prerequisite was declared."
        : concept.prerequisiteKnowledge === "unknown"
          ? "The declared prerequisite remains unknown."
          : "One declared prerequisite.",
      attemptLabel: attempt
        ? `Learner-declared attempt: ${attempt.disposition} on ${attemptedOn}.`
        : "No attempt reference.",
      evidenceLabel: attempt
        ? `${attempt.evidenceRefs.length} bounded evidence reference.`
        : "No evidence reference.",
      helpLabel: attempt?.helpUsed.length
        ? "Resource help was recorded. Its effect remains unknown."
        : "No help reference.",
      returnLabel: delayedReturn
        ? `Return copy scheduled for ${dueOn}.`
        : "No delayed return reference.",
    };
  });

  const boundedOutcomes = outcomes.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );
  const boundedConcepts = concepts.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );
  if (
    boundedOutcomes.length !== outcomes.length
    || boundedConcepts.length !== concepts.length
  ) {
    return null;
  }

  return deepFreeze({
    status: "review_required",
    statusLabel: "Review required",
    course: {
      label: "Synthetic systems course",
      ownershipLabel: "Learner-declared inspection",
      sourceLabel: "Learner-declared and unverified",
    },
    outcomes: boundedOutcomes,
    concepts: boundedConcepts,
    unknowns: [
      "A prerequisite for the new-case concept remains unknown.",
      "The authority of one evidence reference remains unknown.",
    ],
    authority: [
      {
        label: "Ownership",
        value: "Learner-declared and self-attested",
      },
      { label: "Input", value: "Synthetic and learner-declared" },
      { label: "Source state", value: "Unverified" },
      { label: "Learning assessment", value: "Not made" },
      { label: "Persistence", value: "None" },
      {
        label: "Automatic network effect",
        value: "Absent",
      },
      {
        label: "Permitted network effect",
        value: "Explicit internal navigation only",
      },
      { label: "External action", value: "None" },
    ],
  });
}
