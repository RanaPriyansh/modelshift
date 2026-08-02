// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import {
  createSemesterDesk,
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

    expect(await persistence.read(first.profileId)).toEqual({ kind: "missing" });
    expect(await persistence.read(second.profileId)).toMatchObject({
      kind: "loaded",
      state: { profileId: second.profileId },
    });
  });
});
