import type { z } from "zod";

import {
  ACCESS_REQUIREMENTS,
  ENTITLEMENT_AREAS,
  GUARDIAN_VISIBLE_SUMMARIES,
  PATHWAY_ACTIONS,
  PATHWAY_AGE_BANDS,
  PATHWAY_NON_GOALS,
  PRIVATE_GUARDIAN_FIELDS,
  RIGHTS_QUALITY_TESTS,
  homeschoolPathwayArchitectureSchema,
  type HomeschoolPathwayArchitecture,
} from "./contracts";

const ALL_MINOR_ACTIONS = [...PATHWAY_ACTIONS];
const ALL_SUMMARIES = [...GUARDIAN_VISIBLE_SUMMARIES];
const ALL_PRIVATE_FIELDS = [...PRIVATE_GUARDIAN_FIELDS];

export const FORGE_HOMESCHOOL_PATHWAY_ARCHITECTURE = {
  schemaVersion: "1.0",
  id: "forge.homeschool-pathways",
  version: "0.1.0",
  status: "design-candidate",
  sources: [
    {
      id: "source.forge.product.age-bands",
      documentPath: "FORGE_PRODUCT_SPEC.md",
      section: "4. Who FORGE serves",
      role: "constraint",
      claimBoundary:
        "Age bands change authority, AI, source, persistence, and human-presence defaults; they are not readiness or worth labels.",
    },
    {
      id: "source.forge.product.constitution",
      documentPath: "FORGE_PRODUCT_SPEC.md",
      section: "5. Product constitution",
      role: "preserve",
      claimBoundary:
        "The architecture preserves broad entitlement, learner action, inspectable evidence, human roles, quiet completion, portability, and falsifiable claims.",
    },
    {
      id: "source.forge.product.guardian-rights",
      documentPath: "FORGE_PRODUCT_SPEC.md",
      section: "11. Child, guardian, and privacy contract",
      role: "constraint",
      claimBoundary:
        "Guardian authority is purpose-scoped and learner-visible and does not authorize covert access to private work or identity inference.",
    },
    {
      id: "source.forge.product.homeschool-rights",
      documentPath: "FORGE_PRODUCT_SPEC.md",
      section: "12. Homeschool and alternative-pathway rights-and-quality test",
      role: "constraint",
      claimBoundary:
        "Capability, autonomy, relationships, protection, and portability all require evidence; software alone cannot certify their adequacy.",
    },
    {
      id: "source.forge.product.accessibility",
      documentPath: "FORGE_PRODUCT_SPEC.md",
      section: "14. Accessibility and equity requirements",
      role: "preserve",
      claimBoundary:
        "Access supports remain separate from cognitive assistance and construct-changing alternatives must be disclosed.",
    },
    {
      id: "source.forge.architecture.entitlement",
      documentPath: "docs/FORGE_ARCHITECTURE.md",
      section: "5. Service/module contracts and 17. Failure modes and controls",
      role: "countermeasure",
      claimBoundary:
        "A deterministic entitlement service preserves opportunity breadth; subject evidence remains domain-specific and human-reviewable.",
    },
    {
      id: "source.forge.research.development",
      documentPath: "docs/FORGE_RESEARCH_TO_SYSTEM.md",
      section: "7. Developmental translation",
      role: "constraint",
      claimBoundary:
        "Agency and tool breadth increase with knowledge while relationships, foundations, access, and learner rights remain protected.",
    },
    {
      id: "source.forge.research.homeschool",
      documentPath: "docs/FORGE_RESEARCH_TO_SYSTEM.md",
      section: "8. Homeschool rights-and-quality translation",
      role: "countermeasure",
      claimBoundary:
        "The review packet documents evidence and limitations but cannot infer offline care, relationship quality, legal sufficiency, or home safety.",
    },
    {
      id: "source.forge.research.domain-expansion",
      documentPath: "docs/FORGE_RESEARCH_TO_SYSTEM.md",
      section: "9. Domain expansion rules",
      role: "constraint",
      claimBoundary:
        "Each subject needs its own representation and evidence theory; mechanics evidence cannot be generalized across subjects.",
    },
    {
      id: "source.forge.delivery.pathway",
      documentPath: "docs/FORGE_DELIVERY_GATES.md",
      section: "15.3 Homeschool/microschool rights-and-quality use",
      role: "constraint",
      claimBoundary:
        "At the current gate the strongest pathway outcome is evidence complete for independent review, never safety, legal, quality, or efficacy certification.",
    },
  ],
  ageBandPolicies: [
    {
      id: "policy.age.early-childhood",
      ageBand: "early-childhood-3-6",
      relationshipMode: "adult-facing-shared-activity",
      aiBoundary: "no-independent-ai",
      sourceAccess: "none",
      adultPresenceRequired: true,
      guardianConsentPurposes: ALL_MINOR_ACTIONS,
      learnerAssentPurposes: ALL_MINOR_ACTIONS,
      guardianVisibleSummaries: ALL_SUMMARIES,
      privateByDefault: ALL_PRIVATE_FIELDS,
      agencyPromise:
        "The child can participate, choose between bounded activities or representations, ask for help, pause, and stop while a responsible adult remains present.",
      sourceRefs: ["source.forge.product.age-bands", "source.forge.research.development"],
    },
    {
      id: "policy.age.foundation",
      ageBand: "foundation-7-9",
      relationshipMode: "guardian-managed-with-learner-assent",
      aiBoundary: "authored-worlds-ai-behind-interface",
      sourceAccess: "curated-only",
      adultPresenceRequired: false,
      guardianConsentPurposes: ALL_MINOR_ACTIONS,
      learnerAssentPurposes: ALL_MINOR_ACTIONS,
      guardianVisibleSummaries: ALL_SUMMARIES,
      privateByDefault: ALL_PRIVATE_FIELDS,
      agencyPromise:
        "The learner chooses within closed authored opportunities, can inspect persisted evidence in age-appropriate language, and can ask for an alternative or stop.",
      sourceRefs: ["source.forge.product.age-bands", "source.forge.product.guardian-rights"],
    },
    {
      id: "policy.age.upper-primary",
      ageBand: "upper-primary-10-12",
      relationshipMode: "learner-owned-with-bounded-guardian-authority",
      aiBoundary: "curated-bounded-ai",
      sourceAccess: "curated-only",
      adultPresenceRequired: false,
      guardianConsentPurposes: ALL_MINOR_ACTIONS,
      learnerAssentPurposes: ALL_MINOR_ACTIONS,
      guardianVisibleSummaries: ALL_SUMMARIES,
      privateByDefault: ALL_PRIVATE_FIELDS,
      agencyPromise:
        "The learner can own bounded questions and projects, inspect and contest evidence, and choose accessible representations without private drafts becoming guardian surveillance.",
      sourceRefs: ["source.forge.product.age-bands", "source.forge.product.guardian-rights"],
    },
    {
      id: "policy.age.middle-secondary",
      ageBand: "middle-secondary-13-15",
      relationshipMode: "learner-owned-with-bounded-guardian-authority",
      aiBoundary: "guardrailed-research-and-creation",
      sourceAccess: "risk-gated",
      adultPresenceRequired: false,
      guardianConsentPurposes: ALL_MINOR_ACTIONS,
      learnerAssentPurposes: ALL_MINOR_ACTIONS,
      guardianVisibleSummaries: ALL_SUMMARIES,
      privateByDefault: ALL_PRIVATE_FIELDS,
      agencyPromise:
        "The learner owns inquiry and creation choices, receives explicit tool boundaries, and gains privacy while external sharing, contact, and retention remain purpose-gated.",
      sourceRefs: ["source.forge.product.age-bands", "source.forge.product.guardian-rights"],
    },
    {
      id: "policy.age.upper-secondary",
      ageBand: "upper-secondary-16-17",
      relationshipMode: "learner-owned-with-bounded-guardian-authority",
      aiBoundary: "wider-disclosed-tools",
      sourceAccess: "risk-gated",
      adultPresenceRequired: false,
      guardianConsentPurposes: ALL_MINOR_ACTIONS,
      learnerAssentPurposes: ALL_MINOR_ACTIONS,
      guardianVisibleSummaries: ALL_SUMMARIES,
      privateByDefault: ALL_PRIVATE_FIELDS,
      agencyPromise:
        "The learner selects declared tool modes and controls sharing to the extent law permits; guardian authority cannot erase learner rights, evidence corrections, or future options.",
      sourceRefs: ["source.forge.product.age-bands", "source.forge.product.guardian-rights"],
    },
    {
      id: "policy.age.adult",
      ageBand: "adult-18-plus",
      relationshipMode: "learner-primary-authority",
      aiBoundary: "learner-selected-declared-mode",
      sourceAccess: "learner-governed",
      adultPresenceRequired: false,
      guardianConsentPurposes: [],
      learnerAssentPurposes: [],
      guardianVisibleSummaries: [],
      privateByDefault: ALL_PRIVATE_FIELDS,
      agencyPromise:
        "The learner is the primary authority for objectives, tools, evidence, retention, and purpose-bound sharing while subject and professional standards remain explicit.",
      sourceRefs: ["source.forge.product.age-bands", "source.forge.research.development"],
    },
  ],
  entitlements: [
    {
      id: "entitlement.communication-literacy",
      area: "communication-and-literacy",
      title: "Communication and literacy",
      subjectExamples: ["spoken and signed language", "reading", "writing", "rhetoric", "multilingual communication"],
      entitlementPromise:
        "Keep opportunities to understand and produce meaning across age-appropriate languages, genres, audiences, and representations visible rather than personalizing them away.",
      evidenceTheory:
        "Use identified texts, observable performances, external samples, revision traces, and qualified review; grammar or model fluency alone cannot establish communication capability.",
      allowedEvidenceAuthorities: ["identified-source", "external-benchmark", "qualified-human-review", "learner-reflection"],
      softwareCannotEstablish:
        "Software cannot by itself certify durable literacy, rhetorical judgment, cultural legitimacy, or equitable multilingual evaluation.",
      sourceRefs: ["source.forge.product.constitution", "source.forge.research.domain-expansion"],
    },
    {
      id: "entitlement.mathematics-numeracy",
      area: "mathematics-and-numeracy",
      title: "Mathematics and numeracy",
      subjectExamples: ["number", "quantity", "geometry", "data", "mathematical modelling"],
      entitlementPromise:
        "Preserve opportunities to build, apply, explain, and revisit mathematical ideas across representations and practical contexts.",
      evidenceTheory:
        "Combine deterministic or symbolic validation with explanation, varied application, delayed sampling, and externally reviewed benchmarks where portability matters.",
      allowedEvidenceAuthorities: ["deterministic-validator", "external-benchmark", "qualified-human-review", "learner-reflection"],
      softwareCannotEstablish:
        "Correct answers in one interface cannot establish broad numeracy, transfer, retention, or readiness for a regulated pathway.",
      sourceRefs: ["source.forge.product.constitution", "source.forge.research.domain-expansion"],
    },
    {
      id: "entitlement.science-environment",
      area: "science-and-environment",
      title: "Science and environment",
      subjectExamples: ["physical science", "life science", "earth and environmental science", "observation and experiment"],
      entitlementPromise:
        "Preserve opportunities to learn established models, inspect sources, make predictions, observe the world, and distinguish evidence from inference.",
      evidenceTheory:
        "Use declared deterministic models where valid, identified sources, physical observations, external tasks, and domain review with assumptions and uncertainty attached.",
      allowedEvidenceAuthorities: [
        "deterministic-validator",
        "identified-source",
        "physical-observation",
        "external-benchmark",
        "qualified-human-review",
      ],
      softwareCannotEstablish:
        "A generated explanation or simulated result cannot certify experimental skill, source accuracy, field safety, or cross-domain science capability.",
      sourceRefs: ["source.forge.product.constitution", "source.forge.research.domain-expansion"],
    },
    {
      id: "entitlement.humanities-civics",
      area: "humanities-and-civic-understanding",
      title: "Humanities and civic understanding",
      subjectExamples: ["history", "geography", "civics", "philosophy", "religious and cultural studies"],
      entitlementPromise:
        "Keep chronological, geographic, civic, ethical, and plural interpretive opportunities visible, including age-appropriate encounters with disagreement.",
      evidenceTheory:
        "Use source criticism, chronology, competing interpretations, argument, and accountable human review; contested claims remain contested.",
      allowedEvidenceAuthorities: ["identified-source", "external-benchmark", "qualified-human-review", "learner-reflection"],
      softwareCannotEstablish:
        "Software cannot declare one generated narrative historically true, politically neutral, or legally sufficient civic preparation.",
      sourceRefs: ["source.forge.product.constitution", "source.forge.research.domain-expansion"],
    },
    {
      id: "entitlement.health-safeguarding",
      area: "health-and-safeguarding",
      title: "Health and safeguarding",
      subjectExamples: ["health knowledge", "safety", "relationships", "help-seeking", "emergency procedures"],
      entitlementPromise:
        "Preserve age-appropriate health, safety, body autonomy, relationship, and help-seeking opportunities with usable human routes.",
      evidenceTheory:
        "Use reviewed sources, observed practice where safe, qualified human judgment, and learner-understood procedures; sensitive conclusions remain outside automated scoring.",
      allowedEvidenceAuthorities: ["identified-source", "physical-observation", "qualified-human-review", "learner-reflection"],
      softwareCannotEstablish:
        "Software cannot diagnose, investigate abuse, certify home safety, replace emergency services, or determine legal compliance.",
      sourceRefs: ["source.forge.product.homeschool-rights", "source.forge.research.homeschool"],
    },
    {
      id: "entitlement.computing-ai-literacy",
      area: "computing-and-ai-literacy",
      title: "Computing and AI literacy",
      subjectExamples: ["computing systems", "programming", "data", "AI use and verification", "digital rights"],
      entitlementPromise:
        "Preserve opportunities to understand computation, create and test systems, judge AI output, protect data, and use tools with disclosed responsibility.",
      evidenceTheory:
        "Use sandboxed execution, tests, traces, identified sources, code or artifact review, and independent defence rather than generated output quality alone.",
      allowedEvidenceAuthorities: ["deterministic-validator", "identified-source", "external-benchmark", "qualified-human-review"],
      softwareCannotEstablish:
        "A polished artifact cannot establish authorship, verification judgment, safe tool use, or independent fallback capability.",
      sourceRefs: ["source.forge.product.constitution", "source.forge.research.domain-expansion"],
    },
    {
      id: "entitlement.arts-culture",
      area: "arts-and-culture",
      title: "Arts and culture",
      subjectExamples: ["visual art", "music", "drama", "dance", "literature and cultural participation"],
      entitlementPromise:
        "Keep opportunities for encounter, practice, technique, interpretation, creation, performance, critique, and cultural participation visible.",
      evidenceTheory:
        "Use process, craft, performance, context, critique, revision, and learner defence; no universal correctness or aesthetic score is implied.",
      allowedEvidenceAuthorities: ["identified-source", "physical-observation", "qualified-human-review", "learner-reflection"],
      softwareCannotEstablish:
        "Software cannot reduce artistic capability, cultural worth, originality, or participation quality to one generated score.",
      sourceRefs: ["source.forge.product.constitution", "source.forge.research.domain-expansion"],
    },
    {
      id: "entitlement.physical-development",
      area: "physical-development",
      title: "Physical development",
      subjectExamples: ["movement", "sport", "outdoor activity", "motor development", "physical wellbeing"],
      entitlementPromise:
        "Preserve accessible opportunities for movement, physical competence, play, challenge, teamwork, and safe participation beyond the screen.",
      evidenceTheory:
        "Use consented physical observation, qualified supervision, accessible participation, and external standards only where appropriate and safe.",
      allowedEvidenceAuthorities: ["physical-observation", "external-benchmark", "qualified-human-review", "learner-reflection"],
      softwareCannotEstablish:
        "Attendance or device telemetry cannot establish physical competence, wellbeing, relationship quality, or safe provision.",
      sourceRefs: ["source.forge.product.constitution", "source.forge.product.accessibility"],
    },
    {
      id: "entitlement.practical-making",
      area: "practical-life-and-making",
      title: "Practical life and making",
      subjectExamples: ["craft", "design", "food", "care", "financial capability", "tools and maintenance"],
      entitlementPromise:
        "Preserve age-appropriate opportunities to plan, make, care, repair, test, and contribute under real constraints with accessible alternatives.",
      evidenceTheory:
        "Use process records, safe physical observation, tests, external standards, and qualified review; regulated or hazardous practice remains human-supervised.",
      allowedEvidenceAuthorities: [
        "deterministic-validator",
        "physical-observation",
        "external-benchmark",
        "qualified-human-review",
        "learner-reflection",
      ],
      softwareCannotEstablish:
        "Screen traces cannot certify safe practice, professional competence, care quality, licensure, or equitable access to materials and supervision.",
      sourceRefs: ["source.forge.product.homeschool-rights", "source.forge.research.domain-expansion"],
    },
  ],
  rightsQualityTests: [
    {
      id: "capability",
      title: "Capability",
      criteria: [
        {
          id: "criterion.capability.broad-entitlement",
          description: "All entitlement areas remain visible with age-appropriate opportunities and no silent interest-only narrowing.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.capability.external-foundation-benchmarks",
          description: "External literacy, writing, and mathematics samples or benchmarks are present with conditions and limitations.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.capability.domain-samples",
          description: "Domain competence is sampled through the evidence authority appropriate to each subject.",
          requiresHumanJudgment: true,
        },
      ],
      softwareCannotEstablish: "Coverage records cannot prove teaching quality, broad competence, retention, or learning efficacy.",
      sourceRefs: ["source.forge.product.homeschool-rights", "source.forge.research.homeschool"],
    },
    {
      id: "autonomy",
      title: "Autonomy",
      criteria: [
        {
          id: "criterion.autonomy.learner-led-review",
          description: "The learner's position, choices, refusals, alternatives, and questions are visible in a review they can understand.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.autonomy.external-adviser",
          description: "A purpose-bound adviser or review path exists outside a single parent, founder, or platform perspective.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.autonomy.contest-and-transition",
          description: "The learner can contest evidence and see school re-entry, further study, apprenticeship, or other future options.",
          requiresHumanJudgment: true,
        },
      ],
      softwareCannotEstablish: "Interface choice cannot prove freedom from offline coercion or that future options are substantively open.",
      sourceRefs: ["source.forge.product.guardian-rights", "source.forge.research.homeschool"],
    },
    {
      id: "relationships",
      title: "Relationships",
      criteria: [
        {
          id: "criterion.relationships.stable-peers-and-adults",
          description: "Stable peer and trusted-adult relationships are documented without converting contact counts into quality claims.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.relationships.specialists-and-difference",
          description: "Qualified specialists and collaboration across difference are planned with access and safeguarding boundaries.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.relationships.arts-sport-community",
          description: "Arts, sport, practical, and community participation remain available with accessible alternatives.",
          requiresHumanJudgment: true,
        },
      ],
      softwareCannotEstablish: "Scheduling and attendance cannot prove belonging, emotional safety, relationship quality, or adequate human care.",
      sourceRefs: ["source.forge.product.homeschool-rights", "source.forge.research.homeschool"],
    },
    {
      id: "protection",
      title: "Protection",
      criteria: [
        {
          id: "criterion.protection.safeguarding-and-complaints",
          description: "Named safeguarding and complaints routes are understandable, reachable, independently reviewable, and not controlled by AI.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.protection.access-health-emergency",
          description: "Disability access, health, and emergency procedures are documented with qualified local ownership.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.protection.privacy-and-reintegration",
          description: "Privacy, consent, incident, and reintegration procedures are visible to the learner and tested outside the evidence graph.",
          requiresHumanJudgment: true,
        },
      ],
      softwareCannotEstablish: "A completed checklist cannot certify legal compliance, home safety, safeguarding adequacy, or emergency readiness.",
      sourceRefs: ["source.forge.product.guardian-rights", "source.forge.product.homeschool-rights"],
    },
    {
      id: "portability",
      title: "Portability",
      criteria: [
        {
          id: "criterion.portability.moderated-samples",
          description: "Moderated samples include conditions, assistance, sources, versions, uncertainty, and correction paths.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.portability.defence-and-benchmarks",
          description: "External benchmarks and oral or practical defence sample individual capability without treating one result as identity.",
          requiresHumanJudgment: true,
        },
        {
          id: "criterion.portability.transition-plan",
          description: "Recognized prerequisites and a named re-entry, examination, further-study, apprenticeship, licensure, or work transition are mapped.",
          requiresHumanJudgment: true,
        },
      ],
      softwareCannotEstablish: "An export cannot guarantee recognition, credit transfer, admission, employment, licensure, or credential validity.",
      sourceRefs: ["source.forge.product.homeschool-rights", "source.forge.delivery.pathway"],
    },
  ],
  accessRequirements: [...ACCESS_REQUIREMENTS],
  nonGoals: [...PATHWAY_NON_GOALS],
  claimBoundary: {
    currentClaimLevel: "C0",
    permittedOutcome: "evidence-complete-for-independent-review",
    certifiesLearningEfficacy: false,
    certifiesSafetyOrLegalCompliance: false,
    certifiesHomeschoolQuality: false,
  },
} satisfies HomeschoolPathwayArchitecture;

export const PATHWAY_ARCHITECTURE_INVARIANT_CODES = [
  "schema.invalid",
  "age-band.missing",
  "age-band.duplicate",
  "entitlement.missing",
  "entitlement.duplicate",
  "rights-test.missing",
  "access-requirement.missing",
  "non-goal.missing",
  "source.reference-missing",
  "criterion.duplicate",
  "early-childhood.ai-boundary-invalid",
  "age-band.source-boundary-invalid",
  "minor.guardian-boundary-invalid",
  "guardian.private-boundary-invalid",
  "adult.guardian-boundary-invalid",
] as const;

export type PathwayArchitectureInvariantCode = (typeof PATHWAY_ARCHITECTURE_INVARIANT_CODES)[number];

export interface PathwayArchitectureIssue {
  readonly code: PathwayArchitectureInvariantCode;
  readonly path: string;
  readonly message: string;
}

export type PathwayArchitectureValidation =
  | { readonly ok: true; readonly value: HomeschoolPathwayArchitecture }
  | { readonly ok: false; readonly issues: readonly PathwayArchitectureIssue[] };

function schemaIssues(error: z.ZodError): readonly PathwayArchitectureIssue[] {
  return error.issues.map((issue) => ({
    code: "schema.invalid",
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function missingValues<T extends string>(required: readonly T[], actual: readonly T[]): readonly T[] {
  const actualValues = new Set(actual);
  return required.filter((value) => !actualValues.has(value));
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function validateInvariants(architecture: HomeschoolPathwayArchitecture): readonly PathwayArchitectureIssue[] {
  const issues: PathwayArchitectureIssue[] = [];
  const sourceIds = new Set(architecture.sources.map((source) => source.id));

  for (const ageBand of missingValues(
    PATHWAY_AGE_BANDS,
    architecture.ageBandPolicies.map((policy) => policy.ageBand),
  )) {
    issues.push({ code: "age-band.missing", path: "ageBandPolicies", message: `Missing age-band policy: ${ageBand}.` });
  }
  for (const ageBand of duplicateValues(architecture.ageBandPolicies.map((policy) => policy.ageBand))) {
    issues.push({
      code: "age-band.duplicate",
      path: "ageBandPolicies",
      message: `Age band ${ageBand} must have exactly one authority policy.`,
    });
  }

  for (const area of missingValues(
    ENTITLEMENT_AREAS,
    architecture.entitlements.map((entitlement) => entitlement.area),
  )) {
    issues.push({ code: "entitlement.missing", path: "entitlements", message: `Missing entitlement area: ${area}.` });
  }
  for (const area of duplicateValues(architecture.entitlements.map((entitlement) => entitlement.area))) {
    issues.push({
      code: "entitlement.duplicate",
      path: "entitlements",
      message: `Entitlement area ${area} must have exactly one definition.`,
    });
  }

  for (const testId of missingValues(
    RIGHTS_QUALITY_TESTS,
    architecture.rightsQualityTests.map((test) => test.id),
  )) {
    issues.push({ code: "rights-test.missing", path: "rightsQualityTests", message: `Missing rights-and-quality test: ${testId}.` });
  }

  for (const accessRequirement of missingValues(ACCESS_REQUIREMENTS, architecture.accessRequirements)) {
    issues.push({
      code: "access-requirement.missing",
      path: "accessRequirements",
      message: `Missing access requirement: ${accessRequirement}.`,
    });
  }

  for (const nonGoal of missingValues(PATHWAY_NON_GOALS, architecture.nonGoals)) {
    issues.push({ code: "non-goal.missing", path: "nonGoals", message: `Missing non-goal: ${nonGoal}.` });
  }

  const referenced = [
    ...architecture.ageBandPolicies.flatMap((policy) => policy.sourceRefs.map((sourceRef) => ({ sourceRef, path: `ageBandPolicies.${policy.id}.sourceRefs` }))),
    ...architecture.entitlements.flatMap((entitlement) =>
      entitlement.sourceRefs.map((sourceRef) => ({ sourceRef, path: `entitlements.${entitlement.id}.sourceRefs` })),
    ),
    ...architecture.rightsQualityTests.flatMap((test) =>
      test.sourceRefs.map((sourceRef) => ({ sourceRef, path: `rightsQualityTests.${test.id}.sourceRefs` })),
    ),
  ];

  for (const reference of referenced) {
    if (!sourceIds.has(reference.sourceRef)) {
      issues.push({
        code: "source.reference-missing",
        path: reference.path,
        message: `Unknown source reference: ${reference.sourceRef}.`,
      });
    }
  }

  const criterionIds = new Set<string>();
  for (const test of architecture.rightsQualityTests) {
    for (const criterion of test.criteria) {
      if (criterionIds.has(criterion.id)) {
        issues.push({
          code: "criterion.duplicate",
          path: `rightsQualityTests.${test.id}.criteria`,
          message: `Criterion ${criterion.id} appears in more than one rights-and-quality test.`,
        });
      }
      criterionIds.add(criterion.id);
    }
  }

  const earlyChildhood = architecture.ageBandPolicies.find((policy) => policy.ageBand === "early-childhood-3-6");
  if (earlyChildhood && (earlyChildhood.aiBoundary !== "no-independent-ai" || !earlyChildhood.adultPresenceRequired)) {
    issues.push({
      code: "early-childhood.ai-boundary-invalid",
      path: `ageBandPolicies.${earlyChildhood.id}`,
      message: "Early-childhood policy requires adult presence and no independent AI relationship.",
    });
  }

  const expectedSourceAccess = new Map([
    ["early-childhood-3-6", "none"],
    ["foundation-7-9", "curated-only"],
    ["upper-primary-10-12", "curated-only"],
    ["middle-secondary-13-15", "risk-gated"],
    ["upper-secondary-16-17", "risk-gated"],
    ["adult-18-plus", "learner-governed"],
  ] as const);

  for (const policy of architecture.ageBandPolicies) {
    if (policy.sourceAccess !== expectedSourceAccess.get(policy.ageBand)) {
      issues.push({
        code: "age-band.source-boundary-invalid",
        path: `ageBandPolicies.${policy.id}.sourceAccess`,
        message: `Age band ${policy.ageBand} has an invalid source-access boundary.`,
      });
    }

    if (missingValues(PRIVATE_GUARDIAN_FIELDS, policy.privateByDefault).length > 0) {
      issues.push({
        code: "guardian.private-boundary-invalid",
        path: `ageBandPolicies.${policy.id}.privateByDefault`,
        message: `Age band ${policy.ageBand} must preserve every protected private field.`,
      });
    }

    if (policy.ageBand !== "adult-18-plus") {
      const missingConsent = missingValues(PATHWAY_ACTIONS, policy.guardianConsentPurposes);
      const missingAssent = missingValues(PATHWAY_ACTIONS, policy.learnerAssentPurposes);
      const missingSummaries = missingValues(GUARDIAN_VISIBLE_SUMMARIES, policy.guardianVisibleSummaries);
      if (missingConsent.length > 0 || missingAssent.length > 0 || missingSummaries.length > 0) {
        issues.push({
          code: "minor.guardian-boundary-invalid",
          path: `ageBandPolicies.${policy.id}`,
          message: `Minor age band ${policy.ageBand} must retain all purpose-specific consent, assent, and learner-visible guardian-summary boundaries.`,
        });
      }
    }
  }

  const adult = architecture.ageBandPolicies.find((policy) => policy.ageBand === "adult-18-plus");
  if (
    adult &&
    (adult.relationshipMode !== "learner-primary-authority" ||
      adult.guardianConsentPurposes.length > 0 ||
      adult.learnerAssentPurposes.length > 0 ||
      adult.guardianVisibleSummaries.length > 0)
  ) {
    issues.push({
      code: "adult.guardian-boundary-invalid",
      path: `ageBandPolicies.${adult.id}`,
      message: "Adults are the primary authority and cannot be assigned guardian consent purposes.",
    });
  }

  return issues;
}

export function validateHomeschoolPathwayArchitecture(candidate: unknown): PathwayArchitectureValidation {
  const parsed = homeschoolPathwayArchitectureSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, issues: schemaIssues(parsed.error) };

  const issues = validateInvariants(parsed.data);
  return issues.length === 0 ? { ok: true, value: parsed.data } : { ok: false, issues };
}
