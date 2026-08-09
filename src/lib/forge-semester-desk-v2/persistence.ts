import {
  SEMESTER_DESK_MAX_CONFLICT_FACT_IDS,
  SEMESTER_DESK_MAX_CONFLICTS_PER_COURSE,
  SEMESTER_DESK_MAX_COURSES,
  SEMESTER_DESK_MAX_DELAYED_RETURNS,
  SEMESTER_DESK_MAX_FACTS_PER_COURSE,
  SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES,
  SEMESTER_DESK_MAX_PLAN_ITEMS,
  SEMESTER_DESK_MAX_PROOFS,
  SEMESTER_DESK_MAX_PROGRESS_EVIDENCE,
  SEMESTER_DESK_MAX_RAW_JSON_UTF8_BYTES,
  SEMESTER_DESK_MAX_RECOVERY_CHANGES,
  SEMESTER_DESK_MAX_RECOVERY_DECISIONS,
  SEMESTER_DESK_MAX_STUDY_SESSIONS,
  SEMESTER_DESK_MAX_TEXT_UTF8_BYTES,
  semesterDeskUtf8ByteLength,
  type SemesterDeskState,
  validateSemesterDeskState,
} from "@/src/forge/semester-desk-v2";

const storagePrefix = "forge.semester-desk-v2.v1.profile";

/**
 * This stores one opaque local return reference. It is not a profile list and
 * it must never be used to discover another local desk.
 */
export const semesterDeskActiveProfileStorageKey =
  "forge.semester-desk-v2.v1.active-profile";

/** Normalize one profile identifier before it reaches a local storage key. */
export function normalizeSemesterDeskProfileIdentifier(value: string): string | null {
  if (!value.isWellFormed()) return null;
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  return semesterDeskUtf8ByteLength(normalized) <= SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES
    ? normalized
    : null;
}

function boundedProfileIdentifier(value: string): string | null {
  const normalized = normalizeSemesterDeskProfileIdentifier(value);
  return normalized === value ? normalized : null;
}

const maximumSemesterDeskArrayLength = Math.max(
  SEMESTER_DESK_MAX_CONFLICT_FACT_IDS,
  SEMESTER_DESK_MAX_CONFLICTS_PER_COURSE,
  SEMESTER_DESK_MAX_COURSES,
  SEMESTER_DESK_MAX_DELAYED_RETURNS,
  SEMESTER_DESK_MAX_FACTS_PER_COURSE,
  SEMESTER_DESK_MAX_PLAN_ITEMS,
  SEMESTER_DESK_MAX_PROOFS,
  SEMESTER_DESK_MAX_PROGRESS_EVIDENCE,
  SEMESTER_DESK_MAX_RECOVERY_CHANGES,
  SEMESTER_DESK_MAX_RECOVERY_DECISIONS,
  SEMESTER_DESK_MAX_STUDY_SESSIONS,
);
const maximumSemesterDeskObjectKeys = 32;
const maximumSemesterDeskDepth = 8;
const arrayIndex = /^(0|[1-9]\d*)$/;

/**
 * Detach one in-memory state before the canonical validator reads it.
 * Caller getters never run. Repeated references and non-JSON values fail closed.
 */
function snapshotSemesterDeskState(value: unknown): unknown {
  const visited = new WeakSet<object>();
  let nodes = 0;

  function visit(candidate: unknown, depth: number): unknown {
    nodes += 1;
    if (nodes > SEMESTER_DESK_MAX_RAW_JSON_UTF8_BYTES || depth > maximumSemesterDeskDepth) {
      throw new TypeError("The local state exceeds its structural boundary.");
    }
    if (candidate === null || typeof candidate === "boolean") return candidate;
    if (typeof candidate === "string") {
      if (semesterDeskUtf8ByteLength(candidate) > SEMESTER_DESK_MAX_TEXT_UTF8_BYTES) {
        throw new TypeError("The local state contains oversized text.");
      }
      return candidate;
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate)) {
        throw new TypeError("The local state contains a non-finite number.");
      }
      return candidate;
    }
    if (typeof candidate !== "object") {
      throw new TypeError("The local state is not JSON data.");
    }
    if (visited.has(candidate)) {
      throw new TypeError("The local state contains a repeated reference.");
    }
    visited.add(candidate);

    if (Array.isArray(candidate)) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(candidate, "length");
      if (
        !lengthDescriptor
        || !("value" in lengthDescriptor)
        || typeof lengthDescriptor.value !== "number"
        || !Number.isSafeInteger(lengthDescriptor.value)
        || lengthDescriptor.value < 0
        || lengthDescriptor.value > maximumSemesterDeskArrayLength
      ) {
        throw new TypeError("The local state contains an invalid array.");
      }
      const length = lengthDescriptor.value;
      const keys = Reflect.ownKeys(candidate);
      if (
        keys.length !== length + 1
        || !keys.includes("length")
        || keys.some((key) => (
          key !== "length"
          && (typeof key !== "string" || !arrayIndex.test(key) || Number(key) >= length)
        ))
      ) {
        throw new TypeError("The local state contains a sparse or decorated array.");
      }

      const output: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(candidate, String(index));
        if (
          !descriptor
          || !descriptor.enumerable
          || !("value" in descriptor)
          || descriptor.get
          || descriptor.set
        ) {
          throw new TypeError("The local state contains an invalid array item.");
        }
        output.push(visit(descriptor.value, depth + 1));
      }
      return output;
    }

    const prototype = Object.getPrototypeOf(candidate);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("The local state contains an invalid object.");
    }
    const keys = Reflect.ownKeys(candidate);
    if (
      keys.length > maximumSemesterDeskObjectKeys
      || keys.some((key) => (
        typeof key !== "string"
        || semesterDeskUtf8ByteLength(key) > SEMESTER_DESK_MAX_TEXT_UTF8_BYTES
      ))
    ) {
      throw new TypeError("The local state contains invalid object keys.");
    }

    const output: Record<string, unknown> = {};
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
      if (
        !descriptor
        || !descriptor.enumerable
        || !("value" in descriptor)
        || descriptor.get
        || descriptor.set
      ) {
        throw new TypeError("The local state contains an accessor.");
      }
      Object.defineProperty(output, key, {
        configurable: true,
        enumerable: true,
        value: visit(descriptor.value, depth + 1),
        writable: true,
      });
    }
    return output;
  }

  return visit(value, 0);
}

export type SemesterDeskPersistenceRead =
  | { readonly kind: "missing" }
  | { readonly kind: "loaded"; readonly state: SemesterDeskState; readonly raw: string }
  | { readonly kind: "malformed"; readonly raw: string; readonly message: string };

export type SemesterDeskPersistenceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

type SemesterDeskPersistenceFailure = Extract<SemesterDeskPersistenceResult, { readonly ok: false }>;

export type SemesterDeskExportResult =
  | { readonly ok: true; readonly raw: string }
  | { readonly ok: false; readonly message: string };

/**
 * This interface has no browser requirement. A signed-in provider can replace
 * this device adapter without changing the Semester Desk user interface.
 */
export interface SemesterDeskPersistence {
  read(profileId: string): Promise<SemesterDeskPersistenceRead>;
  save(state: SemesterDeskState): Promise<SemesterDeskPersistenceResult>;
  exportRaw(profileId: string): Promise<SemesterDeskExportResult>;
  reset(profileId: string): Promise<SemesterDeskPersistenceResult>;
}

export function semesterDeskStorageKey(profileId: string): string {
  const boundedProfileId = boundedProfileIdentifier(profileId);
  if (!boundedProfileId) {
    throw new TypeError("The profile identifier is invalid.");
  }
  return `${storagePrefix}.${encodeURIComponent(boundedProfileId)}`;
}

function storageFailure(action: string): SemesterDeskPersistenceFailure {
  return { ok: false, message: `FORGE could not ${action} on this device.` };
}

function malformed(raw: string, message: string): SemesterDeskPersistenceRead {
  return { kind: "malformed", raw, message };
}

export class BrowserSemesterDeskPersistence implements SemesterDeskPersistence {
  constructor(private readonly storage: Storage) {}

  async read(profileId: string): Promise<SemesterDeskPersistenceRead> {
    const boundedProfileId = boundedProfileIdentifier(profileId);
    if (profileId.trim().length === 0) {
      return malformed("", "The local profile reference is empty.");
    }
    if (!boundedProfileId) {
      return malformed("", "The local profile reference is invalid.");
    }

    let raw: string | null;
    try {
      raw = this.storage.getItem(semesterDeskStorageKey(boundedProfileId));
    } catch {
      return malformed("", storageFailure("read local data").message);
    }

    if (raw === null) return { kind: "missing" };
    if (semesterDeskUtf8ByteLength(raw) > SEMESTER_DESK_MAX_RAW_JSON_UTF8_BYTES) {
      return malformed(raw, "The local data is too large to use.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return malformed(raw, "The local data is not valid JSON.");
    }

    const validated = validateSemesterDeskState(parsed);
    if (!validated.ok) {
      return malformed(raw, "The local data does not match this Semester Desk version.");
    }
    if (validated.value.profileId !== boundedProfileId) {
      return malformed(raw, "The local data belongs to a different profile.");
    }

    return {
      kind: "loaded",
      state: validated.value,
      raw,
    };
  }

  async save(state: SemesterDeskState): Promise<SemesterDeskPersistenceResult> {
    let snapshot: unknown;
    try {
      snapshot = snapshotSemesterDeskState(state);
    } catch {
      return { ok: false, message: "FORGE could not save data that did not pass its local check." };
    }
    const validated = validateSemesterDeskState(snapshot);
    if (!validated.ok) {
      return { ok: false, message: "FORGE could not save data that did not pass its local check." };
    }
    const boundedProfileId = boundedProfileIdentifier(validated.value.profileId);
    if (!boundedProfileId) {
      return { ok: false, message: "FORGE could not save data that did not pass its local check." };
    }

    let raw: string;
    try {
      raw = JSON.stringify(validated.value);
    } catch {
      return { ok: false, message: "FORGE could not save data that did not pass its local check." };
    }
    if (semesterDeskUtf8ByteLength(raw) > SEMESTER_DESK_MAX_RAW_JSON_UTF8_BYTES) {
      return { ok: false, message: "FORGE could not save local data that is too large." };
    }

    try {
      this.storage.setItem(
        semesterDeskStorageKey(boundedProfileId),
        raw,
      );
      return { ok: true };
    } catch {
      return storageFailure("save local data");
    }
  }

  async exportRaw(profileId: string): Promise<SemesterDeskExportResult> {
    if (profileId.trim().length === 0) {
      return { ok: false, message: "The local profile reference is empty." };
    }
    const boundedProfileId = boundedProfileIdentifier(profileId);
    if (!boundedProfileId) {
      return { ok: false, message: "The local profile reference is invalid." };
    }
    try {
      const raw = this.storage.getItem(semesterDeskStorageKey(boundedProfileId));
      if (raw === null) {
        return { ok: false, message: "There is no saved local data to download." };
      }
      return { ok: true, raw };
    } catch {
      return { ok: false, message: storageFailure("read local data").message };
    }
  }

  async reset(profileId: string): Promise<SemesterDeskPersistenceResult> {
    if (profileId.trim().length === 0) {
      return { ok: false, message: "The local profile reference is empty." };
    }
    const boundedProfileId = boundedProfileIdentifier(profileId);
    if (!boundedProfileId) {
      return { ok: false, message: "The local profile reference is invalid." };
    }
    try {
      const key = semesterDeskStorageKey(boundedProfileId);
      this.storage.removeItem(key);
      if (this.storage.getItem(key) !== null) {
        return {
          ok: false,
          message: "FORGE could not verify local data removal on this device.",
        };
      }
      return { ok: true };
    } catch {
      return storageFailure("remove local data");
    }
  }
}
