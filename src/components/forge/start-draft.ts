import { exceedsUtf8ByteLimit } from "@/src/lib/storage/raw-byte-limit";

export const FORGE_START_DRAFT_KEY = "forge.start-draft:v1";
export const MAX_FORGE_START_DRAFT_RAW_BYTES = 8 * 1024;

export type ForgeStartDraft = Readonly<{
  goal: string;
  desiredOutcome: string;
}>;

export function readStartDraft(): ForgeStartDraft | null {
  try {
    const raw = window.sessionStorage.getItem(FORGE_START_DRAFT_KEY);
    if (!raw) return null;
    if (exceedsUtf8ByteLimit(raw, MAX_FORGE_START_DRAFT_RAW_BYTES)) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      !("goal" in value) ||
      !("desiredOutcome" in value) ||
      typeof value.goal !== "string" ||
      typeof value.desiredOutcome !== "string"
    ) {
      return null;
    }
    const goal = value.goal.trim().slice(0, 600);
    const desiredOutcome = value.desiredOutcome.trim().slice(0, 280);
    return goal.length >= 3 ? { goal, desiredOutcome } : null;
  } catch {
    return null;
  }
}

export function writeStartDraft(draft: ForgeStartDraft): boolean {
  const goal = draft.goal.trim().slice(0, 600);
  const desiredOutcome = draft.desiredOutcome.trim().slice(0, 280);
  if (goal.length < 3) return false;
  try {
    const encoded = JSON.stringify({ goal, desiredOutcome });
    if (exceedsUtf8ByteLimit(encoded, MAX_FORGE_START_DRAFT_RAW_BYTES)) return false;
    window.sessionStorage.setItem(FORGE_START_DRAFT_KEY, encoded);
    return true;
  } catch {
    return false;
  }
}

export function clearStartDraft(): void {
  try {
    window.sessionStorage.removeItem(FORGE_START_DRAFT_KEY);
  } catch {
    // An unavailable browser store is already represented by the unsaved form.
  }
}
