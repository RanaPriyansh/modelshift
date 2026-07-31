import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_RESEARCH_EXPOSURE_TASKS,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
} from "../university-research-operations/contracts";
import {
  AUTHORED_UNIVERSITY_RESEARCH_PACK_P,
  AUTHORED_UNIVERSITY_RESEARCH_PACK_Q,
  UNIVERSITY_RESEARCH_ARTIFACT_INFORMATION_ITEMS,
  UNIVERSITY_RESEARCH_NEUTRAL_NAVIGATION_ITEMS,
  authoredUniversityResearchArtifactPreflightRequest,
} from "./authored";
import type { UniversityResearchScenarioPackV1 } from "./contracts";

export const UNIVERSITY_RESEARCH_SURFACE_PACKET_SCHEMA_VERSION =
  "university-research-surface-packet.v1" as const;

const SURFACE_PACKET_DIGEST_DOMAIN =
  "forge.university-research.surface-packet.v1";
const EXPECTED_NODE_KINDS = Object.freeze([
  "heading",
  "anchor_navigation",
  "fact_table",
  "choice_list",
  "next_job",
  "effect_boundary",
  "task_prompt",
  "terminal_note",
] as const);

export type UniversityResearchSurfacePackId = "pack-p" | "pack-q";

export type UniversityResearchSurfaceToken = Readonly<{
  kind: "text" | "identifier" | "timestamp";
  value: string;
}>;

export type UniversityResearchSurfaceFact = Readonly<{
  itemId: string;
  label: string;
  tokens: readonly UniversityResearchSurfaceToken[];
}>;

export type UniversityResearchSurfaceScenario = Readonly<{
  ordinal: number;
  scenarioId: (typeof UNIVERSITY_RESEARCH_SCENARIO_IDS)[number];
  scenarioRef: string;
  candidateStateLabel: string;
  regionId: string;
  effectBoundaryId: string;
  factsHeading: string;
  facts: readonly UniversityResearchSurfaceFact[];
  choicesHeading: string;
  choices: readonly {
    choiceId: string;
    label: string;
    owner: string;
  }[];
  nextJobHeading: string;
  nextJob: Readonly<{
    kind: string;
    owner: string;
    primaryControl: Readonly<{
      kind: "local_anchor_navigation" | "no_control";
      label: string | null;
      effect: "navigate_to_local_synthetic_detail" | "remain_in_place";
      targetId: string | null;
    }>;
  }>;
  effectsHeading: string;
  effects: readonly {
    label: string;
    value: "Yes" | "No";
  }[];
  tasksHeading: string;
  tasks: readonly string[];
  terminalHeading: string;
  terminal: readonly {
    label: string;
    value: string;
  }[];
  visibleCharacterCount: number;
}>;

export type UniversityResearchSurfacePacketV1 = Readonly<{
  schemaVersion: typeof UNIVERSITY_RESEARCH_SURFACE_PACKET_SCHEMA_VERSION;
  packId: UniversityResearchSurfacePackId;
  packDigest: string;
  artifactVersion: string;
  rendererId: string;
  rendererBindingDigest: string;
  packetDigest: string;
  title: string;
  navigationHeading: string;
  navigationItems: readonly {
    scenarioId: (typeof UNIVERSITY_RESEARCH_SCENARIO_IDS)[number];
    label: string;
    inputId: string;
    regionId: string;
  }[];
  scenarios: readonly UniversityResearchSurfaceScenario[];
  maximumVisibleCharactersPerScenario: number;
}>;

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function yesNo(value: boolean): "Yes" | "No" {
  return value ? "Yes" : "No";
}

function text(value: string): UniversityResearchSurfaceToken {
  return { kind: "text", value };
}

function identifier(value: string): UniversityResearchSurfaceToken {
  return { kind: "identifier", value };
}

function timestamp(value: string): UniversityResearchSurfaceToken {
  return { kind: "timestamp", value };
}

function visibleText(tokens: readonly UniversityResearchSurfaceToken[]): string {
  return tokens.map((token) => token.value).join("");
}

function packFor(
  packId: unknown,
): UniversityResearchScenarioPackV1 {
  if (packId === "pack-p") return AUTHORED_UNIVERSITY_RESEARCH_PACK_P;
  if (packId === "pack-q") return AUTHORED_UNIVERSITY_RESEARCH_PACK_Q;
  throw new Error("The requested authored research pack is unavailable.");
}

function factsFor(
  scenario: UniversityResearchScenarioPackV1["scenarios"][number],
): readonly UniversityResearchSurfaceFact[] {
  const labels = UNIVERSITY_RESEARCH_ARTIFACT_INFORMATION_ITEMS;
  return [
    {
      itemId: labels[0].itemId,
      label: labels[0].label,
      tokens: [
        text(`${scenario.context.termLabel} / ${scenario.context.courseLabel} (`),
        identifier(scenario.context.termRef),
        text(" / "),
        identifier(scenario.context.courseRef),
        text(")"),
      ],
    },
    {
      itemId: labels[1].itemId,
      label: labels[1].label,
      tokens: [
        identifier(scenario.context.sourceRef),
        text(
          `; ${readable(scenario.source.state)}; ${readable(scenario.source.freshness)}; unresolved conflicts ${scenario.source.conflictCount}; institutional completeness ${readable(scenario.source.institutionalCompleteness)}; synthetic copied fact, not university truth`,
        ),
      ],
    },
    {
      itemId: labels[2].itemId,
      label: labels[2].label,
      tokens: [
        text(`${scenario.deadline.title}; `),
        timestamp(scenario.deadline.at),
        text(
          `; ${scenario.deadline.relativeMinutes} minutes after the reference time; verified university truth: ${yesNo(scenario.deadline.universityTruth)}`,
        ),
      ],
    },
    {
      itemId: labels[3].itemId,
      label: labels[3].label,
      tokens: [
        text(
          `${scenario.capacity.availableMinutes} minutes available; ${scenario.capacity.effortMinutesLow} to ${scenario.capacity.effortMinutesHigh} minutes fixture-authored effort; ${readable(scenario.capacity.relation)}; declared by learner fixture`,
        ),
      ],
    },
    {
      itemId: labels[4].itemId,
      label: labels[4].label,
      tokens: [
        text(`${scenario.path.actionTitle}; `),
        identifier(scenario.path.pathRef),
        text(" / "),
        identifier(scenario.path.actionRef),
        text(
          `; ${readable(scenario.path.state)}; learner-owned; selected by copied-source facts: ${yesNo(scenario.path.selectedBySourceFacts)}`,
        ),
      ],
    },
    {
      itemId: labels[5].itemId,
      label: labels[5].label,
      tokens: [
        text("Accepted "),
        identifier(scenario.world.acceptedWorldRef),
        text("; supplied "),
        identifier(scenario.world.suppliedWorldRef),
        text(
          `; ${readable(scenario.world.state)}; similar substitution allowed: ${yesNo(scenario.world.similarWorldSubstitutionAllowed)}`,
        ),
      ],
    },
    {
      itemId: labels[6].itemId,
      label: labels[6].label,
      tokens: [
        text(
          `${readable(scenario.terminal.state)}; course completion claimed: ${yesNo(scenario.terminal.courseCompleteClaimed)}; learner status claimed: ${yesNo(scenario.terminal.learnerStatusClaimed)}; semester completion claimed: ${yesNo(scenario.terminal.semesterCompleteClaimed)}`,
        ),
      ],
    },
  ];
}

function scenarioFor(
  scenario: UniversityResearchScenarioPackV1["scenarios"][number],
  ordinal: number,
  headings: Readonly<{
    facts: string;
    choices: string;
    nextJob: string;
    effects: string;
    tasks: string;
    terminal: string;
  }>,
  maximumVisibleCharactersPerScenario: number,
  title: string,
  navigationHeading: string,
): UniversityResearchSurfaceScenario {
  const regionId = `research-example-${ordinal}-content`;
  const effectBoundaryId = `research-example-${ordinal}-effect-boundary`;
  const facts = factsFor(scenario);
  const effects = [
    { label: "Navigation only", value: yesNo(scenario.effects.navigationOnly) },
    { label: "Saves", value: yesNo(scenario.effects.saves) },
    { label: "Sends", value: yesNo(scenario.effects.sends) },
    { label: "Starts a session", value: yesNo(scenario.effects.startsSession) },
    { label: "Submits", value: yesNo(scenario.effects.submits) },
    { label: "Records", value: yesNo(scenario.effects.records) },
    { label: "Creates evidence", value: yesNo(scenario.effects.createsEvidence) },
    { label: "Changes the path", value: yesNo(scenario.effects.changesPath) },
    { label: "External effect", value: yesNo(scenario.effects.externalEffect) },
    {
      label: "Institutional action",
      value: yesNo(scenario.effects.institutionalAction),
    },
  ] as const;
  const terminal = [
    { label: "Action state", value: readable(scenario.terminal.state) },
    {
      label: "Course completion claimed",
      value: yesNo(scenario.terminal.courseCompleteClaimed),
    },
    {
      label: "Learner status claimed",
      value: yesNo(scenario.terminal.learnerStatusClaimed),
    },
    {
      label: "Semester completion claimed",
      value: yesNo(scenario.terminal.semesterCompleteClaimed),
    },
  ] as const;
  const primaryControl = {
    ...scenario.nextJob.primaryControl,
    targetId:
      scenario.nextJob.primaryControl.effect
          === "navigate_to_local_synthetic_detail"
        ? effectBoundaryId
        : null,
  };
  const choices = scenario.choices.map((choice) => ({
    choiceId: choice.choiceId,
    label: choice.label,
    owner: readable(choice.owner),
  }));
  const visibleParts = [
    title,
    navigationHeading,
    ...UNIVERSITY_RESEARCH_NEUTRAL_NAVIGATION_ITEMS.map((item) => item.label),
    headings.facts,
    ...facts.flatMap((fact) => [fact.label, visibleText(fact.tokens)]),
    headings.choices,
    ...choices.flatMap((choice) => [choice.label, choice.owner]),
    headings.nextJob,
    readable(scenario.nextJob.kind),
    readable(scenario.nextJob.owner),
    primaryControl.label ?? "No local control for this example.",
    readable(primaryControl.effect),
    headings.effects,
    ...effects.flatMap((effect) => [effect.label, effect.value]),
    headings.tasks,
    ...UNIVERSITY_RESEARCH_EXPOSURE_TASKS,
    headings.terminal,
    ...terminal.flatMap((entry) => [entry.label, entry.value]),
  ];
  const visibleCharacterCount = visibleParts.join("\n").length;
  if (visibleCharacterCount > maximumVisibleCharactersPerScenario) {
    throw new Error(
      `Research example ${ordinal} has ${visibleCharacterCount} visible characters, above the ${maximumVisibleCharactersPerScenario} boundary.`,
    );
  }

  return {
    ordinal,
    scenarioId: scenario.scenarioId,
    scenarioRef: scenario.scenarioRef,
    candidateStateLabel: readable(scenario.expectedStatus),
    regionId,
    effectBoundaryId,
    factsHeading: headings.facts,
    facts,
    choicesHeading: headings.choices,
    choices,
    nextJobHeading: headings.nextJob,
    nextJob: {
      kind: readable(scenario.nextJob.kind),
      owner: readable(scenario.nextJob.owner),
      primaryControl,
    },
    effectsHeading: headings.effects,
    effects,
    tasksHeading: headings.tasks,
    tasks: [...UNIVERSITY_RESEARCH_EXPOSURE_TASKS],
    terminalHeading: headings.terminal,
    terminal,
    visibleCharacterCount,
  };
}

export async function compileUniversityResearchSurfacePacket(
  packId: unknown,
): Promise<Readonly<UniversityResearchSurfacePacketV1>> {
  const authored = await authoredUniversityResearchArtifactPreflightRequest();
  const pack = packFor(packId);
  const nodeKinds = authored.substitute.surface.nodes.map((node) => node.kind);
  if (canonicalJson(nodeKinds) !== canonicalJson(EXPECTED_NODE_KINDS)) {
    throw new Error("The neutral renderer requires the exact authored node order.");
  }
  const [
    headingNode,
    navigationNode,
    factsNode,
    choicesNode,
    nextJobNode,
    effectsNode,
    tasksNode,
    terminalNode,
  ] = authored.substitute.surface.nodes;
  if (
    headingNode?.kind !== "heading"
    || navigationNode?.kind !== "anchor_navigation"
    || factsNode?.kind !== "fact_table"
    || choicesNode?.kind !== "choice_list"
    || nextJobNode?.kind !== "next_job"
    || effectsNode?.kind !== "effect_boundary"
    || tasksNode?.kind !== "task_prompt"
    || terminalNode?.kind !== "terminal_note"
  ) {
    throw new Error("The neutral renderer cannot compile an unexpected node.");
  }

  const packBinding = authored.substitute.packBindings.find(
    (binding) => binding.packId === pack.packId,
  );
  if (!packBinding) throw new Error("The requested authored pack is not bound.");
  const headings = {
    facts: factsNode.heading,
    choices: choicesNode.heading,
    nextJob: nextJobNode.heading,
    effects: effectsNode.heading,
    tasks: tasksNode.heading,
    terminal: terminalNode.heading,
  };
  const scenarios = pack.scenarios.map((scenario, index) => scenarioFor(
    scenario,
    index + 1,
    headings,
    authored.substitute.density.maximumVisibleCharactersPerScenario,
    headingNode.text,
    navigationNode.heading,
  ));
  const base = {
    schemaVersion: UNIVERSITY_RESEARCH_SURFACE_PACKET_SCHEMA_VERSION,
    packId: pack.packId,
    packDigest: packBinding.packDigest,
    artifactVersion: authored.substitute.artifactVersion,
    rendererId: authored.substitute.rendererId,
    rendererBindingDigest: authored.substitute.rendererBindingDigest,
    title: headingNode.text,
    navigationHeading: navigationNode.heading,
    navigationItems: navigationNode.items.map((item, index) => ({
      scenarioId: item.scenarioId,
      label: item.label,
      inputId: `research-example-${index + 1}-control`,
      regionId: `research-example-${index + 1}-content`,
    })),
    scenarios,
    maximumVisibleCharactersPerScenario:
      authored.substitute.density.maximumVisibleCharactersPerScenario,
  };
  const packetDigest = await sha256Digest(canonicalJson({
    digestDomain: SURFACE_PACKET_DIGEST_DOMAIN,
    value: base,
  }));
  return deepFreeze({
    ...base,
    packetDigest,
  });
}
