export const FORGE_SPRINT_STORE_VERSION = 1 as const;
export const FORGE_SPRINT_STORAGE_KEY = "forge.project-sprints:v1";
export const MAX_LOCAL_SPRINTS = 50;

export type ForgeSprintTemplateId =
  | "campus-tool"
  | "portfolio-case"
  | "research-explainer"
  | "workflow-automation";

export type ForgeDailyMinutes = 30 | 60 | 90 | 120;
export type ForgeSprintStatus = "active" | "completed";
export type ForgeProofLabStatus = "not_started" | "self_declared" | "contaminated";

export interface ForgeSprintTemplate {
  id: ForgeSprintTemplateId;
  name: string;
  shortDescription: string;
  exampleTitle: string;
  exampleAudience: string;
  exampleFinishLine: string;
  exampleStartingPoint: string;
}

export interface ForgeSprintDayDefinition {
  day: number;
  title: string;
  objective: string;
  task: string;
  tomorrow: string | null;
}

export interface ForgeSprintDayEntry {
  day: number;
  workNotes: string;
  change: string;
  evidenceLinks: ForgeEvidenceLink[];
  completedAt: string | null;
}

export interface ForgeEvidenceLink {
  id: string;
  label: string;
  url: string;
}

export interface ForgeProofLab {
  explainWithoutNotes: string;
  changeWithoutAi: string;
  realityCheck: string;
  coreOutcomeShown: boolean;
  evidenceIsInspectable: boolean;
  canExplainScope: boolean;
  aiUse: "not_declared" | "learner_declares_no_ai" | "ai_used_or_unsure";
  status: ForgeProofLabStatus;
}

export interface ForgeSprint {
  schemaVersion: typeof FORGE_SPRINT_STORE_VERSION;
  id: string;
  title: string;
  audience: string;
  finishLine: string;
  startingPoint: string;
  dailyMinutes: ForgeDailyMinutes;
  templateId: ForgeSprintTemplateId;
  status: ForgeSprintStatus;
  currentDay: number;
  createdAt: string;
  updatedAt: string;
  days: ForgeSprintDayEntry[];
  proofLab: ForgeProofLab;
  whatShipped: string[];
  reflection: string;
  openQuestions: string[];
}

export interface ForgeSprintStore {
  version: typeof FORGE_SPRINT_STORE_VERSION;
  revision: number;
  sprints: ForgeSprint[];
}

export interface CreateForgeSprintInput {
  title: string;
  audience: string;
  finishLine: string;
  startingPoint: string;
  dailyMinutes: ForgeDailyMinutes;
  templateId: ForgeSprintTemplateId;
}

export interface ForgeSprintValidationResult {
  ok: boolean;
  errors: string[];
}

export interface ForgeSprintParseResult {
  store: ForgeSprintStore;
  issues: string[];
}

export const FORGE_SPRINT_TEMPLATES: readonly ForgeSprintTemplate[] = [
  {
    id: "campus-tool",
    name: "Campus tool",
    shortDescription: "Solve one real campus need with a focused, useful tool.",
    exampleTitle: "Library Seat Finder",
    exampleAudience: "Students trying to find a study space during exam week.",
    exampleFinishLine:
      "Students can see live seat availability for one library floor and get an alert when a seat opens.",
    exampleStartingPoint:
      "Access to library floor maps, room-capacity notes, and a basic app starter.",
  },
  {
    id: "portfolio-case",
    name: "Portfolio case study",
    shortDescription: "Document a project that shows your process and judgment clearly.",
    exampleTitle: "Checkout Redesign Case",
    exampleAudience: "Product teams reviewing an early-career designer's work.",
    exampleFinishLine:
      "A reader can understand the problem, the key decision, the tested change, and what remains uncertain.",
    exampleStartingPoint:
      "An existing project, screenshots, rough notes, and one person who can critique the story.",
  },
  {
    id: "research-explainer",
    name: "Research explainer",
    shortDescription: "Turn a complex topic into a clear, source-visible explanation.",
    exampleTitle: "Research Paper Explainer",
    exampleAudience: "Students encountering the paper's central idea for the first time.",
    exampleFinishLine:
      "A reader can explain the paper's main claim, the evidence behind it, and one important limitation.",
    exampleStartingPoint:
      "The paper, its cited dataset or method notes, and a rough list of confusing terms.",
  },
  {
    id: "workflow-automation",
    name: "Automate a workflow",
    shortDescription: "Save time by automating one repeated, inspectable task.",
    exampleTitle: "Weekly Reading Digest",
    exampleAudience: "A student team that manually sorts the same reading list every week.",
    exampleFinishLine:
      "A teammate can run the workflow and receive a correctly grouped digest without editing the script.",
    exampleStartingPoint:
      "Three sample reading lists and the current manual sorting rules.",
  },
] as const;

export const FORGE_SPRINT_DAYS: readonly ForgeSprintDayDefinition[] = [
  {
    day: 1,
    title: "Define & Scope",
    objective: "Turn the idea into one finish line small enough to ship.",
    task: "Write the smallest version that would still be useful to one specific person.",
    tomorrow: "Talk to the problem before you add more product.",
  },
  {
    day: 2,
    title: "User Insight",
    objective: "Meet the problem in reality instead of guessing from the screen.",
    task: "Talk to, observe, or test with at least one intended user. Record what surprised you.",
    tomorrow: "Build only the core outcome your user actually needs.",
  },
  {
    day: 3,
    title: "Build Core",
    objective: "Make the smallest end-to-end version of the core outcome.",
    task: "Connect the shortest real path from input to useful result. Leave polish for later.",
    tomorrow: "Put the core flow in front of reality and fix what blocks it.",
  },
  {
    day: 4,
    title: "Refine & Test",
    objective: "Find the failure that matters most and remove it.",
    task: "Run the core flow with a real case. Fix the biggest point of confusion or breakage.",
    tomorrow: "Cut loose edges and prepare one thing worth shipping.",
  },
  {
    day: 5,
    title: "Polish",
    objective: "Make the core experience clear, complete, and easy to inspect.",
    task: "Remove the nonessential, tighten the main path, and prepare your evidence links.",
    tomorrow: "Prove the outcome works—and that you understand the work.",
  },
  {
    day: 6,
    title: "Proof Lab",
    objective: "Create proof that the project works and the important thinking is yours.",
    task: "Capture an inspectable result, explain it without notes, and make one meaningful change without AI.",
    tomorrow: "Package the work, state its limits, and reflect on what changed.",
  },
  {
    day: 7,
    title: "Deliver & Reflect",
    objective: "Ship the artifact and leave a scoped record of what you can stand behind.",
    task: "Name what shipped, what remains open, and what you would test next.",
    tomorrow: null,
  },
] as const;

const EMPTY_PROOF_LAB: ForgeProofLab = {
  explainWithoutNotes: "",
  changeWithoutAi: "",
  realityCheck: "",
  coreOutcomeShown: false,
  evidenceIsInspectable: false,
  canExplainScope: false,
  aiUse: "not_declared",
  status: "not_started",
};

export function createEmptyForgeSprintStore(): ForgeSprintStore {
  return { version: FORGE_SPRINT_STORE_VERSION, revision: 0, sprints: [] };
}

export function getForgeSprintTemplate(
  templateId: ForgeSprintTemplateId,
): ForgeSprintTemplate {
  return (
    FORGE_SPRINT_TEMPLATES.find((template) => template.id === templateId) ??
    FORGE_SPRINT_TEMPLATES[0]
  );
}

export function getForgeSprintDay(day: number): ForgeSprintDayDefinition {
  return (
    FORGE_SPRINT_DAYS.find((definition) => definition.day === day) ??
    FORGE_SPRINT_DAYS[0]
  );
}

export function createForgeSprint(
  input: CreateForgeSprintInput,
  options: { id?: string; now?: Date } = {},
): ForgeSprint {
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const id = options.id ?? createLocalId("sprint");

  return {
    schemaVersion: FORGE_SPRINT_STORE_VERSION,
    id,
    title: normalizeText(input.title, 80),
    audience: normalizeText(input.audience, 240),
    finishLine: normalizeText(input.finishLine, 360),
    startingPoint: normalizeText(input.startingPoint, 360),
    dailyMinutes: input.dailyMinutes,
    templateId: input.templateId,
    status: "active",
    currentDay: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    days: FORGE_SPRINT_DAYS.map((definition) => ({
      day: definition.day,
      workNotes: "",
      change: "",
      evidenceLinks: [],
      completedAt: null,
    })),
    proofLab: { ...EMPTY_PROOF_LAB },
    whatShipped: [],
    reflection: "",
    openQuestions: [],
  };
}

export function addSprintToStore(
  store: ForgeSprintStore,
  sprint: ForgeSprint,
): ForgeSprintStore {
  const withoutDuplicate = store.sprints.filter((candidate) => candidate.id !== sprint.id);
  return {
    version: FORGE_SPRINT_STORE_VERSION,
    revision: store.revision + 1,
    sprints: [sprint, ...withoutDuplicate].slice(0, MAX_LOCAL_SPRINTS),
  };
}

export function replaceSprintInStore(
  store: ForgeSprintStore,
  sprint: ForgeSprint,
): ForgeSprintStore {
  const exists = store.sprints.some((candidate) => candidate.id === sprint.id);
  if (!exists) return addSprintToStore(store, sprint);
  return {
    version: FORGE_SPRINT_STORE_VERSION,
    revision: store.revision + 1,
    sprints: store.sprints.map((candidate) =>
      candidate.id === sprint.id ? sprint : candidate,
    ),
  };
}

export function updateForgeSprint(
  sprint: ForgeSprint,
  update: Partial<
    Pick<
      ForgeSprint,
      | "title"
      | "audience"
      | "finishLine"
      | "startingPoint"
      | "dailyMinutes"
      | "templateId"
      | "whatShipped"
      | "reflection"
      | "openQuestions"
      | "proofLab"
      | "days"
    >
  >,
  now = new Date(),
): ForgeSprint {
  return {
    ...sprint,
    ...update,
    updatedAt: now.toISOString(),
  };
}

export function validateSprintSetup(
  input: CreateForgeSprintInput,
): ForgeSprintValidationResult {
  const errors: string[] = [];
  if (normalizeText(input.title, 80).length < 3) {
    errors.push("Name the project in at least 3 characters.");
  }
  if (normalizeText(input.audience, 240).length < 8) {
    errors.push("Name one specific person or group this is for.");
  }
  if (normalizeText(input.finishLine, 360).length < 16) {
    errors.push("Make the Day 7 finish line concrete and testable.");
  }
  if (normalizeText(input.startingPoint, 360).length < 3) {
    errors.push("Record what you already have, even if it is only an idea.");
  }
  if (![30, 60, 90, 120].includes(input.dailyMinutes)) {
    errors.push("Choose a valid daily time budget.");
  }
  if (!FORGE_SPRINT_TEMPLATES.some((template) => template.id === input.templateId)) {
    errors.push("Choose a valid starting pattern.");
  }
  return { ok: errors.length === 0, errors };
}

export function validateDayCompletion(
  sprint: ForgeSprint,
  dayNumber = sprint.currentDay,
): ForgeSprintValidationResult {
  const day = sprint.days.find((entry) => entry.day === dayNumber);
  const errors: string[] = [];

  if (!day) return { ok: false, errors: ["This sprint day is missing."] };
  if (dayNumber !== sprint.currentDay) {
    errors.push("Complete the current day before moving the sprint forward.");
  }
  if (day.workNotes.trim().length < 12) {
    errors.push("Record what you did, learned, or tried today.");
  }
  if (day.change.trim().length < 8) {
    errors.push("Name the most important change you made and why.");
  }

  if (dayNumber === 6) {
    if (day.evidenceLinks.length === 0) {
      errors.push("Add at least one inspectable evidence link.");
    }
    if (
      !sprint.proofLab.coreOutcomeShown ||
      !sprint.proofLab.evidenceIsInspectable ||
      !sprint.proofLab.canExplainScope
    ) {
      errors.push("Complete the three evidence checks.");
    }
    if (sprint.proofLab.explainWithoutNotes.trim().length < 12) {
      errors.push("Explain the core flow without relying on your notes.");
    }
    if (sprint.proofLab.changeWithoutAi.trim().length < 12) {
      errors.push("Record one meaningful change you made without AI.");
    }
    if (sprint.proofLab.realityCheck.trim().length < 8) {
      errors.push("Record how you checked the result in reality.");
    }
    if (sprint.proofLab.aiUse === "not_declared") {
      errors.push("Declare whether AI was absent from the protected Proof Lab work.");
    }
  }

  if (dayNumber === 7) {
    if (sprint.whatShipped.filter((item) => item.trim().length >= 3).length === 0) {
      errors.push("List at least one inspectable thing that shipped.");
    }
    if (sprint.reflection.trim().length < 20) {
      errors.push("Reflect on what changed and what you would test next.");
    }
    if (sprint.openQuestions.filter((item) => item.trim().length >= 3).length === 0) {
      errors.push("Name at least one thing that remains open.");
    }
  }

  return { ok: errors.length === 0, errors };
}

export function completeCurrentSprintDay(
  sprint: ForgeSprint,
  now = new Date(),
): { result: ForgeSprintValidationResult; sprint: ForgeSprint } {
  const result = validateDayCompletion(sprint);
  if (!result.ok) return { result, sprint };

  const timestamp = now.toISOString();
  const days = sprint.days.map((day) =>
    day.day === sprint.currentDay ? { ...day, completedAt: timestamp } : day,
  );
  const completed = sprint.currentDay === 7;

  return {
    result,
    sprint: {
      ...sprint,
      days,
      proofLab:
        sprint.currentDay === 6
          ? {
              ...sprint.proofLab,
              status: sprint.proofLab.aiUse === "learner_declares_no_ai"
                ? "self_declared"
                : "contaminated",
            }
          : sprint.proofLab,
      currentDay: completed ? 7 : sprint.currentDay + 1,
      status: completed ? "completed" : "active",
      updatedAt: timestamp,
    },
  };
}

export function addEvidenceLink(
  sprint: ForgeSprint,
  dayNumber: number,
  link: Omit<ForgeEvidenceLink, "id">,
  now = new Date(),
): { sprint: ForgeSprint; error: string | null } {
  const label = normalizeText(link.label, 80);
  const url = link.url.trim();
  if (label.length < 2) return { sprint, error: "Give the evidence link a short label." };
  if (!isInspectableUrl(url)) {
    return { sprint, error: "Use a complete http:// or https:// link." };
  }

  const days = sprint.days.map((day) => {
    if (day.day !== dayNumber) return day;
    return {
      ...day,
      evidenceLinks: [
        ...day.evidenceLinks,
        { id: createLocalId("evidence"), label, url },
      ].slice(0, 8),
    };
  });
  return { sprint: updateForgeSprint(sprint, { days }, now), error: null };
}

export function removeEvidenceLink(
  sprint: ForgeSprint,
  dayNumber: number,
  linkId: string,
  now = new Date(),
): ForgeSprint {
  const days = sprint.days.map((day) =>
    day.day === dayNumber
      ? {
          ...day,
          evidenceLinks: day.evidenceLinks.filter((link) => link.id !== linkId),
        }
      : day,
  );
  return updateForgeSprint(sprint, { days }, now);
}

export function buildForgeProofSummary(sprint: ForgeSprint): string {
  const shipped = cleanList(sprint.whatShipped);
  const evidence = sprint.days.flatMap((day) => day.evidenceLinks);
  const open = cleanList(sprint.openQuestions);
  const completion = describeSprintCompletion(sprint);
  const proof = describeForgeProofLab(sprint.proofLab);

  return [
    sprint.title,
    sprint.finishLine,
    "Sprint: " + completion,
    shipped.length > 0 ? "Shipped: " + shipped.join("; ") : "Shipped: not recorded",
    evidence.length > 0
      ? "Evidence: " + evidence.map((link) => link.label + " (" + link.url + ")").join("; ")
      : "Evidence: not recorded",
    "Proof Lab: " + proof,
    open.length > 0 ? "Still open: " + open.join("; ") : "Still open: not recorded",
  ].join("\n");
}

export function buildForgeProofMarkdown(sprint: ForgeSprint): string {
  const shipped = cleanList(sprint.whatShipped);
  const open = cleanList(sprint.openQuestions);
  const evidence = sprint.days.flatMap((day) => day.evidenceLinks);
  const changes = sprint.days
    .map((day) => day.change.trim())
    .filter((change) => change.length > 0);
  const completion = describeSprintCompletion(sprint);
  const proof = describeForgeProofLab(sprint.proofLab);

  return [
    "# " + sprint.title,
    "",
    sprint.audience,
    "",
    "> FORGE Project Sprint. " + completion + " " + proof + ".",
    "",
    "## Finish line",
    "",
    sprint.finishLine,
    "",
    "## What shipped",
    "",
    ...(shipped.length > 0 ? shipped.map((item) => "- " + item) : ["- Not recorded"]),
    "",
    "## Evidence",
    "",
    ...(evidence.length > 0
      ? evidence.map((link) => "- [" + link.label + "](" + link.url + ")")
      : ["- Not recorded"]),
    "",
    "## What changed",
    "",
    ...(changes.length > 0 ? changes.map((change) => "- " + change) : ["- Not recorded"]),
    "",
    "## Proof Lab",
    "",
    "Status: " + proof,
    "",
    "- Explain without notes: " + (sprint.proofLab.explainWithoutNotes || "Not recorded"),
    "- Change without AI: " + (sprint.proofLab.changeWithoutAi || "Not recorded"),
    "- Reality check: " + (sprint.proofLab.realityCheck || "Not recorded"),
    "",
    "## What remains open",
    "",
    ...(open.length > 0 ? open.map((item) => "- " + item) : ["- Not recorded"]),
    "",
    "## Reflection",
    "",
    sprint.reflection || "Not recorded",
    "",
    "---",
    "Built with FORGE Project Sprint. The artifact can be inspected; the proof remains scoped.",
  ].join("\n");
}

export function parseForgeSprintStore(raw: string | null): ForgeSprintParseResult {
  if (raw === null || raw.trim() === "") {
    return { store: createEmptyForgeSprintStore(), issues: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      store: createEmptyForgeSprintStore(),
      issues: ["Local sprint data is not valid JSON. No stored data was changed."],
    };
  }

  if (!isRecord(parsed) || parsed.version !== FORGE_SPRINT_STORE_VERSION) {
    return {
      store: createEmptyForgeSprintStore(),
      issues: ["This local sprint format is not supported. No stored data was changed."],
    };
  }

  if (!Array.isArray(parsed.sprints)) {
    return {
      store: createEmptyForgeSprintStore(),
      issues: ["The local sprint list is malformed. No stored data was changed."],
    };
  }
  if (typeof parsed.revision !== "number" || !Number.isInteger(parsed.revision) || parsed.revision < 0) {
    return {
      store: createEmptyForgeSprintStore(),
      issues: ["The local sprint revision is malformed. No stored data was changed."],
    };
  }

  const issues: string[] = [];
  const sprints: ForgeSprint[] = [];
  const seen = new Set<string>();

  for (const candidate of parsed.sprints.slice(0, MAX_LOCAL_SPRINTS)) {
    const sprint = parseSprint(candidate);
    if (!sprint) {
      issues.push("One malformed local sprint was skipped.");
      continue;
    }
    if (seen.has(sprint.id)) {
      issues.push("Duplicate sprint \"" + sprint.id + "\" was skipped.");
      continue;
    }
    seen.add(sprint.id);
    sprints.push(sprint);
  }

  return {
    store: { version: FORGE_SPRINT_STORE_VERSION, revision: parsed.revision, sprints },
    issues: Array.from(new Set(issues)),
  };
}

export function serializeForgeSprintStore(store: ForgeSprintStore): string {
  return JSON.stringify(store);
}

export function isInspectableUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseSprint(value: unknown): ForgeSprint | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== FORGE_SPRINT_STORE_VERSION) return null;
  if (!isShortString(value.id, 120) || !isShortString(value.title, 80)) return null;
  if (!isShortString(value.audience, 240) || !isShortString(value.finishLine, 360)) {
    return null;
  }
  if (!isStringWithin(value.startingPoint, 360)) return null;
  if (![30, 60, 90, 120].includes(value.dailyMinutes as number)) return null;
  if (!isTemplateId(value.templateId)) return null;
  if (value.status !== "active" && value.status !== "completed") return null;
  if (typeof value.currentDay !== "number" || !Number.isInteger(value.currentDay) || value.currentDay < 1 || value.currentDay > 7) {
    return null;
  }
  if (!isIsoDate(value.createdAt) || !isIsoDate(value.updatedAt)) return null;
  if (!Array.isArray(value.days) || value.days.length !== 7) return null;

  const days = value.days.map(parseDayEntry);
  if (days.some((day) => day === null)) return null;
  if (!isProofLab(value.proofLab)) return null;
  if (!isStringList(value.whatShipped, 12, 160)) return null;
  if (!isStringWithin(value.reflection, 1600)) return null;
  if (!isStringList(value.openQuestions, 12, 240)) return null;

  const sprint: ForgeSprint = {
    schemaVersion: FORGE_SPRINT_STORE_VERSION,
    id: value.id,
    title: value.title,
    audience: value.audience,
    finishLine: value.finishLine,
    startingPoint: value.startingPoint,
    dailyMinutes: value.dailyMinutes as ForgeDailyMinutes,
    templateId: value.templateId,
    status: value.status,
    currentDay: value.currentDay,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    days: days as ForgeSprintDayEntry[],
    proofLab: value.proofLab,
    whatShipped: value.whatShipped,
    reflection: value.reflection,
    openQuestions: value.openQuestions,
  };

  return hasCoherentSprintState(sprint) ? sprint : null;
}

function parseDayEntry(value: unknown): ForgeSprintDayEntry | null {
  if (!isRecord(value)) return null;
  if (typeof value.day !== "number" || !Number.isInteger(value.day) || value.day < 1 || value.day > 7) return null;
  if (!isStringWithin(value.workNotes, 2400) || !isStringWithin(value.change, 800)) {
    return null;
  }
  if (!Array.isArray(value.evidenceLinks) || value.evidenceLinks.length > 8) return null;
  const evidenceLinks = value.evidenceLinks.map(parseEvidenceLink);
  if (evidenceLinks.some((link) => link === null)) return null;
  if (value.completedAt !== null && !isIsoDate(value.completedAt)) return null;
  return {
    day: value.day,
    workNotes: value.workNotes,
    change: value.change,
    evidenceLinks: evidenceLinks as ForgeEvidenceLink[],
    completedAt: value.completedAt,
  };
}

function parseEvidenceLink(value: unknown): ForgeEvidenceLink | null {
  if (!isRecord(value)) return null;
  if (!isShortString(value.id, 120) || !isShortString(value.label, 80)) return null;
  if (!isShortString(value.url, 2048) || !isInspectableUrl(value.url)) return null;
  return { id: value.id, label: value.label, url: value.url };
}

function isProofLab(value: unknown): value is ForgeProofLab {
  if (!isRecord(value)) return false;
  return (
    isStringWithin(value.explainWithoutNotes, 1600) &&
    isStringWithin(value.changeWithoutAi, 1600) &&
    isStringWithin(value.realityCheck, 1600) &&
    typeof value.coreOutcomeShown === "boolean" &&
    typeof value.evidenceIsInspectable === "boolean" &&
    typeof value.canExplainScope === "boolean" &&
    (value.aiUse === "not_declared" ||
      value.aiUse === "learner_declares_no_ai" ||
      value.aiUse === "ai_used_or_unsure") &&
    (value.status === "not_started" ||
      value.status === "self_declared" ||
      value.status === "contaminated")
  );
}

function describeSprintCompletion(sprint: ForgeSprint): string {
  const completedDays = sprint.days.filter((day) => day.completedAt !== null).length;
  return sprint.status === "completed" && completedDays === 7
    ? "Completed locally."
    : `In progress: ${completedDays} of 7 daily moves completed.`;
}

export function describeForgeProofLab(proofLab: ForgeProofLab): string {
  if (proofLab.status === "self_declared") {
    return "Protected pass self-declared without generative AI; browser-local and not independently verified";
  }
  if (proofLab.status === "contaminated") {
    return "Protected pass declared AI-assisted or uncertain; retained as learning evidence with no independent-proof claim";
  }
  return "Protected pass not completed; no independent-proof claim";
}

function hasCoherentSprintState(sprint: ForgeSprint): boolean {
  if (Date.parse(sprint.createdAt) > Date.parse(sprint.updatedAt)) return false;
  if (sprint.days.some((day, index) => day.day !== index + 1)) return false;

  const expectedCompletedDays = sprint.status === "completed"
    ? 7
    : sprint.currentDay - 1;
  const completedDays = sprint.days.filter((day) => day.completedAt !== null);
  if (completedDays.length !== expectedCompletedDays) return false;
  if (sprint.status === "completed" && sprint.currentDay !== 7) return false;

  let priorCompletion = Date.parse(sprint.createdAt);
  const updatedAt = Date.parse(sprint.updatedAt);
  for (const day of sprint.days) {
    const shouldBeCompleted = day.day <= expectedCompletedDays;
    if ((day.completedAt !== null) !== shouldBeCompleted) return false;
    if (!shouldBeCompleted) continue;
    if (!hasCompletedDayContent(sprint, day)) return false;
    const completedAt = Date.parse(day.completedAt as string);
    if (completedAt < priorCompletion || completedAt > updatedAt) return false;
    priorCompletion = completedAt;
  }

  const expectedProofStatus: ForgeProofLabStatus = expectedCompletedDays < 6
    ? "not_started"
    : sprint.proofLab.aiUse === "learner_declares_no_ai"
      ? "self_declared"
      : sprint.proofLab.aiUse === "ai_used_or_unsure"
        ? "contaminated"
        : "not_started";
  if (sprint.proofLab.status !== expectedProofStatus) return false;
  if (expectedCompletedDays >= 6 && sprint.proofLab.aiUse === "not_declared") return false;

  const evidenceIds = sprint.days.flatMap((day) => day.evidenceLinks.map((link) => link.id));
  if (new Set(evidenceIds).size !== evidenceIds.length) return false;

  return true;
}

function hasCompletedDayContent(
  sprint: ForgeSprint,
  day: ForgeSprintDayEntry,
): boolean {
  if (day.workNotes.trim().length < 12 || day.change.trim().length < 8) return false;
  if (day.day === 6) {
    return (
      day.evidenceLinks.length > 0 &&
      sprint.proofLab.coreOutcomeShown &&
      sprint.proofLab.evidenceIsInspectable &&
      sprint.proofLab.canExplainScope &&
      sprint.proofLab.explainWithoutNotes.trim().length >= 12 &&
      sprint.proofLab.changeWithoutAi.trim().length >= 12 &&
      sprint.proofLab.realityCheck.trim().length >= 8
    );
  }
  if (day.day === 7) {
    return (
      cleanList(sprint.whatShipped).some((item) => item.length >= 3) &&
      sprint.reflection.trim().length >= 20 &&
      cleanList(sprint.openQuestions).some((item) => item.length >= 3)
    );
  }
  return true;
}

function isTemplateId(value: unknown): value is ForgeSprintTemplateId {
  return FORGE_SPRINT_TEMPLATES.some((template) => template.id === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShortString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isStringWithin(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isStringList(
  value: unknown,
  maxItems: number,
  maxItemLength: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === "string" && item.length <= maxItemLength)
  );
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 40 &&
    Number.isFinite(Date.parse(value))
  );
}

function normalizeText(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
}

function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return prefix + "-" + crypto.randomUUID();
  }
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}
