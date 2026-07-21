import type {
  CategoryDefinition,
  ClassificationStatement,
  EvidenceCategory,
  MysteryChoiceId,
  ReconstructionChoiceId,
  SupportLevel,
  TransferStatementId,
  WorkedStatementId,
} from "./types";

export const PRIMARY_SOURCE_WORLD_ID = "world.primary-source-reasoning" as const;
export const PRIMARY_SOURCE_WORLD_VERSION = "1.0.0" as const;
export const PRIMARY_SOURCE_CAPABILITY_ID =
  "capability.historical-literacy.observation-inference" as const;
export const PRIMARY_SOURCE_PROOF_CLAIM_ID =
  "proof.primary-source-reasoning.independent-transfer" as const;
export const PRIMARY_SOURCE_VALIDATOR_ID =
  "validator.primary-source-reasoning-transfer.v1" as const;
export const PRIMARY_SOURCE_TRANSFER_TASK_ID =
  "loc.washington-street-1937.transfer" as const;

export const PRIMARY_SOURCE_CONTENT = Object.freeze({
  title: "What can this photograph prove?",
  invitation:
    "A historical photograph carries several kinds of evidence. Your job is to keep each claim inside the boundary its source can support.",
  capabilityClaim:
    "Distinguish a visible observation, catalog metadata, an inference, and an open question in an unfamiliar primary source.",
  mystery: {
    sourceId: "loc.90706156" as const,
    imageSrc: "/worlds/primary-source-reasoning/philadelphia-street-scene-1897.jpg",
    alt:
      "A sepia stereograph card containing two near-identical views of a crowded street with horse-drawn vehicles, a streetcar, pedestrians, and storefront signs.",
    prompt: "Which claim can the photograph's pixels support on their own?",
  },
  transfer: {
    sourceId: "loc.2017716911" as const,
    imageSrc: "/worlds/primary-source-reasoning/washington-street-scene-1937.jpg",
    alt:
      "A black-and-white negative showing two children beside a fruit display, magazines, newspapers, and bottled drinks outside a shop.",
    prompt: "Classify each claim about this unfamiliar photograph.",
  },
});

export const MYSTERY_CHOICES: ReadonlyArray<{
  id: MysteryChoiceId;
  label: string;
  note: string;
}> = [
  {
    id: "visible_detail",
    label: "People, vehicles, a streetcar, and storefront signs are visible.",
    note: "A viewer can check this directly in the image.",
  },
  {
    id: "catalog_detail",
    label: "B.W. Kilburn Company made the photograph around 1897.",
    note: "This may be reliable, but ask where it comes from.",
  },
  {
    id: "purpose_claim",
    label: "The photograph was commissioned to advertise the shoe store.",
    note: "This proposes a purpose that may need more evidence.",
  },
];

export const PLAUSIBLE_READINGS = [
  {
    id: "plausible_equals_fact",
    label: "A plausible explanation becomes a fact",
    description:
      "If a story fits what is pictured, the photograph itself is enough to establish the story.",
    predicts:
      "Creator, date, and purpose can all be read directly from the scene.",
  },
  {
    id: "layered_evidence",
    label: "Each source layer supports a different claim",
    description:
      "Visible details, catalog metadata, and interpretation can all matter without becoming the same kind of evidence.",
    predicts:
      "Creator and date require the catalog record; purpose remains an inference unless another source establishes it.",
  },
] as const;

export const DISAGREEMENT_POINT = Object.freeze({
  question:
    "Can the exact creator, date, and purpose be established from the photograph's pixels alone?",
  separatingTest:
    "Compare the image with its catalog record, then classify each statement by the source layer that supports it.",
  whyItSeparates:
    "If every fitting story is a fact, the layers collapse. If claims have evidence boundaries, the image, catalog, inference, and unanswered question must remain distinct.",
});

export const CATEGORIES: ReadonlyArray<CategoryDefinition> = [
  {
    id: "observation",
    label: "Visible observation",
    shortLabel: "Observation",
    description: "Another viewer can verify it directly in the image.",
  },
  {
    id: "catalog_fact",
    label: "Catalog metadata",
    shortLabel: "Catalog",
    description: "The source record supplies it; the pixels do not.",
  },
  {
    id: "inference",
    label: "Inference",
    shortLabel: "Inference",
    description: "It interprets beyond what the image or record directly establishes.",
  },
  {
    id: "open_question",
    label: "Open question",
    shortLabel: "Open",
    description: "The available evidence cannot answer it yet.",
  },
];

export const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  observation: "Visible observation",
  catalog_fact: "Catalog metadata",
  inference: "Inference",
  open_question: "Open question",
};

export const PHILADELPHIA_CATALOG = Object.freeze({
  itemId: "90706156",
  title: "Street scene, Philadelphia, Pa.",
  creator: "B.W. Kilburn Company.",
  date: "Littleton, N.H. : Photographed and published by B.W. Kilburn, c1897.",
  medium:
    "1 photograph : print on card mount ; mount 9 x 18 cm (stereograph format)",
  summary:
    "Photograph shows a busy street with street railroad car and the Foster Shoe and Rubber Company storefront at 716 Market Street. Philadelphia. (Source: Library staff, 2021)",
  reproductionNumber: "LC-DIG-stereo-1s15239",
  rightsAdvisory: "No known restrictions on publication.",
  href: "https://www.loc.gov/pictures/item/90706156/",
});

export const WASHINGTON_CATALOG = Object.freeze({
  itemId: "2017716911",
  title: "Street scene, Washington, D.C.",
  creator: "Vachon, John, 1914-1975, photographer",
  date: "1937 Nov.",
  medium: "1 negative : nitrate ; 35 mm.",
  note: "Title and other information from caption card.",
  reproductionNumber: "LC-DIG-fsa-8a03094",
  rightsAdvisory:
    "No known restrictions. For information, see U.S. Farm Security Administration/Office of War Information Black & White Photographs",
  href: "https://www.loc.gov/pictures/item/2017716911/",
});

export const WORKED_STATEMENTS: ReadonlyArray<
  ClassificationStatement<WorkedStatementId>
> = [
  {
    id: "philadelphia-visible-detail",
    text: "Two near-identical street views contain pedestrians, wheeled vehicles, a streetcar, and storefront signs.",
    correctCategory: "observation",
  },
  {
    id: "philadelphia-catalog-fact",
    text: "The Library record identifies B.W. Kilburn Company and dates the item c1897.",
    correctCategory: "catalog_fact",
  },
  {
    id: "philadelphia-purpose-inference",
    text: "The photograph was made to celebrate commercial progress.",
    correctCategory: "inference",
  },
  {
    id: "philadelphia-open-question",
    text: "How did the people shown feel about changes on this street?",
    correctCategory: "open_question",
  },
];

export const TRANSFER_STATEMENTS: ReadonlyArray<
  ClassificationStatement<TransferStatementId>
> = [
  {
    id: "washington-visible-detail",
    text: "Two children stand beside fruit, magazines, newspapers, and bottled drinks outside a shop.",
    correctCategory: "observation",
  },
  {
    id: "washington-catalog-fact",
    text: "The Library record identifies John Vachon as photographer and November 1937 as the date.",
    correctCategory: "catalog_fact",
  },
  {
    id: "washington-relationship-inference",
    text: "The older child is responsible for caring for the younger child.",
    correctCategory: "inference",
  },
  {
    id: "washington-open-question",
    text: "Why were the children at this shop when the photograph was made?",
    correctCategory: "open_question",
  },
];

export const SUPPORT_LADDER: ReadonlyArray<{
  level: SupportLevel;
  label: string;
  text: string;
}> = [
  {
    level: 1,
    label: "Attention cue",
    text: "Could another viewer verify this from the pixels alone?",
  },
  {
    level: 2,
    label: "Representation cue",
    text: "A title, date, or creator can be trustworthy catalog metadata without being visible in the photograph.",
  },
  {
    level: 3,
    label: "Principle cue",
    text: "Observation is visible; catalog fact is recorded provenance; inference explains beyond the direct record; an open question needs more evidence.",
  },
];

export const RECONSTRUCTION_CHOICES: ReadonlyArray<{
  id: ReconstructionChoiceId;
  label: string;
}> = [
  {
    id: "image_proves_context",
    label: "A photograph proves any historical context that fits the scene.",
  },
  {
    id: "layers_bound_claims",
    label: "Each claim should be limited to what its evidence layer can establish.",
  },
  {
    id: "catalog_is_only_inference",
    label: "Catalog metadata is only an interpretation, so it should never count as evidence.",
  },
];

export const CORRECT_RECONSTRUCTION_CHOICE_ID: ReconstructionChoiceId =
  "layers_bound_claims";

export const RESULT_BOUNDARIES = Object.freeze({
  demonstrated:
    "On this unfamiliar photograph, the learner independently distinguished a visible detail, catalog metadata, an inference, and an unanswered question.",
  partial:
    "On this unfamiliar photograph, the learner distinguished some evidence layers, but the four-part boundary did not yet hold independently.",
  notDemonstrated:
    "On this unfamiliar photograph, the submitted classifications did not yet demonstrate the four-part evidence boundary.",
  notYetTested: [
    "Whether the learner can corroborate conflicting sources.",
    "Whether the learner can investigate broader context, creator purpose, or bias.",
    "Whether this distinction is retained after time has passed.",
  ],
});

export const ERROR_MESSAGES = Object.freeze({
  invalid_event_for_stage: "That action is not available in this part of the investigation.",
  invalid_initial_choice: "Choose one claim before committing.",
  invalid_confidence: "Record confidence from 0 to 100.",
  explanation_too_short: "Add at least 24 characters explaining how you decided.",
  compiler_correction_too_short:
    "If neither reading fits, add at least 16 characters to correct the interpretation.",
  catalog_must_open_first: "Open the catalog record before classifying the claims.",
  invalid_statement: "That statement does not belong to this source set.",
  invalid_category: "Choose one of the four evidence categories.",
  classification_incomplete: "Classify all four statements before checking the separation.",
  classification_mismatch:
    "The four evidence layers are not separated yet. Recheck what the pixels show, what the catalog records, and what still goes beyond both.",
  support_ceiling_reached: "All three support levels have already been shown.",
  reconstruction_too_short: "Reconstruct the rule in at least 24 characters of your own words.",
  reconstruction_mismatch: "Choose the rule that keeps each claim inside its evidence boundary.",
  transfer_incomplete: "Classify all four claims before making the one-shot submission.",
  transfer_explanation_too_short:
    "Explain your boundary in at least 24 characters before the one-shot submission.",
  transfer_already_submitted: "This transfer has already been submitted and cannot be changed.",
});
