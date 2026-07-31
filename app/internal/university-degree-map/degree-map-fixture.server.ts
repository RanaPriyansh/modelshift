import "server-only";

import { deepFreeze } from "@/src/forge/deep-freeze";
import {
  projectUniversityDegreeMap,
  type UniversityDegreeMapRequestV1,
} from "@/src/forge/university-degree-map";
import type {
  UniversityDegreeMapPresentation,
} from "@/src/components/forge/university-degree-map/UniversityDegreeMapWorkspace";

const SOURCE = {
  sourceRef: "source.synthetic.catalog.v1",
  declaredSourceDigest: `sha256:${"a".repeat(64)}`,
  authority: "learner_supplied_not_verified",
} as const;

const SYNTHETIC_REQUEST = deepFreeze({
  schemaVersion: "university-degree-map-request.v1",
  ownership: {
    ownerClass: "adult_learner",
    control: "learner_managed",
    adultAttestation: true,
  },
  program: {
    programRef: "program.computing.science",
    creditUnit: "institution_credit_unit",
    sourceRef: SOURCE.sourceRef,
  },
  sourceRegistry: [SOURCE],
  courses: [
    {
      courseId: "course.cs101",
      creditUnits: 4,
      state: "completed",
      prerequisiteCourseIds: [],
      sourceRef: SOURCE.sourceRef,
    },
    {
      courseId: "course.math120",
      creditUnits: 3,
      state: "completed",
      prerequisiteCourseIds: [],
      sourceRef: SOURCE.sourceRef,
    },
    {
      courseId: "course.cs202",
      creditUnits: 4,
      state: "in_progress",
      prerequisiteCourseIds: ["course.cs101"],
      sourceRef: SOURCE.sourceRef,
    },
    {
      courseId: "course.cs310",
      creditUnits: 4,
      state: "planned",
      prerequisiteCourseIds: ["course.cs202", "course.math120"],
      sourceRef: SOURCE.sourceRef,
    },
  ],
  requirements: [
    {
      requirementId: "requirement.core.cs310",
      kind: "required_course",
      courseId: "course.cs310",
      sourceRef: SOURCE.sourceRef,
    },
    {
      requirementId: "requirement.credits.minimum",
      kind: "minimum_credits",
      minimumCreditUnits: 11,
      eligibleCourseIds: [
        "course.cs101",
        "course.cs202",
        "course.cs310",
        "course.math120",
      ],
      sourceRef: SOURCE.sourceRef,
    },
    {
      requirementId: "requirement.foundation.math120",
      kind: "required_course",
      courseId: "course.math120",
      sourceRef: SOURCE.sourceRef,
    },
  ],
} satisfies UniversityDegreeMapRequestV1);

const STATE_LABELS = {
  completed: "Completed",
  in_progress: "In progress",
  planned: "Planned",
} as const;

export function universityDegreeMapPresentation():
Readonly<UniversityDegreeMapPresentation> {
  const projection = projectUniversityDegreeMap(SYNTHETIC_REQUEST);
  if (
    projection.status !== "ready_for_inspection"
    || projection.creditTotals === null
    || projection.courses.length > 8
    || projection.requirements.length > 8
    || projection.courses.some(
      (course) => course.prerequisiteCourseIds.length > 4,
    )
  ) {
    throw new Error("The synthetic degree-map presentation failed closed.");
  }

  return deepFreeze({
    schemaVersion: "university-degree-map-presentation.v1",
    programRef: projection.programRef ?? "",
    statusLabel: "Ready for inspection",
    credits: projection.creditTotals,
    courses: projection.courses.map((course) => ({
      courseId: course.courseId,
      creditUnits: course.creditUnits,
      stateLabel: STATE_LABELS[course.state],
      prerequisiteCourseIds: course.prerequisiteCourseIds,
      unmetPrerequisiteCourseIds: course.unmetPrerequisiteCourseIds,
    })),
    requirements: projection.requirements.map((requirement) => ({
      requirementId: requirement.requirementId,
      kindLabel: requirement.kind === "required_course"
        ? "Required course"
        : "Minimum credits",
      statusLabel: requirement.met
        ? "Met in this declaration"
        : "Open in this declaration",
      creditLabel:
        `${requirement.earnedCreditUnits} of ${requirement.requiredCreditUnits} credits`,
    })),
    authority: [
      { label: "Adult status", value: "Self-attested; not verified" },
      { label: "Source status", value: "Learner supplied; not verified" },
      { label: "Rank", value: "Not allowed" },
      { label: "Recommendation", value: "Not allowed" },
      { label: "Save", value: "Not allowed" },
      { label: "Network", value: "Not allowed" },
      { label: "Event", value: "Not allowed" },
    ],
  });
}
