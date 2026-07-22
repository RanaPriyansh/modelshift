import type { ForgePlanRequest, RefusalReason } from "./schema";

const ADVERSARIAL_PATTERN =
  /\b(ignore (all |any |the )?(previous|prior|above)|system prompt|developer message|reveal (your |the )?(prompt|instructions)|jailbreak|you are now|override (the )?(policy|instructions)|invent (a |an )?(source|world id))\b/i;

const UNSAFE_PATTERNS = [
  /\b(how (do|can|would) i|teach me to|instructions? (for|to)|steps? (for|to))\b.{0,80}\b(build|make|assemble|detonate)\b.{0,40}\b(bomb|explosive|improvised explosive)\b/i,
  /\b(how (do|can|would) i|teach me to|instructions? (for|to)|steps? (for|to))\b.{0,80}\b(kill|poison|seriously harm)\b/i,
  /\b(how (do|can|would) i|teach me to|instructions? (for|to)|steps? (for|to))\b.{0,80}\b(ransomware|steal passwords?|hack (an|a) account)\b/i,
  /\b(explicit sexual content|sexualize)\b.{0,40}\b(child|minor|underage)\b/i,
] as const;

// This is a deliberately narrow server-side tripwire, not a claim that text
// scanning can establish privacy. It keeps obvious personal identifiers out of
// the forwarded authoring fields while the public connector remains disabled.
const PRIVATE_DATA_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?\d{1,3}[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]\d{4}\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
] as const;

export function containsAdversarialText(text: string): boolean {
  return ADVERSARIAL_PATTERN.test(text);
}

export function isAdversarialPlannerInput(input: ForgePlanRequest): boolean {
  return containsAdversarialText([input.question, input.startingPoint, input.successShape].join("\n"));
}

export function isRestrictedTopic(question: string): boolean {
  return UNSAFE_PATTERNS.some((pattern) => pattern.test(question));
}

export function containsPrivateData(text: string): boolean {
  return PRIVATE_DATA_PATTERNS.some((pattern) => pattern.test(text));
}

export function policyRefusal(input: ForgePlanRequest): RefusalReason | null {
  if (isAdversarialPlannerInput(input)) return "adversarial_input";
  if (isRestrictedTopic(input.question)) return "unsafe_topic";
  if (input.ageMode === "child" && !input.guardianManaged) return "guardian_required";
  if (input.ageMode === "child" && (input.sourceMode === "open_web" || input.sourceMode === "unrestricted")) {
    return "child_source_mode_disallowed";
  }
  return null;
}
