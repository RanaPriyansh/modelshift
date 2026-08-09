import "server-only";

import { deepFreeze } from "@/src/forge/deep-freeze";
import {
  projectUniversityRecoveryWhatIf,
} from "@/src/forge/university-recovery-what-if";

import { universityRecoveryFixtureRequest } from "./recovery-fixture.server";

export const UNIVERSITY_RECOVERY_WHAT_IF_FIXTURE_SCHEMA_VERSION =
  "university-recovery-what-if-fixture.v1" as const;

export type UniversityRecoveryWhatIfChoiceId =
  | "available-240"
  | "available-130"
  | "available-100";

export type UniversityRecoveryWhatIfResultKind =
  | "full_range_fits"
  | "low_only_fits"
  | "low_does_not_fit";

export interface UniversityRecoveryWhatIfResult {
  readonly kind: UniversityRecoveryWhatIfResultKind;
  readonly availableMinutes: number;
  readonly protectedBufferMinutes: number;
  readonly workableMinutes: number;
  readonly protectedEffortMinutesLow: number;
  readonly protectedEffortMinutesHigh: number;
  readonly headline: string;
  readonly explanation: string;
  readonly announcement: string;
  readonly humanHelp: Readonly<{
    stateLabel: "Prepared, not sent";
    subject: string;
    question: string;
  }> | null;
}

export interface UniversityRecoveryWhatIfChoice {
  readonly id: UniversityRecoveryWhatIfChoiceId;
  readonly label: string;
  readonly description: string;
  readonly result: Readonly<UniversityRecoveryWhatIfResult>;
}

interface UniversityRecoveryWhatIfFixtureShared {
  readonly schemaVersion:
    typeof UNIVERSITY_RECOVERY_WHAT_IF_FIXTURE_SCHEMA_VERSION;
  readonly termLabel: string;
}

export type UniversityRecoveryWhatIfFixture =
  | Readonly<UniversityRecoveryWhatIfFixtureShared & {
      readonly view: "capacity_choices";
      readonly fixedEvidence: Readonly<{
        windowStartsAt: string;
        windowEndsAt: string;
        timeZone: string;
        courseLabel: string;
        itemTitle: string;
        copiedDeadline: string;
        learnerDisposition: "required";
        protectedEffortMinutesLow: number;
        protectedEffortMinutesHigh: number;
        protectedBufferMinutes: number;
        outsideCourseLabel: string;
        outsideItemTitle: string;
        outsideDisposition: "deferrable";
        sourceBoundary: string;
      }>;
      readonly choices:
        readonly Readonly<UniversityRecoveryWhatIfChoice>[];
    }>
  | Readonly<UniversityRecoveryWhatIfFixtureShared & {
      readonly view: "source_review";
      readonly message: string;
      readonly choices: readonly [];
    }>;

const CHOICES = Object.freeze([
  {
    id: "available-240",
    label: "4 h available",
    description: "240 minutes in this sample window",
    availableMinutes: 240,
    expectedKind: "full_range_fits",
    expectedStatus: "draft_ready",
    headline: "The full protected range fits.",
    explanation:
      "Both ends of the unchanged effort range fit inside the workable time.",
  },
  {
    id: "available-130",
    label: "2 h 10 min available",
    description: "130 minutes in this sample window",
    availableMinutes: 130,
    expectedKind: "low_only_fits",
    expectedStatus: "learner_choice_required",
    headline: "Only the low estimate fits.",
    explanation:
      "FORGE cannot choose the trade-off or shorten the full effort range.",
  },
  {
    id: "available-100",
    label: "1 h 40 min available",
    description: "100 minutes in this sample window",
    availableMinutes: 100,
    expectedKind: "low_does_not_fit",
    expectedStatus: "human_help_required",
    headline: "Even the low estimate does not fit.",
    explanation:
      "The protected work stays intact. A bounded human question is prepared, not sent.",
  },
] as const);

export async function universityRecoveryWhatIfFixture(
  sourceState: "reviewed" | "source-review" = "reviewed",
): Promise<Readonly<UniversityRecoveryWhatIfFixture>> {
  const recoveryRequest = universityRecoveryFixtureRequest({
    conflict: sourceState === "source-review",
  });
  const projections = await Promise.all(CHOICES.map((choice) => (
    projectUniversityRecoveryWhatIf({
      schemaVersion: "university-recovery-what-if-request.v1",
      recoveryRequest,
      availableMinutes: choice.availableMinutes,
    })
  )));
  const first = projections[0]!;
  if (sourceState === "source-review") {
    if (
      projections.some((projection) => (
        projection.status !== "source_review_required"
        || projection.selection !== null
        || projection.recovery?.capacity !== null
      ))
    ) {
      throw new Error(
        "The recovery what-if source-review fixture did not withhold capacity.",
      );
    }
    return deepFreeze({
      schemaVersion: UNIVERSITY_RECOVERY_WHAT_IF_FIXTURE_SCHEMA_VERSION,
      view: "source_review",
      termLabel: first.recovery?.termLabel ?? recoveryRequest.termLabel,
      message:
        "Review the copied deadline before trying a capacity what-if.",
      choices: [],
    });
  }

  if (
    first.baseline === null
    || first.recovery === null
    || first.recovery.capacity === null
  ) {
    throw new Error(
      "The recovery what-if requires one exact reviewed Recovery baseline.",
    );
  }
  const baseline = first.recovery;
  const required = baseline.lanes.protectNow[0];
  const outside = baseline.lanes.outsideThisWindow[0];
  if (
    baseline.lanes.protectNow.length !== 1
    || baseline.lanes.decideOrAsk.length !== 0
    || baseline.lanes.outsideThisWindow.length !== 1
    || !required
    || !outside
    || required.learnerDisposition !== "required"
    || outside.learnerDisposition !== "deferrable"
  ) {
    throw new Error(
      "The recovery what-if fixed item classifications changed.",
    );
  }

  const lockedDigest = first.baseline.lockedFieldsDigest;
  const choices = CHOICES.map((choice, index) => {
    const projection = projections[index]!;
    const recovery = projection.recovery;
    const capacity = recovery?.capacity;
    if (
      projection.status !== choice.expectedStatus
      || projection.selection?.availableMinutes !== choice.availableMinutes
      || projection.baseline?.lockedFieldsDigest !== lockedDigest
      || !capacity
      || capacity.availableMinutes !== choice.availableMinutes
      || capacity.protectedBufferMinutes
        !== first.baseline?.protectedBufferMinutes
      || capacity.protectedEffortMinutesLow
        !== required.effortMinutesLow
      || capacity.protectedEffortMinutesHigh
        !== required.effortMinutesHigh
      || recovery?.lanes.protectNow[0]?.itemId !== required.itemId
      || recovery?.lanes.outsideThisWindow[0]?.itemId !== outside.itemId
    ) {
      throw new Error(
        `The recovery what-if ${choice.id} result drifted from its fixed baseline.`,
      );
    }
    const humanHelp = recovery.humanHelpDraft
      ? {
          stateLabel: "Prepared, not sent" as const,
          subject: recovery.humanHelpDraft.subject,
          question: recovery.humanHelpDraft.question,
        }
      : null;
    const announcement = choice.expectedKind === "full_range_fits"
      ? `The full protected range fits in ${capacity.workableMinutes} workable minutes.`
      : choice.expectedKind === "low_only_fits"
        ? `Only the low estimate fits in ${capacity.workableMinutes} workable minutes. Learner choice remains.`
        : `Even the low estimate does not fit in ${capacity.workableMinutes} workable minutes. A question is prepared, not sent.`;
    return {
      id: choice.id,
      label: choice.label,
      description: choice.description,
      result: {
        kind: choice.expectedKind,
        availableMinutes: capacity.availableMinutes,
        protectedBufferMinutes: capacity.protectedBufferMinutes,
        workableMinutes: capacity.workableMinutes,
        protectedEffortMinutesLow:
          capacity.protectedEffortMinutesLow,
        protectedEffortMinutesHigh:
          capacity.protectedEffortMinutesHigh,
        headline: choice.headline,
        explanation: choice.explanation,
        announcement,
        humanHelp,
      },
    };
  });

  return deepFreeze({
    schemaVersion: UNIVERSITY_RECOVERY_WHAT_IF_FIXTURE_SCHEMA_VERSION,
    view: "capacity_choices",
    termLabel: baseline.termLabel ?? recoveryRequest.termLabel,
    fixedEvidence: {
      windowStartsAt: recoveryRequest.recoveryWindow.startsAt,
      windowEndsAt: recoveryRequest.recoveryWindow.endsAt,
      timeZone: recoveryRequest.timeZone,
      courseLabel: required.courseLabel,
      itemTitle: required.title,
      copiedDeadline: required.dueAt,
      learnerDisposition: required.learnerDisposition,
      protectedEffortMinutesLow: required.effortMinutesLow,
      protectedEffortMinutesHigh: required.effortMinutesHigh,
      protectedBufferMinutes: first.baseline.protectedBufferMinutes,
      outsideCourseLabel: outside.courseLabel,
      outsideItemTitle: outside.title,
      outsideDisposition: outside.learnerDisposition,
      sourceBoundary:
        "Reviewed learner-connected copy. Source authenticity and institutional completeness are not established.",
    },
    choices,
  });
}
