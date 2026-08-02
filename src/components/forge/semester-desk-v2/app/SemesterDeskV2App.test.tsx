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

  constructor(private state: SemesterDeskState | null, private malformed: string | null = null) {}

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
    if (this.failSave) return { ok: false, message: "FORGE could not save local data on this device." };
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

afterEach(() => {
  cleanup();
  currentTime = "2026-08-03T09:00:00.000Z";
  sequence = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

    fireEvent.change(screen.getByLabelText("Semester title"), { target: { value: "Autumn 2026" } });
    fireEvent.change(screen.getByLabelText("Course code"), { target: { value: "CS201" } });
    fireEvent.change(screen.getByLabelText("Course name"), { target: { value: "Algorithms" } });
    fireEvent.change(screen.getByLabelText("Course detail"), { target: { value: "Problem set date" } });
    fireEvent.change(screen.getByLabelText("What it says"), { target: { value: "2026-08-07" } });
    fireEvent.change(screen.getByLabelText("Where you saw it"), { target: { value: "Course outline" } });
    fireEvent.change(screen.getByLabelText("Work title"), { target: { value: "Graph proof practice" } });
    fireEvent.change(screen.getByLabelText("Planned date"), { target: { value: "2026-08-05" } });
    fireEvent.change(screen.getByLabelText("Minutes you expect"), { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: "Open your Semester Desk" }));

    expect(await screen.findByRole("heading", { name: "Every course stays visible." })).toBeInTheDocument();
    expect(screen.getByText("Algorithms")).toBeInTheDocument();
    await waitFor(() => expect(persistence.saved).toHaveLength(1));
    expect(persistence.saved[0]?.courses).toHaveLength(1);
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

  it("requires a checked course detail before a student can choose the work", async () => {
    const persistence = new MemoryPersistence(makeDesk("not-confirmed"));
    renderApp(persistence);

    expect(await screen.findByRole("button", { name: "Check course details first" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Mark checked" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Choose this work" })).toBeEnabled());
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
    fireEvent.change(reason, { target: { value: "This work still fits today." } });
    fireEvent.click(screen.getByRole("button", { name: "Review these changes" }));
    expect(await screen.findByRole("button", { name: "Confirm these changes" })).toBeInTheDocument();
    expect(screen.getByText("Kept")).toBeInTheDocument();

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

    const detailForms = rendered.container.querySelectorAll("details");
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
    expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
  });

  it("runs the chosen study, independent check, and delayed return without saving raw answer text", async () => {
    const persistence = new MemoryPersistence(makeDesk());
    renderApp(persistence);

    fireEvent.click(await screen.findByRole("button", { name: "Choose this work" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start protected study" }));
    fireEvent.change(await screen.findByLabelText("Your working notes"), { target: { value: "PRIVATE_PRACTICE_TEXT" } });
    fireEvent.click(screen.getByRole("button", { name: "Finish practice" }));

    fireEvent.change(await screen.findByLabelText("Your answer"), { target: { value: "PRIVATE_PROOF_TEXT" } });
    fireEvent.click(screen.getByRole("button", { name: "I showed my understanding" }));
    const returnDate = await screen.findByLabelText("Return date and time");
    fireEvent.change(returnDate, { target: { value: "2026-08-10T09:00" } });
    fireEvent.submit(returnDate.closest("form")!);

    await waitFor(() => expect(persistence.saved.length).toBeGreaterThan(4));
    expect(JSON.stringify(persistence.saved)).not.toContain("PRIVATE_PRACTICE_TEXT");
    expect(JSON.stringify(persistence.saved)).not.toContain("PRIVATE_PROOF_TEXT");

    currentTime = "2026-08-11T09:00:00.000Z";
    fireEvent.click(screen.getByRole("button", { name: "Open return" }));
    fireEvent.click(await screen.findByRole("button", { name: "I retained it" }));
    expect(await screen.findByText("delayed return completed · retained")).toBeInTheDocument();
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
