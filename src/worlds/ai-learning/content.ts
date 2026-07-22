import type {
  BoundedClaimId,
  DifferenceId,
  EvidenceId,
  EvidenceLearningError,
  ReadingId,
  ReadingVerdict,
  StanceId,
  TestPredictionId,
  TransferChoiceId,
  TransferOpenQuestionId,
} from "./types";

export const WORLD_CLAIM = "AI always helps people learn";

export const STANCES: ReadonlyArray<{ id: StanceId; label: string; note: string }> = [
  { id: "agree", label: "Agree", note: "The claim fits what I expect." },
  { id: "depends", label: "It depends", note: "The conditions probably matter." },
  { id: "disagree", label: "Disagree", note: "The claim is too broad." },
];

export interface ReviewedEvidenceSource {
  id: EvidenceId;
  shortLabel: string;
  title: string;
  citation: string;
  href: string;
  method: string;
  access: string;
  finding: string;
  boundary: string;
}

export const REVIEWED_EVIDENCE: readonly ReviewedEvidenceSource[] = [
  {
    id: "bastani-pnas",
    shortLabel: "Bastani et al.",
    title: "Generative AI without guardrails can harm learning",
    citation: "PNAS · 2025 · randomized high-school mathematics field experiment",
    href: "https://www.pnas.org/doi/10.1073/pnas.2422633122",
    method: "Nearly 1,000 high-school mathematics students were assigned to GPT Base, a safeguarded GPT Tutor, or no generative-AI access during practice; a later exam removed access.",
    access: "Students used the system directly. GPT Base could function like a standard answer-producing chat interface; GPT Tutor was constrained toward teacher-designed hints.",
    finding: "Both tools raised practice performance. After access was removed, the GPT Base group scored 17% lower than the control group; the safeguarded tutor largely mitigated that negative effect.",
    boundary: "One mathematics setting and implementation. Practice performance and later unaided performance were different measures; the study does not establish one effect for every AI tool or learner.",
  },
  {
    id: "tutor-copilot",
    shortLabel: "Tutor CoPilot",
    title: "A Human–AI approach for scaling real-time expertise",
    citation: "arXiv · 2024 (v2 2025) · preregistered randomized tutoring trial",
    href: "https://arxiv.org/abs/2410.03017",
    method: "The trial involved 900 tutors and 1,800 K–12 students from historically under-served communities in live tutoring sessions.",
    access: "Suggestions were shown to the human tutor while tutoring. Students did not receive an unrestricted answer interface from the system.",
    finding: "Students whose tutors had access were 4 percentage points more likely to master topics. Tutors used more guiding questions and were less likely to give away answers.",
    boundary: "This is a tutor-mediated setting and an arXiv preprint. Tutors also reported suggestions that were sometimes not grade-level appropriate.",
  },
];

export const EVIDENCE_IDS = REVIEWED_EVIDENCE.map((source) => source.id) as readonly EvidenceId[];

export const DIFFERENCE_OPTIONS: ReadonlyArray<{ id: DifferenceId; label: string; detail: string }> = [
  {
    id: "delivery-role",
    label: "Who receives the output, and what it can do",
    detail: "Direct, potentially answer-giving student access versus suggestions routed through a human tutor.",
  },
  {
    id: "model-brand",
    label: "Only the model brand",
    detail: "The papers differ because one model must simply be more capable.",
  },
  {
    id: "sample-size",
    label: "Only the number of participants",
    detail: "The larger study should determine the universal conclusion.",
  },
  {
    id: "same-outcome",
    label: "Nothing important",
    detail: "Both studies test the same access pattern and the same learning outcome.",
  },
];

export const CORRECT_DIFFERENCE_ID: DifferenceId = "delivery-role";

export const READING_VERDICTS: ReadonlyArray<{ id: ReadingVerdict; label: string }> = [
  { id: "fits", label: "Fits both cards" },
  { id: "overreaches", label: "Overreaches the cards" },
];

export const PLAUSIBLE_READINGS: ReadonlyArray<{
  id: ReadingId;
  label: string;
  reading: string;
  test: string;
  correctVerdict: ReadingVerdict;
}> = [
  {
    id: "performance-is-learning",
    label: "Reading 01",
    reading: "Because assisted practice performance rose, AI access improved learning in both studies.",
    test: "Does this survive the later exam after direct access disappeared?",
    correctVerdict: "overreaches",
  },
  {
    id: "design-changes-effect",
    label: "Reading 02",
    reading: "The learning evidence changes with the role of the tool, its guardrails, and whether the outcome is measured during use or without it.",
    test: "Can this account for both the direct-access and tutor-mediated arrangements without declaring one universal effect?",
    correctVerdict: "fits",
  },
];

/**
 * These are intentionally predictions, not pre-evidence verdicts. The
 * authored evidence cards remain hidden until a learner has committed one.
 */
export const TEST_PREDICTION_OPTIONS: ReadonlyArray<{
  id: TestPredictionId;
  label: string;
  detail: string;
}> = [
  {
    id: "performance-is-learning",
    label: "The two studies will better support Reading 01.",
    detail: "I expect assisted performance to settle the question across both studies.",
  },
  {
    id: "design-changes-effect",
    label: "The two studies will better support Reading 02.",
    detail: "I expect the role of the tool and the measured outcome to matter.",
  },
];

export const BOUNDED_CLAIMS: ReadonlyArray<{ id: BoundedClaimId; label: string; note: string }> = [
  {
    id: "ai-always-helps",
    label: "AI always helps people learn.",
    note: "Keeps the original universal claim.",
  },
  {
    id: "ai-always-harms",
    label: "AI always harms people’s learning.",
    note: "Flips the universal claim without earning it.",
  },
  {
    id: "conditions-shape-outcomes",
    label: "In these studies, learning outcomes differed with how AI entered the learning process: unguarded direct answer access could weaken later unaided performance, while guarded or tutor-mediated use could improve the measured outcomes.",
    note: "Names the studied conditions, outcome boundary, and direction of evidence.",
  },
];

export const CORRECT_BOUNDED_CLAIM_ID: BoundedClaimId = "conditions-shape-outcomes";

export const COLD_TRANSFER = {
  claim: "Highlighting always improves memory",
  instruction: "Use only the two authored transfer fixtures below. Choose the claim they jointly warrant and the uncertainty that remains. They are not reviewed external research sources.",
  sources: [
    {
      id: "open-text",
      label: "Authored transfer fixture A · Open-text task",
      title: "Faster finding while the passage remained visible",
      body: "During a timed fact-finding exercise, readers allowed to highlight located named details faster than readers who could not mark the text. The passage stayed open. Delayed recall was not tested.",
    },
    {
      id: "delayed-recall",
      label: "Authored transfer fixture B · Delayed task",
      title: "A different study activity won after two days",
      body: "On a closed-book quiz two days later, retrieval practice outperformed highlight-only study. The comparison changed the study activity as well as the use of highlighting.",
    },
  ],
  choices: [
    {
      id: "always-helps",
      label: "The sources confirm that highlighting always improves memory because it made fact-finding faster.",
    },
    {
      id: "always-harms",
      label: "The sources prove that highlighting always harms memory.",
    },
    {
      id: "bounded-measures",
      label: "These sources do not warrant “always”: highlighting improved one open-text performance measure, while another study activity did better on delayed recall.",
    },
    {
      id: "same-measure",
      label: "The sources show that search speed and delayed recall are the same outcome.",
    },
  ] as ReadonlyArray<{ id: TransferChoiceId; label: string }>,
  openQuestions: [
    { id: "color-choice", label: "Which highlight color readers prefer." },
    { id: "held-constant", label: "Whether highlighting itself changes delayed recall when the study activity is held constant." },
    { id: "reader-preference", label: "Whether readers say that highlighting feels useful." },
  ] as ReadonlyArray<{ id: TransferOpenQuestionId; label: string }>,
  correctChoiceId: "bounded-measures" as TransferChoiceId,
  correctOpenQuestionId: "held-constant" as TransferOpenQuestionId,
} as const;

export const STAGE_STEPS = [
  { id: "encounter", label: "Commit" },
  { id: "compiler", label: "Readings" },
  { id: "evidence", label: "Inspect" },
  { id: "difference", label: "Contrast" },
  { id: "readings", label: "Analyze" },
  { id: "reconstruct", label: "Rebuild" },
  { id: "withdrawal", label: "Withdraw" },
  { id: "transfer", label: "Prove" },
  { id: "result", label: "Record" },
] as const;

export const ERROR_MESSAGES: Record<EvidenceLearningError, string> = {
  "invalid-transition": "That action is unavailable in the current evidence stage.",
  "stance-required": "Choose the stance you are starting with.",
  "confidence-invalid": "Confidence must be a whole number from 0 to 100.",
  "reason-too-short": "Give at least 24 characters so the starting reason is inspectable later.",
  "readings-acceptance-required": "Acknowledge both possible readings before predicting the separating evidence.",
  "test-prediction-required": "Choose the reading you predict the reviewed evidence will better support.",
  "evidence-not-reviewed": "Review both evidence cards before comparing them.",
  "difference-required": "Choose the most important structural difference.",
  "difference-mismatch": "That choice does not meet this authored evidence check. Revisit both source briefs and try again.",
  "readings-incomplete": "Test both readings against both cards.",
  "readings-mismatch": "Those verdicts do not meet this authored evidence check. Revisit both source briefs and try again.",
  "claim-required": "Choose the claim the two cards can jointly support.",
  "claim-overreaches": "That claim does not meet this authored evidence check. Revisit the studied conditions and outcomes, then try again.",
  "transfer-incomplete": "Choose one warranted claim and one still-open question before the single submission.",
};
