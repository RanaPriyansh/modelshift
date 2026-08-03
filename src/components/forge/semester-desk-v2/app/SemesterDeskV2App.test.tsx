// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSemesterDesk,
  SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES,
  transitionSemesterDesk,
  type CourseFactStatus,
  type SemesterDeskResult,
  type SemesterDeskRuntime,
  type SemesterDeskState,
} from "@/src/forge/semester-desk-v2";
import type {
  SemesterDeskExportResult,
  SemesterDeskPersistence,
  SemesterDeskPersistenceRead,
  SemesterDeskPersistenceResult,
} from "@/src/lib/forge-semester-desk-v2/persistence";
import {
  semesterDeskActiveProfileStorageKey,
  semesterDeskStorageKey,
} from "@/src/lib/forge-semester-desk-v2/persistence";

import { SemesterDeskV2App } from "./SemesterDeskV2App";

const PROFILE_ID = "profile.test";
let currentTime = "2026-08-03T09:00:00.000Z";
let sequence = 0;

function runtime(): SemesterDeskRuntime {
  return {
    clock: { now: () => currentTime },
    identifiers: { next: (kind) => `${kind}-${sequence++}` },
  };
}

function valueOf<T>(result: SemesterDeskResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function command(state: SemesterDeskState, input: Parameters<typeof transitionSemesterDesk>[1]): SemesterDeskState {
  return valueOf(transitionSemesterDesk(state, input, runtime()));
}

function makeDesk(factStatus: CourseFactStatus = "checked"): SemesterDeskState {
  let state = valueOf(createSemesterDesk({ profileId: PROFILE_ID, title: "Autumn 2026" }, runtime()));
  state = command(state, {
    kind: "add-course",
    profileId: PROFILE_ID,
    code: "CS201",
    title: "Algorithms",
  });
  const courseId = state.courses[0]?.id;
  if (!courseId) throw new Error("Expected course.");
  state = command(state, {
    kind: "add-course-fact",
    profileId: PROFILE_ID,
    courseId,
    label: "Problem set date",
    value: "2026-08-07",
    status: factStatus,
    sourceLabel: "Course outline",
    ...(factStatus === "checked" ? { checkedAt: currentTime } : {}),
  });
  state = command(state, {
    kind: "add-plan-item",
    profileId: PROFILE_ID,
    courseId,
    title: "Graph proof practice",
    date: "2026-08-05",
    minutes: 75,
  });
  return state;
}

function makeDeferredDesk(): SemesterDeskState {
  let state = makeDesk();
  const planItemId = state.planItems[0]?.id;
  if (!planItemId) throw new Error("Expected plan item.");
  state = command(state, {
    kind: "prepare-recovery",
    profileId: PROFILE_ID,
    summary: "Move this work out of the current week.",
    decisions: [{
      planItemId,
      outcome: "deferred",
      nextDate: "2026-08-12",
      reason: "This work needs a later date.",
    }],
  });
  return command(state, { kind: "confirm-recovery", profileId: PROFILE_ID });
}

class MemoryPersistence implements SemesterDeskPersistence {
  readonly saved: SemesterDeskState[] = [];
  readonly resets: string[] = [];
  failSave = false;
  failSaveAfterWrite = false;

  constructor(private state: SemesterDeskState | null, private malformed: string | null = null) {}

  get storedState(): SemesterDeskState | null {
    return this.state;
  }

  async read(profileId: string): Promise<SemesterDeskPersistenceRead> {
    if (this.malformed !== null) {
      return {
        kind: "malformed",
        raw: this.malformed,
        message: "The local data does not match this Semester Desk version.",
      };
    }
    if (!this.state || this.state.profileId !== profileId) return { kind: "missing" };
    return { kind: "loaded", state: this.state, raw: JSON.stringify(this.state) };
  }

  async save(state: SemesterDeskState): Promise<SemesterDeskPersistenceResult> {
    if (this.failSave) {
      if (this.failSaveAfterWrite) this.state = state;
      return { ok: false, message: "FORGE could not save local data on this device." };
    }
    this.state = state;
    this.saved.push(state);
    return { ok: true };
  }

  async exportRaw(profileId: string): Promise<SemesterDeskExportResult> {
    if (!this.state || this.state.profileId !== profileId) {
      return { ok: false, message: "There is no saved local data to download." };
    }
    return { ok: true, raw: JSON.stringify(this.state) };
  }

  async reset(profileId: string): Promise<SemesterDeskPersistenceResult> {
    this.resets.push(profileId);
    if (this.state?.profileId === profileId) this.state = null;
    return { ok: true };
  }
}

function renderApp(persistence: SemesterDeskPersistence, profileId: string | null = PROFILE_ID) {
  return render(
    <SemesterDeskV2App
      persistence={persistence}
      initialProfileId={profileId}
      now={() => currentTime}
      makeId={() => `ui-${sequence++}`}
    />,
  );
}

function renderBrowserApp() {
  return render(
    <SemesterDeskV2App
      now={() => currentTime}
      makeId={() => `ui-${sequence++}`}
    />,
  );
}

function saveBrowserDesk(state: SemesterDeskState, activeProfileId: string | null = state.profileId) {
  window.localStorage.setItem(semesterDeskStorageKey(state.profileId), JSON.stringify(state));
  if (activeProfileId === null) {
    window.localStorage.removeItem(semesterDeskActiveProfileStorageKey);
    return;
  }
  window.localStorage.setItem(semesterDeskActiveProfileStorageKey, activeProfileId);
}

function fillOnboarding() {
  fireEvent.change(screen.getByLabelText("Semester title"), { target: { value: "Autumn 2026" } });
  fireEvent.change(screen.getByLabelText("Course code"), { target: { value: "CS201" } });
  fireEvent.change(screen.getByLabelText("Course name"), { target: { value: "Algorithms" } });
  fireEvent.change(screen.getByLabelText("Course detail"), { target: { value: "Problem set date" } });
  fireEvent.change(screen.getByLabelText("What it says"), { target: { value: "2026-08-07" } });
  fireEvent.change(screen.getByLabelText("Where you saw it"), { target: { value: "Course outline" } });
  fireEvent.change(screen.getByLabelText("Work title"), { target: { value: "Graph proof practice" } });
  fireEvent.change(screen.getByLabelText("Planned date"), { target: { value: "2026-08-05" } });
  fireEvent.change(screen.getByLabelText("Minutes you expect"), { target: { value: "75" } });
}

afterEach(() => {
  cleanup();
  currentTime = "2026-08-03T09:00:00.000Z";
  sequence = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/app");
});

describe("SemesterDeskV2App", () => {
  it("opens a new device with an honest onboarding form and no invented course data", async () => {
    const persistence = new MemoryPersistence(null);
    renderApp(persistence, null);

    expect(await screen.findByRole("heading", { name: "Start with what is real." })).toBeInTheDocument();
    expect(screen.getByLabelText("Semester title")).toHaveValue("");
    expect(screen.getByLabelText("Course code")).toHaveValue("");
    expect(screen.getByLabelText("Work title")).toHaveValue("");

    fillOnboarding();
    fireEvent.click(screen.getByRole("button", { name: "Open your Semester Desk" }));

    expect(await screen.findByRole("heading", { name: "Every course stays visible." })).toBeInTheDocument();
    expect(screen.getByText("Algorithms")).toBeInTheDocument();
    await waitFor(() => expect(persistence.saved).toHaveLength(1));
    expect(persistence.saved[0]?.courses).toHaveLength(1);
  });

  it("keeps onboarding visible until the first local save finishes", async () => {
    let resolveSave!: (result: SemesterDeskPersistenceResult) => void;
    const firstSave = new Promise<SemesterDeskPersistenceResult>((resolve) => {
      resolveSave = resolve;
    });
    const persistence: SemesterDeskPersistence = {
      read: async () => ({ kind: "missing" }),
      save: async () => firstSave,
      exportRaw: async () => ({ ok: false, message: "There is no saved local data to download." }),
      reset: async () => ({ ok: true }),
    };
    renderApp(persistence, null);

    await screen.findByRole("heading", { name: "Start with what is real." });
    fillOnboarding();
    fireEvent.click(screen.getByRole("button", { name: "Open your Semester Desk" }));

    expect(screen.getByRole("heading", { name: "Start with what is real." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Opening your desk…" })).toBeDisabled();
    expect(window.location.hash).toBe("");

    resolveSave({ ok: true });
    expect(await screen.findByRole("heading", { name: "Every course stays visible." })).toBeInTheDocument();
    expect(window.location.hash).toContain("forge-profile=");
  });

  it("keeps onboarding open and removes an incomplete local profile when the first save fails", async () => {
    const persistence = new MemoryPersistence(null);
    persistence.failSave = true;
    persistence.failSaveAfterWrite = true;
    renderApp(persistence, null);

    await screen.findByRole("heading", { name: "Start with what is real." });
    fillOnboarding();
    fireEvent.click(screen.getByRole("button", { name: "Open your Semester Desk" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your desk did not open.");
    expect(screen.getByRole("heading", { name: "Start with what is real." })).toBeInTheDocument();
    expect(screen.getByLabelText("Semester title")).toHaveValue("Autumn 2026");
    expect(screen.getByLabelText("Course name")).toHaveValue("Algorithms");
    expect(persistence.resets).toHaveLength(1);
    expect(persistence.storedState).toBeNull();
    expect(window.location.hash).toBe("");
  });

  it("keeps a local profile isolated and fails closed for malformed storage", async () => {
    const malformed = new MemoryPersistence(null, "{not-valid-json");
    renderApp(malformed);

    expect(await screen.findByRole("heading", { name: "FORGE did not change your data." })).toBeInTheDocument();
    expect(malformed.saved).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Download unchanged JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset this device" })).toBeInTheDocument();
  });

  it("keeps the local profile in the selected key and exposes empty desk landmarks", async () => {
    const empty = valueOf(createSemesterDesk({ profileId: PROFILE_ID, title: "Autumn 2026" }, runtime()));
    const persistence = new MemoryPersistence(empty);
    renderApp(persistence);

    expect(await screen.findByRole("main")).toHaveAttribute("id", "semester-desk-main");
    expect(screen.getByText("No courses are in this desk yet.")).toBeInTheDocument();
    expect(screen.getByText("No work is in this desk yet.")).toBeInTheDocument();
  });

  it("shows a local-storage-unavailable recovery state when browser storage cannot be acquired", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage is blocked.", "SecurityError");
    });
    renderBrowserApp();

    expect(await screen.findByRole("heading", { name: "FORGE cannot use local storage." })).toBeInTheDocument();
    expect(screen.getByText(/FORGE did not open, change, or remove local desk data/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try local storage again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open your Semester Desk" })).not.toBeInTheDocument();
  });

  it("shows a local-storage-unavailable recovery state when a browser storage read throws", async () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new DOMException("Storage is blocked.", "SecurityError");
      }),
    } as unknown as Storage;
    vi.spyOn(window, "localStorage", "get").mockReturnValue(storage);
    renderBrowserApp();

    expect(await screen.findByRole("heading", { name: "FORGE cannot use local storage." })).toBeInTheDocument();
    expect(storage.getItem).toHaveBeenCalledWith(semesterDeskActiveProfileStorageKey);
    expect(screen.queryByRole("button", { name: "Open your Semester Desk" })).not.toBeInTheDocument();
  });

  it("keeps onboarding available after the skip link changes the fragment and after reload", async () => {
    const firstRender = renderBrowserApp();

    expect(await screen.findByRole("heading", { name: "Start with what is real." })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Semester title"), { target: { value: "Autumn recovery" } });
    expect(screen.getByLabelText("Semester title")).toHaveValue("Autumn recovery");
    fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }));

    await waitFor(() => expect(window.location.hash).toBe("#semester-desk-main"));
    expect(screen.getByRole("heading", { name: "Start with what is real." })).toBeInTheDocument();
    expect(screen.getByLabelText("Semester title")).toHaveValue("Autumn recovery");
    expect(screen.queryByRole("heading", { name: "FORGE did not change local data." })).not.toBeInTheDocument();

    window.history.back();
    await waitFor(() => expect(window.location.hash).toBe(""));
    expect(screen.getByRole("heading", { name: "Start with what is real." })).toBeInTheDocument();
    expect(screen.getByLabelText("Semester title")).toHaveValue("Autumn recovery");

    firstRender.unmount();
    renderBrowserApp();

    expect(await screen.findByRole("heading", { name: "Start with what is real." })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "FORGE did not change local data." })).not.toBeInTheDocument();
  });

  it("keeps an active protected-study draft after the skip link changes the fragment", async () => {
    const state = makeDesk();
    saveBrowserDesk(state);
    window.history.replaceState(null, "", `/app#forge-profile=${encodeURIComponent(PROFILE_ID)}`);
    renderBrowserApp();

    expect(await screen.findByText("Algorithms")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose this work" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start protected study" }));
    const note = await screen.findByLabelText("Your working notes");
    fireEvent.change(note, { target: { value: "Keep this local working note." } });
    expect(note).toHaveValue("Keep this local working note.");
    fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }));

    await waitFor(() => expect(window.location.hash).toBe("#semester-desk-main"));
    expect(await screen.findByLabelText("Your working notes")).toHaveValue("Keep this local working note.");
    expect(screen.queryByRole("heading", { name: "FORGE did not change local data." })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(semesterDeskActiveProfileStorageKey)).toBe(PROFILE_ID);

    window.history.back();
    await waitFor(() => expect(window.location.hash).toBe(`#forge-profile=${encodeURIComponent(PROFILE_ID)}`));
    expect(await screen.findByLabelText("Your working notes")).toHaveValue("Keep this local working note.");
  });

  it("keeps independent and delayed-return drafts through both skip-anchor history directions", async () => {
    const state = makeDesk();
    saveBrowserDesk(state);
    window.history.replaceState(null, "", `/app#forge-profile=${encodeURIComponent(PROFILE_ID)}`);
    renderBrowserApp();

    fireEvent.click(await screen.findByRole("button", { name: "Choose this work" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start protected study" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish practice" }));
    const proof = await screen.findByLabelText("Your active-recall response");
    fireEvent.change(proof, { target: { value: "Keep this active-recall response." } });
    fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }));

    await waitFor(() => expect(window.location.hash).toBe("#semester-desk-main"));
    window.history.back();
    await waitFor(() => expect(window.location.hash).toBe(`#forge-profile=${encodeURIComponent(PROFILE_ID)}`));
    expect(await screen.findByLabelText("Your active-recall response")).toHaveValue("Keep this active-recall response.");

    fireEvent.click(screen.getByRole("button", { name: "I showed my understanding" }));
    const returnDate = await screen.findByLabelText("Return date and time");
    fireEvent.change(returnDate, { target: { value: "2026-08-10T09:00" } });
    fireEvent.submit(returnDate.closest("form")!);
    currentTime = "2026-08-11T09:00:00.000Z";
    fireEvent.click(screen.getByRole("button", { name: "Open return" }));
    const explanation = await screen.findByLabelText("Your fresh explanation");
    fireEvent.change(explanation, { target: { value: "Keep this fresh explanation." } });
    fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }));

    await waitFor(() => expect(window.location.hash).toBe("#semester-desk-main"));
    window.history.back();
    await waitFor(() => expect(window.location.hash).toBe(`#forge-profile=${encodeURIComponent(PROFILE_ID)}`));
    expect(await screen.findByLabelText("Your fresh explanation")).toHaveValue("Keep this fresh explanation.");
  });

  it("opens local data from a direct policy route and keeps the selected desk through reload and history navigation", async () => {
    const state = makeDesk();
    saveBrowserDesk(state);
    window.history.replaceState(null, "", "/app?section=settings");

    const firstRender = renderBrowserApp();
    const settings = await screen.findByRole("heading", { name: "Your desk stays under your control." });
    await waitFor(() => expect(document.activeElement).toBe(settings.parentElement));
    expect(window.location.search).toBe("?section=settings");
    expect(window.location.hash).toBe(`#forge-profile=${encodeURIComponent(PROFILE_ID)}`);
    expect(screen.getByText("Algorithms")).toBeInTheDocument();

    firstRender.unmount();
    renderBrowserApp();
    const reloadedSettings = await screen.findByRole("heading", { name: "Your desk stays under your control." });
    await waitFor(() => expect(document.activeElement).toBe(reloadedSettings.parentElement));
    expect(window.location.hash).toBe(`#forge-profile=${encodeURIComponent(PROFILE_ID)}`);

    window.history.pushState(null, "", `/app#forge-profile=${encodeURIComponent(PROFILE_ID)}`);
    fireEvent.popState(window);
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(screen.getByText("Algorithms")).toBeInTheDocument();

    window.history.pushState(null, "", `/app?section=settings#forge-profile=${encodeURIComponent(PROFILE_ID)}`);
    fireEvent.popState(window);
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById("settings")));
    expect(window.location.search).toBe("?section=settings");
  });

  it("enforces the UTF-8 profile byte bound before it reads a local desk fragment", async () => {
    const state = makeDesk();
    saveBrowserDesk(state);
    const oversizedProfileId = "€".repeat(Math.floor(SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES / 3) + 1);
    window.history.replaceState(
      null,
      "",
      `/app?section=settings#forge-profile=${encodeURIComponent(oversizedProfileId)}`,
    );

    renderBrowserApp();

    expect(await screen.findByRole("heading", { name: "FORGE did not change local data." })).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByText("FORGE could not use this local desk link. It did not change local data.")).toBeInTheDocument();
    expect(window.localStorage.getItem(semesterDeskStorageKey(PROFILE_ID))).toBe(JSON.stringify(state));
    expect(window.localStorage.getItem(semesterDeskActiveProfileStorageKey)).toBe(PROFILE_ID);
    expect(screen.queryByText("Algorithms")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open your Semester Desk" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open saved local desk" }));
    expect(await screen.findByText("Algorithms")).toBeInTheDocument();
  });

  it("fails safely for an invalid active local profile reference without changing saved data", async () => {
    const state = makeDesk();
    saveBrowserDesk(state);
    const oversizedProfileId = "€".repeat(Math.floor(SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES / 3) + 1);
    window.localStorage.setItem(semesterDeskActiveProfileStorageKey, oversizedProfileId);
    window.history.replaceState(null, "", "/app?section=settings");

    renderBrowserApp();

    expect(await screen.findByRole("heading", { name: "FORGE did not change local data." })).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByText("FORGE could not identify the saved local desk. It did not change local data.")).toBeInTheDocument();
    expect(window.localStorage.getItem(semesterDeskStorageKey(PROFILE_ID))).toBe(JSON.stringify(state));
    expect(window.localStorage.getItem(semesterDeskActiveProfileStorageKey)).toBe(oversizedProfileId);
    expect(screen.queryByRole("button", { name: "Open your Semester Desk" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open saved local desk" })).not.toBeInTheDocument();
  });

  it("does not open a different local profile from a copied fragment", async () => {
    const currentDesk = makeDesk();
    const otherDesk = { ...makeDesk(), profileId: "profile.other" };
    saveBrowserDesk(currentDesk);
    window.localStorage.setItem(semesterDeskStorageKey(otherDesk.profileId), JSON.stringify(otherDesk));
    window.history.replaceState(null, "", "/app#forge-profile=profile.other");

    renderBrowserApp();

    expect(await screen.findByRole("heading", { name: "FORGE did not change local data." })).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByText("FORGE could not open that local desk from this link. It did not change local data.")).toBeInTheDocument();
    expect(screen.queryByText("Algorithms")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(semesterDeskStorageKey(otherDesk.profileId))).toBe(JSON.stringify(otherDesk));
    expect(screen.queryByRole("button", { name: "Open your Semester Desk" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open saved local desk" }));
    expect(await screen.findByText("Algorithms")).toBeInTheDocument();
    expect(window.location.hash).toBe(`#forge-profile=${encodeURIComponent(PROFILE_ID)}`);
  });

  it("clears the active profile reference only after the browser-local reset completes", async () => {
    const state = makeDesk();
    saveBrowserDesk(state);
    window.history.replaceState(null, "", `/app#forge-profile=${encodeURIComponent(PROFILE_ID)}`);
    renderBrowserApp();

    fireEvent.click(await screen.findByRole("button", { name: "Reset this device" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove local desk" }));

    expect(await screen.findByRole("heading", { name: "Start with what is real." })).toBeInTheDocument();
    expect(window.localStorage.getItem(semesterDeskStorageKey(PROFILE_ID))).toBeNull();
    expect(window.localStorage.getItem(semesterDeskActiveProfileStorageKey)).toBeNull();
    expect(window.location.hash).toBe("");
    const onboardingForm = screen.getByRole("button", { name: "Open your Semester Desk" }).closest("form");
    if (!onboardingForm) throw new Error("Expected the onboarding form.");
    expect(within(onboardingForm).getByText("The local desk was removed from this device.")).toBeInTheDocument();
  });

  it("requires a checked course detail before a student can choose the work", async () => {
    const persistence = new MemoryPersistence(makeDesk("not-confirmed"));
    renderApp(persistence);

    expect(await screen.findByRole("button", { name: "Check course details first" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Mark checked" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Choose this work" })).toBeEnabled());
  });

  it("shows fact freshness and lets the student record a conflict from two course details", async () => {
    let state = makeDesk();
    const courseId = state.courses[0]?.id;
    if (!courseId) throw new Error("Expected course.");
    state = command(state, {
      kind: "add-course-fact",
      profileId: PROFILE_ID,
      courseId,
      label: "Problem set date",
      value: "2026-08-10",
      status: "not-confirmed",
      sourceLabel: "Course page",
    });
    const persistence = new MemoryPersistence(state);
    renderApp(persistence);

    expect(await screen.findByText(/^Last checked /)).toBeInTheDocument();
    expect(screen.getByText("Not yet checked")).toBeInTheDocument();

    const conflictDisclosure = screen.getByText("Record a conflict").closest("details");
    if (!conflictDisclosure) throw new Error("Expected the conflict form.");
    fireEvent.click(within(conflictDisclosure).getByText("Record a conflict"));
    const recordButton = within(conflictDisclosure).getByRole("button", { name: "Record conflict" });
    expect(recordButton).toBeDisabled();
    fireEvent.click(within(conflictDisclosure).getByLabelText("Problem set date: 2026-08-07"));
    fireEvent.click(within(conflictDisclosure).getByLabelText("Problem set date: 2026-08-10"));
    fireEvent.change(within(conflictDisclosure).getByLabelText("Describe the conflict"), {
      target: { value: "The two pages show different due dates." },
    });
    expect(recordButton).toBeEnabled();
    fireEvent.click(recordButton);

    expect(await screen.findByText("The two pages show different due dates.")).toBeInTheDocument();
    await waitFor(() => expect(persistence.saved.at(-1)?.courses[0]?.sourceConflicts).toMatchObject([{
      factIds: expect.arrayContaining([expect.any(String), expect.any(String)]),
      summary: "The two pages show different due dates.",
      status: "open",
    }]));

    fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));
    expect(await screen.findByText("Reviewed")).toBeInTheDocument();
    await waitFor(() => expect(persistence.saved.at(-1)?.courses[0]?.sourceConflicts[0]?.status).toBe("reviewed"));
  });

  it("keeps capacity as a draft until the student confirms it", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    renderApp(persistence);

    const minutes = await screen.findByLabelText("Available minutes this week");
    fireEvent.change(minutes, { target: { value: "180" } });
    fireEvent.click(screen.getByRole("button", { name: "Set this time" }));
    expect(await screen.findByRole("button", { name: "Confirm 3 hrs" })).toBeInTheDocument();
    expect(screen.queryByText("You confirmed 3 hrs.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm 3 hrs" }));
    expect(await screen.findByText("You confirmed 3 hrs.")).toBeInTheDocument();
  });

  it("keeps recovery choices visible before and after confirmation", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    renderApp(persistence);

    expect(await screen.findByRole("heading", { name: "Rebuild this week in the open." })).toBeInTheDocument();
    const reason = screen.getByLabelText("Why this is honest today");
    expect(reason).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Review these changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Write why this is honest today.");
    expect(reason).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(screen.getByLabelText("Keep, move, reduce, or defer"), { target: { value: "moved" } });
    fireEvent.change(reason, { target: { value: "This work still fits today." } });
    fireEvent.click(screen.getByRole("button", { name: "Review these changes" }));
    const date = await screen.findByLabelText(/^New date/);
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a different date.");
    expect(date).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(date, { target: { value: "2026-08-06" } });
    fireEvent.click(screen.getByRole("button", { name: "Review these changes" }));
    expect(await screen.findByRole("button", { name: "Confirm these changes" })).toBeInTheDocument();
    expect(screen.getByText("Moved")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm these changes" }));
    expect(await screen.findByRole("heading", { name: "What changed" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What changed" }).parentElement)
      .toHaveTextContent("This work still fits today.");
  });

  it("shows an honest resume action for deferred work", async () => {
    const persistence = new MemoryPersistence(makeDeferredDesk());
    renderApp(persistence);

    fireEvent.click(await screen.findByRole("button", { name: "Resume this work" }));
    expect(await screen.findByRole("button", { name: "Choose this work" })).toBeEnabled();
  });

  it("lets a student add courses, course details, and planned work after onboarding", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    const rendered = renderApp(persistence);

    await screen.findByRole("button", { name: "Add course" });
    fireEvent.change(screen.getByLabelText("Course code"), { target: { value: "BIO101" } });
    fireEvent.change(screen.getByLabelText("Course name"), { target: { value: "Biology" } });
    fireEvent.click(screen.getByRole("button", { name: "Add course" }));
    expect(await screen.findByText("Biology")).toBeInTheDocument();
    await waitFor(() => expect(persistence.saved.at(-1)?.courses).toHaveLength(2));
    const biologyCourseId = persistence.saved.at(-1)?.courses[1]?.id;
    if (!biologyCourseId) throw new Error("Expected the added course.");

    const detailForms = Array.from(rendered.container.querySelectorAll("details")).filter((element) => (
      element.querySelector("summary")?.textContent === "Add a course detail"
    ));
    const newCourseDetails = detailForms[1];
    if (!newCourseDetails) throw new Error("Expected the new course detail form.");
    fireEvent.click(within(newCourseDetails).getByText("Add a course detail"));
    fireEvent.change(within(newCourseDetails).getByLabelText("Detail"), { target: { value: "Lab time" } });
    fireEvent.change(within(newCourseDetails).getByLabelText("What it says"), { target: { value: "Thursday" } });
    fireEvent.change(within(newCourseDetails).getByLabelText("Where you saw it"), { target: { value: "Course page" } });
    fireEvent.click(within(newCourseDetails).getByRole("button", { name: "Add course detail" }));
    expect(await screen.findByText("Lab time")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Course"), { target: { value: biologyCourseId } });
    fireEvent.change(screen.getByLabelText("Work title"), { target: { value: "Lab preparation" } });
    fireEvent.change(screen.getByLabelText("Planned date"), { target: { value: "2026-08-08" } });
    fireEvent.change(screen.getByLabelText("Minutes"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "Add work" }));
    expect((await screen.findAllByText("Lab preparation")).length).toBeGreaterThan(0);
  });

  it("keeps protected practice open with its local note when the student needs more work", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    renderApp(persistence);

    fireEvent.click(await screen.findByRole("button", { name: "Choose this work" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start protected study" }));
    const note = await screen.findByLabelText("Your working notes");
    fireEvent.change(note, { target: { value: "Keep working on this proof." } });
    fireEvent.click(screen.getByRole("button", { name: "I need more work" }));

    expect(await screen.findByLabelText("Your working notes")).toHaveValue("Keep working on this proof.");
    expect(screen.queryByLabelText("Your active-recall response")).not.toBeInTheDocument();
  });

  it("requires an active-recall response before it records an independent outcome", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    renderApp(persistence);

    fireEvent.click(await screen.findByRole("button", { name: "Choose this work" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start protected study" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish practice" }));

    const response = await screen.findByLabelText("Your active-recall response");
    fireEvent.change(response, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "I need to return to this" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Write an active-recall response before you record this outcome.");
    expect(response).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByLabelText("Return date and time")).not.toBeInTheDocument();
    expect(persistence.saved.at(-1)?.independentProofs).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "I showed my understanding" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Write an active-recall response before you record this outcome.");
    expect(response).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByLabelText("Return date and time")).not.toBeInTheDocument();
    expect(persistence.saved.at(-1)?.independentProofs).toHaveLength(0);
  });

  it("requires a fresh explanation before it records a delayed-return outcome", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    renderApp(persistence);

    fireEvent.click(await screen.findByRole("button", { name: "Choose this work" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start protected study" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish practice" }));
    fireEvent.change(await screen.findByLabelText("Your active-recall response"), { target: { value: "A local response." } });
    fireEvent.click(screen.getByRole("button", { name: "I showed my understanding" }));
    const returnDate = await screen.findByLabelText("Return date and time");
    fireEvent.change(returnDate, { target: { value: "2026-08-10T09:00" } });
    fireEvent.submit(returnDate.closest("form")!);

    currentTime = "2026-08-11T09:00:00.000Z";
    fireEvent.click(screen.getByRole("button", { name: "Open return" }));
    const explanation = await screen.findByLabelText("Your fresh explanation");
    fireEvent.change(explanation, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "I need more work" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Write a fresh explanation before you record this outcome.");
    expect(explanation).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Delayed return · Needs more work")).not.toBeInTheDocument();
    expect(persistence.saved.at(-1)?.delayedReturns[0]).toMatchObject({ status: "open" });

    fireEvent.click(screen.getByRole("button", { name: "I retained it" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Write a fresh explanation before you record this outcome.");
    expect(explanation).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Delayed return · Retained")).not.toBeInTheDocument();
    expect(persistence.saved.at(-1)?.delayedReturns[0]).toMatchObject({ status: "open" });
  });

  it("runs the chosen study, independent check, and delayed return without saving raw answer text", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    renderApp(persistence);

    fireEvent.click(await screen.findByRole("button", { name: "Choose this work" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start protected study" }));
    fireEvent.change(await screen.findByLabelText("Your working notes"), { target: { value: "PRIVATE_PRACTICE_TEXT" } });
    fireEvent.click(screen.getByRole("button", { name: "Finish practice" }));

    fireEvent.change(await screen.findByLabelText("Your active-recall response"), { target: { value: "PRIVATE_PROOF_TEXT" } });
    fireEvent.click(screen.getByRole("button", { name: "I showed my understanding" }));
    const returnDate = await screen.findByLabelText("Return date and time");
    fireEvent.change(returnDate, { target: { value: "2026-08-10T09:00" } });
    fireEvent.submit(returnDate.closest("form")!);

    await waitFor(() => expect(persistence.saved.length).toBeGreaterThan(4));
    expect(JSON.stringify(persistence.saved)).not.toContain("PRIVATE_PRACTICE_TEXT");
    expect(JSON.stringify(persistence.saved)).not.toContain("PRIVATE_PROOF_TEXT");

    currentTime = "2026-08-11T09:00:00.000Z";
    fireEvent.click(screen.getByRole("button", { name: "Open return" }));
    fireEvent.change(await screen.findByLabelText("Your fresh explanation"), { target: { value: "PRIVATE_RETURN_TEXT" } });
    fireEvent.click(await screen.findByRole("button", { name: "I retained it" }));
    expect(await screen.findByText("Protected practice · Practice complete")).toBeInTheDocument();
    expect(screen.getByText("Independent check · Demonstrated")).toBeInTheDocument();
    expect(await screen.findByText("Delayed return · Retained")).toBeInTheDocument();
    expect(screen.getAllByText(/^Recorded /).at(-1)).toHaveAttribute("dateTime", currentTime);
    expect(JSON.stringify(persistence.saved)).not.toContain("PRIVATE_RETURN_TEXT");

    const exported = await persistence.exportRaw(PROFILE_ID);
    expect(exported).toMatchObject({ ok: true });
    if (exported.ok) {
      expect(exported.raw).not.toContain("PRIVATE_PRACTICE_TEXT");
      expect(exported.raw).not.toContain("PRIVATE_PROOF_TEXT");
      expect(exported.raw).not.toContain("PRIVATE_RETURN_TEXT");
    }
  });

  it("keeps entered state visible when a save fails and supports a local reset confirmation", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    persistence.failSave = true;
    renderApp(persistence);

    const minutes = await screen.findByLabelText("Available minutes this week");
    fireEvent.change(minutes, { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "Set this time" }));
    expect(await screen.findByRole("alert", { name: "Local save problem" })).toHaveTextContent("could not save");
    expect(minutes).toHaveValue(90);

    fireEvent.click(screen.getByRole("button", { name: "Reset this device" }));
    expect(await screen.findByRole("alertdialog", { name: "Remove this local desk?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove local desk" }));
    expect(await screen.findByRole("heading", { name: "Start with what is real." })).toBeInTheDocument();
    expect(persistence.resets).toEqual([PROFILE_ID]);
  });

  it("keeps focus in the reset dialog and returns it after Escape", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    renderApp(persistence);

    const resetButton = await screen.findByRole("button", { name: "Reset this device" });
    resetButton.focus();
    fireEvent.click(resetButton);

    const dialog = await screen.findByRole("alertdialog", { name: "Remove this local desk?" });
    const cancelButton = within(dialog).getByRole("button", { name: "Cancel" });
    const downloadButton = within(dialog).getByRole("button", { name: "Download JSON" });
    expect(cancelButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(downloadButton).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(cancelButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await waitFor(() => expect(resetButton).toHaveFocus());
  });

  it("uses human product language in the mobile-ready landmark surface", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    renderApp(persistence);

    expect(await screen.findByRole("main")).toHaveAttribute("id", "semester-desk-main");
    const copy = document.body.textContent?.toLowerCase() ?? "";
    for (const forbidden of ["fixture", "authority", "receipt", "projection", "protocol"]) {
      expect(copy).not.toContain(forbidden);
    }
  });
});
