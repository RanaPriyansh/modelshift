export type UniversityLearningMapPresentation = Readonly<{
  status: "review_required";
  statusLabel: string;
  course: Readonly<{
    label: string;
    ownershipLabel: string;
    sourceLabel: string;
  }>;
  outcomes: readonly Readonly<{
    label: string;
    coverageLabel: string;
  }>[];
  concepts: readonly Readonly<{
    orderLabel: string;
    label: string;
    outcomeLabel: string;
    prerequisiteLabel: string;
    attemptLabel: string;
    evidenceLabel: string;
    helpLabel: string;
    returnLabel: string;
  }>[];
  unknowns: readonly string[];
  authority: readonly Readonly<{
    label: string;
    value: string;
  }>[];
}>;
