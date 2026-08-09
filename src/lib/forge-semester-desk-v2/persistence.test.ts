// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSemesterDesk,
  SEMESTER_DESK_MAX_COURSES,
  SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES,
  SEMESTER_DESK_MAX_PLAN_ITEMS,
  SEMESTER_DESK_MAX_RAW_JSON_UTF8_BYTES,
  SEMESTER_DESK_MAX_TEXT_UTF8_BYTES,
  type SemesterDeskResult,
  type SemesterDeskRuntime,
  type SemesterDeskState,
} from "@/src/forge/semester-desk-v2";

import {
  BrowserSemesterDeskPersistence,
  semesterDeskStorageKey,
} from "./persistence";

function valueOf<T>(result: SemesterDeskResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function desk(profileId: string): SemesterDeskState {
  let sequence = 0;
  const runtime: SemesterDeskRuntime = {
    clock: { now: () => "2026-08-03T09:00:00.000Z" },
    identifiers: { next: (kind) => `${kind}-${sequence++}` },
  };
  return valueOf(createSemesterDesk({ profileId, title: "Autumn 2026" }, runtime));
}

afterEach(() => {
  window.localStorage.clear();
});

function storageWith(overrides: Partial<Storage>): Storage {
  return {
    get length() { return 0; },
    clear() {},
    getItem() { return null; },
    key() { return null; },
    removeItem() {},
    setItem() {},
    ...overrides,
  } as Storage;
}

describe("BrowserSemesterDeskPersistence", () => {
  it("uses one versioned profile-bound key and keeps profiles separate", async () => {
    const persistence = new BrowserSemesterDeskPersistence(window.localStorage);
    const first = desk("profile.first");
    const second = desk("profile.second");

    await persistence.save(first);
    await persistence.save(second);

    expect(semesterDeskStorageKey(first.profileId)).toBe(
      "forge.semester-desk-v2.v1.profile.profile.first",
    );
    expect(window.localStorage.length).toBe(2);
    expect(await persistence.read(first.profileId)).toMatchObject({
      kind: "loaded",
      state: { profileId: first.profileId, title: "Autumn 2026" },
    });
    expect(await persistence.read("profile.missing")).toEqual({ kind: "missing" });
  });

  it("fails closed for malformed or cross-profile local data without replacing it", async () => {
    const persistence = new BrowserSemesterDeskPersistence(window.localStorage);
    const first = desk("profile.first");
    const raw = JSON.stringify({ ...first, unexpected: "must-not-pass" });
    const key = semesterDeskStorageKey(first.profileId);
    window.localStorage.setItem(key, raw);

    const malformed = await persistence.read(first.profileId);
    expect(malformed).toMatchObject({ kind: "malformed", raw });
    expect(window.localStorage.getItem(key)).toBe(raw);

    window.localStorage.setItem(key, JSON.stringify({ ...first, profileId: "profile.other" }));
    expect(await persistence.read(first.profileId)).toMatchObject({
      kind: "malformed",
      message: "The local data belongs to a different profile.",
    });
    expect(window.localStorage.getItem(key)).toBe(JSON.stringify({ ...first, profileId: "profile.other" }));
  });

  it("exports the exact saved JSON before a targeted reset", async () => {
    const persistence = new BrowserSemesterDeskPersistence(window.localStorage);
    const first = desk("profile.first");
    const second = desk("profile.second");
    await persistence.save(first);
    await persistence.save(second);

    const raw = window.localStorage.getItem(semesterDeskStorageKey(first.profileId));
    expect(raw).not.toBeNull();
    await expect(persistence.exportRaw(first.profileId)).resolves.toEqual({ ok: true, raw });
    await expect(persistence.reset(first.profileId)).resolves.toEqual({ ok: true });

    expect(window.localStorage.getItem(semesterDeskStorageKey(first.profileId))).toBeNull();
    expect(await persistence.read(first.profileId)).toEqual({ kind: "missing" });
    expect(await persistence.read(second.profileId)).toMatchObject({
      kind: "loaded",
      state: { profileId: second.profileId },
    });
  });

  it("reports a failed reset when storage silently keeps the profile data", async () => {
    const profileId = "profile.silent-reset";
    const key = semesterDeskStorageKey(profileId);
    const raw = JSON.stringify(desk(profileId));
    const removeItem = vi.fn<Storage["removeItem"]>();
    const storage = storageWith({
      getItem(requestedKey) {
        return requestedKey === key ? raw : null;
      },
      removeItem,
    });
    const persistence = new BrowserSemesterDeskPersistence(storage);

    await expect(persistence.reset(profileId)).resolves.toEqual({
      ok: false,
      message: "FORGE could not verify local data removal on this device.",
    });
    expect(removeItem).toHaveBeenCalledWith(key);
    expect(storage.getItem(key)).toBe(raw);
  });

  it("exports raw local data byte for byte, even when the data needs review", async () => {
    const persistence = new BrowserSemesterDeskPersistence(window.localStorage);
    const profileId = "profile.exact";
    const raw = '{\n  "kept": "exact bytes",\n  "invalidForDesk": true\n}';
    window.localStorage.setItem(semesterDeskStorageKey(profileId), raw);

    await expect(persistence.exportRaw(profileId)).resolves.toEqual({ ok: true, raw });
    expect(await persistence.read(profileId)).toMatchObject({ kind: "malformed", raw });
    expect(window.localStorage.getItem(semesterDeskStorageKey(profileId))).toBe(raw);
  });

  it("reports local storage read, save, and reset failures without changing stored data", async () => {
    const profileId = "profile.failures";
    const state = desk(profileId);
    const readPersistence = new BrowserSemesterDeskPersistence(storageWith({
      getItem() { throw new Error("read blocked"); },
    }));
    await expect(readPersistence.read(profileId)).resolves.toMatchObject({
      kind: "malformed",
      raw: "",
      message: "FORGE could not read local data on this device.",
    });
    await expect(readPersistence.exportRaw(profileId)).resolves.toEqual({
      ok: false,
      message: "FORGE could not read local data on this device.",
    });

    const savePersistence = new BrowserSemesterDeskPersistence(storageWith({
      setItem() { throw new Error("save blocked"); },
    }));
    await expect(savePersistence.save(state)).resolves.toEqual({
      ok: false,
      message: "FORGE could not save local data on this device.",
    });

    const resetPersistence = new BrowserSemesterDeskPersistence(storageWith({
      removeItem() { throw new Error("reset blocked"); },
    }));
    await expect(resetPersistence.reset(profileId)).resolves.toEqual({
      ok: false,
      message: "FORGE could not remove local data on this device.",
    });
  });

  it("rejects extra keys, malformed arrays, and repeated references before storage", async () => {
    const setItem = vi.fn<Storage["setItem"]>();
    const persistence = new BrowserSemesterDeskPersistence(storageWith({ setItem }));
    const state = desk("profile.structural-save");
    const withExtraKey = {
      ...state,
      unexpected: "must-not-pass",
    } as unknown as SemesterDeskState;
    const sparseCourses = new Array<SemesterDeskState["courses"][number]>(1);
    const withSparseArray: SemesterDeskState = {
      ...state,
      courses: sparseCourses,
    };
    const shared: [] = [];
    const withRepeatedReference: SemesterDeskState = {
      ...state,
      courses: [{
        id: "course-shared",
        code: "SHARED",
        title: "Shared container",
        facts: shared,
        sourceConflicts: shared,
      }],
    };

    for (const candidate of [withExtraKey, withSparseArray, withRepeatedReference]) {
      await expect(persistence.save(candidate)).resolves.toEqual({
        ok: false,
        message: "FORGE could not save data that did not pass its local check.",
      });
    }
    expect(setItem).not.toHaveBeenCalled();
  });

  it("does not invoke caller getters and contains hostile Proxy failures", async () => {
    const setItem = vi.fn<Storage["setItem"]>();
    const persistence = new BrowserSemesterDeskPersistence(storageWith({ setItem }));
    const getter = vi.fn(() => {
      throw new Error("private getter detail");
    });
    const accessor = { ...desk("profile.accessor") } as Record<string, unknown>;
    Object.defineProperty(accessor, "title", {
      configurable: true,
      enumerable: true,
      get: getter,
    });
    const ownKeys = vi.fn(() => {
      throw new Error("private proxy detail");
    });
    const proxy = new Proxy(desk("profile.proxy"), { ownKeys });

    for (const candidate of [accessor, proxy]) {
      await expect(
        persistence.save(candidate as unknown as SemesterDeskState),
      ).resolves.toEqual({
        ok: false,
        message: "FORGE could not save data that did not pass its local check.",
      });
    }
    expect(getter).not.toHaveBeenCalled();
    expect(ownKeys).toHaveBeenCalledTimes(1);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("rejects an invalid profile identifier before it reaches a storage key", async () => {
    const getItem = vi.fn<Storage["getItem"]>();
    const removeItem = vi.fn<Storage["removeItem"]>();
    const persistence = new BrowserSemesterDeskPersistence(storageWith({ getItem, removeItem }));
    const oversizedProfileId = "€".repeat(Math.floor(SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES / 3) + 1);
    const illFormedProfileId = "\uD800";

    for (const invalidProfileId of [oversizedProfileId, illFormedProfileId]) {
      await expect(persistence.read(invalidProfileId)).resolves.toEqual({
        kind: "malformed",
        raw: "",
        message: "The local profile reference is invalid.",
      });
      await expect(persistence.exportRaw(invalidProfileId)).resolves.toEqual({
        ok: false,
        message: "The local profile reference is invalid.",
      });
      await expect(persistence.reset(invalidProfileId)).resolves.toEqual({
        ok: false,
        message: "The local profile reference is invalid.",
      });
    }
    for (const invalidProfileId of ["", " profile.spaced ", oversizedProfileId, illFormedProfileId]) {
      expect(() => semesterDeskStorageKey(invalidProfileId)).toThrowError(
        "The profile identifier is invalid.",
      );
    }
    expect(semesterDeskStorageKey("\uFFFD")).toBe(
      "forge.semester-desk-v2.v1.profile.%EF%BF%BD",
    );
    expect(getItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it("bounds raw UTF-8 data before JSON parsing and keeps the bytes available", async () => {
    const persistence = new BrowserSemesterDeskPersistence(window.localStorage);
    const profileId = "profile.oversized";
    const raw = "😀".repeat(Math.floor(SEMESTER_DESK_MAX_RAW_JSON_UTF8_BYTES / 4) + 1);
    const key = semesterDeskStorageKey(profileId);
    window.localStorage.setItem(key, raw);

    await expect(persistence.read(profileId)).resolves.toEqual({
      kind: "malformed",
      raw,
      message: "The local data is too large to use.",
    });
    expect(window.localStorage.getItem(key)).toBe(raw);
    await expect(persistence.exportRaw(profileId)).resolves.toEqual({ ok: true, raw });
  });

  it("accepts the course limit and rejects oversized arrays and strings without overwriting data", async () => {
    const persistence = new BrowserSemesterDeskPersistence(window.localStorage);
    const profileId = "profile.bounds";
    const base = desk(profileId);
    const courses = Array.from({ length: SEMESTER_DESK_MAX_COURSES }, (_, index) => ({
      id: `course-${index}`,
      code: `C${index}`,
      title: `Course ${index}`,
      facts: [],
      sourceConflicts: [],
    }));
    const atLimit: SemesterDeskState = { ...base, courses };
    await expect(persistence.save(atLimit)).resolves.toEqual({ ok: true });
    const savedRaw = window.localStorage.getItem(semesterDeskStorageKey(profileId));
    await expect(persistence.read(profileId)).resolves.toMatchObject({
      kind: "loaded",
      state: { courses: expect.arrayContaining([expect.objectContaining({ code: "C63" })]) },
    });

    const tooManyCourses: SemesterDeskState = {
      ...atLimit,
      courses: [...courses, {
        id: "course-overflow",
        code: "C-overflow",
        title: "Overflow course",
        facts: [],
        sourceConflicts: [],
      }],
    };
    const oversizedText: SemesterDeskState = {
      ...atLimit,
      title: "x".repeat(SEMESTER_DESK_MAX_TEXT_UTF8_BYTES + 1),
    };

    await expect(persistence.save(tooManyCourses)).resolves.toMatchObject({ ok: false });
    await expect(persistence.save(oversizedText)).resolves.toMatchObject({ ok: false });
    expect(window.localStorage.getItem(semesterDeskStorageKey(profileId))).toBe(savedRaw);
  });

  it("accepts the complete plan-item limit without a smaller snapshot limit", async () => {
    const persistence = new BrowserSemesterDeskPersistence(window.localStorage);
    const profileId = "profile.plan-limit";
    const base = desk(profileId);
    const course = {
      id: "course-plan-limit",
      code: "LIMIT",
      title: "Limit course",
      facts: [],
      sourceConflicts: [],
    };
    const planItems = Array.from({ length: SEMESTER_DESK_MAX_PLAN_ITEMS }, (_, index) => ({
      id: `plan-limit-${index}`,
      courseId: course.id,
      title: "Work",
      originalDate: "2026-08-03",
      currentDate: "2026-08-03",
      originalMinutes: 1,
      currentMinutes: 1,
      status: "planned" as const,
    }));
    const atLimit: SemesterDeskState = {
      ...base,
      courses: [course],
      planItems,
    };

    await expect(persistence.save(atLimit)).resolves.toEqual({ ok: true });
    const loaded = await persistence.read(profileId);
    expect(loaded.kind).toBe("loaded");
    if (loaded.kind !== "loaded") throw new Error("Expected the saved plan-item boundary.");
    expect(loaded.state.planItems).toHaveLength(SEMESTER_DESK_MAX_PLAN_ITEMS);

    await expect(persistence.save({
      ...atLimit,
      planItems: [...planItems, { ...planItems[0]!, id: "plan-limit-overflow" }],
    })).resolves.toEqual({
      ok: false,
      message: "FORGE could not save data that did not pass its local check.",
    });
  });

  it("rejects structural-looking semantic corruption without replacing the saved raw data", async () => {
    const persistence = new BrowserSemesterDeskPersistence(window.localStorage);
    const state = desk("profile.semantic");
    const invalid: SemesterDeskState = {
      ...state,
      createdAt: "2026-02-30T09:00:00.000Z",
    };
    const raw = JSON.stringify(invalid);
    const key = semesterDeskStorageKey(invalid.profileId);
    window.localStorage.setItem(key, raw);

    await expect(persistence.read(invalid.profileId)).resolves.toEqual({
      kind: "malformed",
      raw,
      message: "The local data does not match this Semester Desk version.",
    });
    expect(window.localStorage.getItem(key)).toBe(raw);
  });

  it("rejects a plan item that names a missing course", async () => {
    const persistence = new BrowserSemesterDeskPersistence(window.localStorage);
    const state = desk("profile.relationship");
    const invalid: SemesterDeskState = {
      ...state,
      planItems: [{
        id: "plan-missing-course",
        courseId: "course-missing",
        title: "Read chapter one",
        originalDate: "2026-08-03",
        currentDate: "2026-08-03",
        originalMinutes: 30,
        currentMinutes: 30,
        status: "planned",
      }],
    };
    const raw = JSON.stringify(invalid);
    const key = semesterDeskStorageKey(invalid.profileId);
    window.localStorage.setItem(key, raw);

    await expect(persistence.read(invalid.profileId)).resolves.toEqual({
      kind: "malformed",
      raw,
      message: "The local data does not match this Semester Desk version.",
    });
    await expect(persistence.save(invalid)).resolves.toEqual({
      ok: false,
      message: "FORGE could not save data that did not pass its local check.",
    });
    expect(window.localStorage.getItem(key)).toBe(raw);
  });
});
