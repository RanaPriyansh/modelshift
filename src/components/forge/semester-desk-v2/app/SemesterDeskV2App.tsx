"use client";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import {
  createSemesterDesk,
  orderedPlanItems,
  progressEvidenceFor,
  transitionSemesterDesk,
  type CourseFactStatus,
  type RecoveryOutcome,
  type SemesterDeskCommand,
  type SemesterDeskResult,
  type SemesterDeskRuntime,
  type SemesterDeskState,
} from "@/src/forge/semester-desk-v2";
import {
  BrowserSemesterDeskPersistence,
  normalizeSemesterDeskProfileIdentifier,
  semesterDeskActiveProfileStorageKey,
  type SemesterDeskPersistence,
  type SemesterDeskPersistenceRead,
  type SemesterDeskPersistenceResult,
} from "@/src/lib/forge-semester-desk-v2/persistence";

import styles from "./SemesterDeskV2App.module.css";

type AppScreen = "loading" | "onboarding" | "ready" | "malformed" | "blocked";
type SaveStatus = "saved" | "saving" | "error";
type AppSection = "overview" | "settings";

type BlockedLocalReference = {
  readonly message: string;
  readonly activeProfileId: string | null;
};

type ProfileLocation =
  | { readonly kind: "missing"; readonly section: AppSection }
  | { readonly kind: "profile"; readonly profileId: string; readonly section: AppSection }
  | { readonly kind: "invalid"; readonly section: AppSection };

type ActiveProfileReference =
  | { readonly kind: "missing" }
  | { readonly kind: "profile"; readonly profileId: string }
  | { readonly kind: "invalid" }
  | { readonly kind: "unavailable" };

type OnboardingDraft = {
  readonly semesterTitle: string;
  readonly courseCode: string;
  readonly courseTitle: string;
  readonly factLabel: string;
  readonly factValue: string;
  readonly factStatus: "checked" | "not-confirmed";
  readonly factSource: string;
  readonly workTitle: string;
  readonly workDate: string;
  readonly workMinutes: string;
};

type RecoveryChoice = {
  readonly outcome: RecoveryOutcome;
  readonly reason: string;
  readonly nextDate: string;
  readonly nextMinutes: string;
};

type CourseDraft = {
  readonly code: string;
  readonly title: string;
};

type CourseFactDraft = {
  readonly label: string;
  readonly value: string;
  readonly status: CourseFactStatus;
  readonly sourceLabel: string;
};

type ConflictDraft = {
  readonly factIds: readonly string[];
  readonly summary: string;
};

type PlanItemDraft = {
  readonly courseId: string;
  readonly title: string;
  readonly date: string;
  readonly minutes: string;
};

const emptyOnboardingDraft: OnboardingDraft = {
  semesterTitle: "",
  courseCode: "",
  courseTitle: "",
  factLabel: "",
  factValue: "",
  factStatus: "checked",
  factSource: "",
  workTitle: "",
  workDate: "",
  workMinutes: "",
};

const emptyCourseDraft: CourseDraft = { code: "", title: "" };
const emptyCourseFactDraft: CourseFactDraft = {
  label: "",
  value: "",
  status: "not-confirmed",
  sourceLabel: "",
};
const emptyConflictDraft: ConflictDraft = { factIds: [], summary: "" };
const emptyPlanItemDraft: PlanItemDraft = {
  courseId: "",
  title: "",
  date: "",
  minutes: "",
};

const recoveryLabels: Record<RecoveryOutcome, string> = {
  kept: "Kept",
  moved: "Moved",
  reduced: "Reduced",
  deferred: "Deferred",
};

const factStatusLabels: Record<CourseFactStatus, string> = {
  checked: "Checked",
  "needs-review": "Needs review",
  "not-confirmed": "Not yet confirmed",
  "changed-since-last-check": "Changed since last check",
};

export type SemesterDeskV2AppProps = {
  readonly persistence?: SemesterDeskPersistence;
  readonly initialProfileId?: string | null;
  readonly now?: () => string;
  readonly makeId?: () => string;
};

function sectionFromLocation(): AppSection {
  return new URL(window.location.href).searchParams.get("section") === "settings"
    ? "settings"
    : "overview";
}

function profileLocationFromWindow(): ProfileLocation {
  const section = sectionFromLocation();
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.length === 0) return { kind: "missing", section };

  const parameters = new URLSearchParams(hash);
  const profileIds = parameters.getAll("forge-profile");
  const parameterEntries = [...parameters.entries()];
  if (
    profileIds.length !== 1
    || parameterEntries.length !== 1
    || parameterEntries[0]?.[0] !== "forge-profile"
  ) {
    return { kind: "invalid", section };
  }

  const profileId = normalizeSemesterDeskProfileIdentifier(profileIds[0] ?? "");
  return profileId
    ? { kind: "profile", profileId, section }
    : { kind: "invalid", section };
}

function activeProfileReferenceFromStorage(): ActiveProfileReference {
  try {
    const storedProfileId = window.localStorage.getItem(semesterDeskActiveProfileStorageKey);
    if (storedProfileId === null) return { kind: "missing" };
    const profileId = normalizeSemesterDeskProfileIdentifier(storedProfileId);
    return profileId ? { kind: "profile", profileId } : { kind: "invalid" };
  } catch {
    return { kind: "unavailable" };
  }
}

function writeActiveProfileReference(profileId: string | null): boolean {
  try {
    if (profileId === null) {
      window.localStorage.removeItem(semesterDeskActiveProfileStorageKey);
      return true;
    }
    const normalized = normalizeSemesterDeskProfileIdentifier(profileId);
    if (!normalized) return false;
    window.localStorage.setItem(semesterDeskActiveProfileStorageKey, normalized);
    return true;
  } catch {
    return false;
  }
}

function clearActiveProfileReference(profileId: string): boolean {
  const activeReference = activeProfileReferenceFromStorage();
  if (activeReference.kind === "profile" && activeReference.profileId !== profileId) return true;
  return writeActiveProfileReference(null);
}

function writeProfileIdToLocation(profileId: string | null, section: AppSection): boolean {
  const normalized = profileId === null
    ? null
    : normalizeSemesterDeskProfileIdentifier(profileId);
  if (profileId !== null && !normalized) return false;
  const url = new URL(window.location.href);
  if (section === "settings") url.searchParams.set("section", "settings");
  else url.searchParams.delete("section");
  url.hash = normalized ? `forge-profile=${encodeURIComponent(normalized)}` : "";
  window.history.replaceState(null, "", url);
  return true;
}

function focusSettingsAfterRender(isCurrent: () => boolean) {
  const focusSettings = () => {
    if (!isCurrent()) return;
    const settings = document.getElementById("settings");
    if (!settings) return;
    settings.focus({ preventScroll: true });
    if (typeof settings.scrollIntoView === "function") {
      settings.scrollIntoView({ block: "start" });
    }
  };
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(focusSettings);
    return;
  }
  window.setTimeout(focusSettings, 0);
}

function createLocalProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `profile-${crypto.randomUUID()}`;
  }
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function defaultIdentifier(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function defaultRecoveryChoice(): RecoveryChoice {
  return {
    outcome: "kept",
    reason: "",
    nextDate: "",
    nextMinutes: "",
  };
}

function messageForError(result: SemesterDeskResult<unknown>): string {
  if (result.ok) return "";
  switch (result.error.code) {
    case "course-review-required":
      return "Check the course details before you choose this work.";
    case "capacity-draft-missing":
      return "Add your available time before you confirm it.";
    case "recovery-draft-missing":
      return "Set every recovery choice before you confirm the week.";
    case "next-action-required":
      return "Choose this work before you start your study session.";
    case "practice-required":
      return "Complete protected practice before your independent check.";
    case "proof-required":
      return "Complete your independent check before you set a return date.";
    case "return-not-due":
      return "Come back on the date shown for this return.";
    case "return-not-open":
      return "Open this return before you complete it.";
    default:
      return result.error.message;
  }
}

function minutesLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr ${remainingMinutes} min`;
}

function factNeedsReview(status: CourseFactStatus): boolean {
  return status !== "checked";
}

function factFreshnessLabel(checkedAt: string | null): string {
  if (!checkedAt) return "Not yet checked";
  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime())) return "Check time needs review";
  return `Last checked ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)}`;
}

function courseNeedsReview(course: SemesterDeskState["courses"][number]): boolean {
  return course.facts.some((fact) => factNeedsReview(fact.status))
    || course.sourceConflicts.some((conflict) => conflict.status === "open");
}

function planItemFor(
  desk: SemesterDeskState,
  planItemId: string,
): SemesterDeskState["planItems"][number] | undefined {
  return desk.planItems.find((item) => item.id === planItemId);
}

function courseFor(
  desk: SemesterDeskState,
  courseId: string,
): SemesterDeskState["courses"][number] | undefined {
  return desk.courses.find((course) => course.id === courseId);
}

function statusForSave(saveStatus: SaveStatus): string {
  if (saveStatus === "saving") return "Saving on this device";
  if (saveStatus === "error") return "Not saved";
  return "Saved on this device";
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v3h16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppFrame({
  children,
  title,
  saveStatus,
  onReset,
}: {
  readonly children: ReactNode;
  readonly title?: string;
  readonly saveStatus?: SaveStatus;
  readonly onReset?: () => void;
}) {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#semester-desk-main">Skip to main content</a>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="FORGE home">FORGE</Link>
        {title ? <p className={styles.termName}>{title}</p> : <p className={styles.termName}>Semester Desk</p>}
        <div className={styles.headerTools}>
          {saveStatus ? <p className={styles.saveState} aria-live="polite">{statusForSave(saveStatus)}</p> : null}
          {onReset ? (
            <button className={styles.textButton} type="button" onClick={onReset}>
              Local data
            </button>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}

function Notice({ message }: { readonly message: string }) {
  return (
    <p className={styles.visuallyHidden} role="status" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  );
}

function LoadingState() {
  return (
    <main id="semester-desk-main" className={styles.loading} tabIndex={-1} aria-busy="true">
      <p>Opening your Semester Desk…</p>
    </main>
  );
}

function Onboarding({
  draft,
  onChange,
  onSubmit,
  submitError,
  saving,
}: {
  readonly draft: OnboardingDraft;
  readonly onChange: (next: OnboardingDraft) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly submitError: string | null;
  readonly saving: boolean;
}) {
  function update<Key extends keyof OnboardingDraft>(key: Key, value: OnboardingDraft[Key]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <main id="semester-desk-main" className={styles.onboarding} tabIndex={-1}>
      <section className={styles.onboardingIntro} aria-labelledby="start-title">
        <p className={styles.sectionMarker}>YOUR FIRST DESK</p>
        <h1 id="start-title">Start with what is real.</h1>
        <p>
          Add one course detail and one piece of work. You can add more after this desk opens.
        </p>
      </section>

      <form className={styles.onboardingForm} onSubmit={onSubmit} noValidate>
        <fieldset>
          <legend>Semester</legend>
          <label>
            Semester title
            <input
              value={draft.semesterTitle}
              onChange={(event) => update("semesterTitle", event.target.value)}
              autoComplete="off"
              required
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>First course</legend>
          <div className={styles.twoColumns}>
            <label>
              Course code
              <input
                value={draft.courseCode}
                onChange={(event) => update("courseCode", event.target.value)}
                autoComplete="off"
                required
              />
            </label>
            <label>
              Course name
              <input
                value={draft.courseTitle}
                onChange={(event) => update("courseTitle", event.target.value)}
                autoComplete="off"
                required
              />
            </label>
          </div>
          <div className={styles.factFields}>
            <label>
              Course detail
              <input
                value={draft.factLabel}
                onChange={(event) => update("factLabel", event.target.value)}
                autoComplete="off"
                required
              />
            </label>
            <label>
              What it says
              <input
                value={draft.factValue}
                onChange={(event) => update("factValue", event.target.value)}
                autoComplete="off"
                required
              />
            </label>
            <label>
              Status
              <select
                value={draft.factStatus}
                onChange={(event) => update("factStatus", event.target.value as OnboardingDraft["factStatus"])}
              >
                <option value="checked">Checked</option>
                <option value="not-confirmed">Not yet confirmed</option>
              </select>
            </label>
            <label>
              Where you saw it
              <input
                value={draft.factSource}
                onChange={(event) => update("factSource", event.target.value)}
                autoComplete="off"
                required
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>First piece of work</legend>
          <div className={styles.threeColumns}>
            <label>
              Work title
              <input
                value={draft.workTitle}
                onChange={(event) => update("workTitle", event.target.value)}
                autoComplete="off"
                required
              />
            </label>
            <label>
              Planned date
              <input
                type="date"
                value={draft.workDate}
                onChange={(event) => update("workDate", event.target.value)}
                required
              />
            </label>
            <label>
              Minutes you expect
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={draft.workMinutes}
                onChange={(event) => update("workMinutes", event.target.value)}
                required
              />
            </label>
          </div>
        </fieldset>

        {submitError ? <p className={styles.inlineError} role="alert">{submitError}</p> : null}
        <button className={styles.commitAction} type="submit" disabled={saving}>
          {saving ? "Opening your desk…" : "Open your Semester Desk"}
          <ArrowIcon />
        </button>
        <p className={styles.formNote}>This desk stays on this device. You control what you add.</p>
      </form>
    </main>
  );
}

function MalformedStorage({
  message,
  onDownload,
  onReset,
  actionError,
}: {
  readonly message: string;
  readonly onDownload: () => void;
  readonly onReset: () => void;
  readonly actionError: string | null;
}) {
  return (
    <main id="semester-desk-main" className={styles.recoveryState} tabIndex={-1}>
      <section aria-labelledby="local-data-title">
        <p className={styles.sectionMarker}>LOCAL DATA NEEDS REVIEW</p>
        <h1 id="local-data-title">FORGE did not change your data.</h1>
        <p>
          {message} Download the unchanged JSON before you reset this device.
        </p>
        {actionError ? <p className={styles.inlineError} role="alert">{actionError}</p> : null}
        <div className={styles.actionRow}>
          <button className={styles.secondaryAction} type="button" onClick={onDownload}>
            <DownloadIcon />
            Download unchanged JSON
          </button>
          <button className={styles.dangerAction} type="button" onClick={onReset}>
            Reset this device
          </button>
        </div>
      </section>
    </main>
  );
}

function BlockedLocalReferenceState({
  blockedReference,
  onOpenSavedDesk,
}: {
  readonly blockedReference: BlockedLocalReference;
  readonly onOpenSavedDesk: (() => void) | null;
}) {
  return (
    <main id="semester-desk-main" className={styles.recoveryState} tabIndex={-1}>
      <section aria-labelledby="blocked-local-data-title">
        <p className={styles.sectionMarker}>LOCAL DESK NEEDS REVIEW</p>
        <h1 id="blocked-local-data-title">FORGE did not change local data.</h1>
        <p>{blockedReference.message}</p>
        <p>FORGE did not create a new desk while this local reference needs review.</p>
        {onOpenSavedDesk ? (
          <div className={styles.actionRow}>
            <button className={styles.commitAction} type="button" onClick={onOpenSavedDesk}>
              Open saved local desk
              <ArrowIcon />
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function OfflineMessage({ offline }: { readonly offline: boolean }) {
  if (!offline) return null;
  return (
    <p className={styles.offlineMessage} role="status">
      Your device is offline. This local desk can still save on this device.
    </p>
  );
}

function CourseLedger({
  desk,
  onCommand,
  now,
}: {
  readonly desk: SemesterDeskState;
  readonly onCommand: (command: SemesterDeskCommand, successMessage: string) => boolean;
  readonly now: () => string;
}) {
  const [courseDraft, setCourseDraft] = useState<CourseDraft>(emptyCourseDraft);
  const [factDrafts, setFactDrafts] = useState<Record<string, CourseFactDraft>>({});
  const [conflictDrafts, setConflictDrafts] = useState<Record<string, ConflictDraft>>({});

  function factDraftFor(courseId: string): CourseFactDraft {
    return factDrafts[courseId] ?? emptyCourseFactDraft;
  }

  function updateFactDraft(courseId: string, next: CourseFactDraft) {
    setFactDrafts((current) => ({ ...current, [courseId]: next }));
  }

  function conflictDraftFor(courseId: string): ConflictDraft {
    return conflictDrafts[courseId] ?? emptyConflictDraft;
  }

  function updateConflictDraft(courseId: string, next: ConflictDraft) {
    setConflictDrafts((current) => ({ ...current, [courseId]: next }));
  }

  return (
    <section className={styles.ruledSection} aria-labelledby="course-ledger-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionMarker}>SEMESTER LEDGER</p>
          <h2 id="course-ledger-title">Every course stays visible.</h2>
        </div>
        <p>There is no hidden ranking.</p>
      </div>

      {desk.courses.length > 0 ? (
        <ol className={styles.courseLedger} aria-label="Courses in the order you added them">
          {desk.courses.map((course) => (
            <li key={course.id} className={styles.courseRow}>
              <header>
                <p>{course.code}</p>
                <h3>{course.title}</h3>
                <span className={courseNeedsReview(course) ? styles.needsReview : styles.checked}>
                  {courseNeedsReview(course) ? "Needs review" : "Checked"}
                </span>
              </header>
              <div className={styles.courseDetails}>
                <section aria-labelledby={`${course.id}-facts`}>
                  <h4 id={`${course.id}-facts`}>Course details</h4>
                  {course.facts.length > 0 ? (
                    <ul>
                      {course.facts.map((fact) => (
                        <li key={fact.id}>
                          <div>
                            <strong>{fact.label}</strong>
                            <span>{fact.value}</span>
                            <small>{fact.sourceLabel}</small>
                            <small>{factFreshnessLabel(fact.checkedAt)}</small>
                          </div>
                          <div className={styles.factStatus}>
                            <span data-status={fact.status}>{factStatusLabels[fact.status]}</span>
                            {factNeedsReview(fact.status) ? (
                              <button
                                type="button"
                                onClick={() => onCommand({
                                  kind: "set-course-fact-status",
                                  profileId: desk.profileId,
                                  courseId: course.id,
                                  factId: fact.id,
                                  status: "checked",
                                  checkedAt: now(),
                                }, `${fact.label} is marked as checked.`)}
                              >
                                Mark checked
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className={styles.emptyLine}>No course details yet.</p>}
                </section>
                <section aria-labelledby={`${course.id}-conflicts`}>
                  <h4 id={`${course.id}-conflicts`}>Conflicts</h4>
                  {course.sourceConflicts.length > 0 ? (
                    <ul className={styles.conflictList}>
                      {course.sourceConflicts.map((conflict) => (
                        <li key={conflict.id}>
                          <span>{conflict.summary}</span>
                          {conflict.status === "open" ? (
                            <button
                              type="button"
                              onClick={() => onCommand({
                                kind: "review-source-conflict",
                                profileId: desk.profileId,
                                courseId: course.id,
                                conflictId: conflict.id,
                              }, "That conflict is marked as reviewed.")}
                            >
                              Mark reviewed
                            </button>
                          ) : <span className={styles.checked}>Reviewed</span>}
                        </li>
                      ))}
                    </ul>
                  ) : <p className={styles.emptyLine}>No conflicts to review.</p>}
                </section>
              </div>
              <details className={styles.addDetail}>
                <summary>Add a course detail</summary>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const factDraft = factDraftFor(course.id);
                    const saved = onCommand({
                      kind: "add-course-fact",
                      profileId: desk.profileId,
                      courseId: course.id,
                      label: factDraft.label,
                      value: factDraft.value,
                      status: factDraft.status,
                      sourceLabel: factDraft.sourceLabel,
                      ...(factDraft.status === "checked" ? { checkedAt: now() } : {}),
                    }, `A new detail was added to ${course.title}.`);
                    if (saved) updateFactDraft(course.id, emptyCourseFactDraft);
                  }}
                >
                  <label>
                    Detail
                    <input
                      value={factDraftFor(course.id).label}
                      onChange={(event) => updateFactDraft(course.id, {
                        ...factDraftFor(course.id),
                        label: event.target.value,
                      })}
                      required
                    />
                  </label>
                  <label>
                    What it says
                    <input
                      value={factDraftFor(course.id).value}
                      onChange={(event) => updateFactDraft(course.id, {
                        ...factDraftFor(course.id),
                        value: event.target.value,
                      })}
                      required
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={factDraftFor(course.id).status}
                      onChange={(event) => updateFactDraft(course.id, {
                        ...factDraftFor(course.id),
                        status: event.target.value as CourseFactStatus,
                      })}
                    >
                      <option value="checked">Checked</option>
                      <option value="needs-review">Needs review</option>
                      <option value="not-confirmed">Not yet confirmed</option>
                      <option value="changed-since-last-check">Changed since last check</option>
                    </select>
                  </label>
                  <label>
                    Where you saw it
                    <input
                      value={factDraftFor(course.id).sourceLabel}
                      onChange={(event) => updateFactDraft(course.id, {
                        ...factDraftFor(course.id),
                        sourceLabel: event.target.value,
                      })}
                      required
                    />
                  </label>
                  <button className={styles.secondaryAction} type="submit">Add course detail</button>
                </form>
              </details>
              <details className={styles.addDetail}>
                <summary>Record a conflict</summary>
                {course.facts.length < 2 ? (
                  <p className={styles.emptyLine}>Add at least two course details before you record a conflict.</p>
                ) : (
                  <form
                    className={styles.conflictForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const conflictDraft = conflictDraftFor(course.id);
                      const saved = onCommand({
                        kind: "record-source-conflict",
                        profileId: desk.profileId,
                        courseId: course.id,
                        factIds: conflictDraft.factIds,
                        summary: conflictDraft.summary,
                      }, `That conflict is recorded for ${course.title}.`);
                      if (saved) updateConflictDraft(course.id, emptyConflictDraft);
                    }}
                  >
                    <fieldset>
                      <legend>Choose the two or more details that conflict</legend>
                      <div className={styles.conflictChoices}>
                        {course.facts.map((fact) => {
                          const conflictDraft = conflictDraftFor(course.id);
                          const selected = conflictDraft.factIds.includes(fact.id);
                          return (
                            <label key={fact.id}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => updateConflictDraft(course.id, {
                                  ...conflictDraft,
                                  factIds: selected
                                    ? conflictDraft.factIds.filter((factId) => factId !== fact.id)
                                    : [...conflictDraft.factIds, fact.id],
                                })}
                              />
                              <span>{fact.label}: {fact.value}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                    <label>
                      Describe the conflict
                      <input
                        value={conflictDraftFor(course.id).summary}
                        onChange={(event) => updateConflictDraft(course.id, {
                          ...conflictDraftFor(course.id),
                          summary: event.target.value,
                        })}
                        required
                      />
                    </label>
                    <button
                      className={styles.secondaryAction}
                      type="submit"
                      disabled={conflictDraftFor(course.id).factIds.length < 2 || conflictDraftFor(course.id).summary.trim().length === 0}
                    >
                      Record conflict
                    </button>
                  </form>
                )}
              </details>
            </li>
          ))}
        </ol>
      ) : <p className={styles.emptyLine}>No courses are in this desk yet.</p>}
      <form
        className={styles.addCourseForm}
        onSubmit={(event) => {
          event.preventDefault();
          const saved = onCommand({
            kind: "add-course",
            profileId: desk.profileId,
            code: courseDraft.code,
            title: courseDraft.title,
          }, `Added ${courseDraft.title} to this Semester Desk.`);
          if (saved) setCourseDraft(emptyCourseDraft);
        }}
      >
        <p className={styles.sectionMarker}>ADD A COURSE</p>
        <label>
          Course code
          <input
            value={courseDraft.code}
            onChange={(event) => setCourseDraft({ ...courseDraft, code: event.target.value })}
            required
          />
        </label>
        <label>
          Course name
          <input
            value={courseDraft.title}
            onChange={(event) => setCourseDraft({ ...courseDraft, title: event.target.value })}
            required
          />
        </label>
        <button className={styles.secondaryAction} type="submit">Add course</button>
      </form>
    </section>
  );
}

function CapacitySection({
  desk,
  minutes,
  onMinutesChange,
  onCommand,
}: {
  readonly desk: SemesterDeskState;
  readonly minutes: string;
  readonly onMinutesChange: (value: string) => void;
  readonly onCommand: (command: SemesterDeskCommand, successMessage: string) => boolean;
}) {
  function draftCapacity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const availableMinutes = Number(minutes);
    onCommand({
      kind: "draft-capacity",
      profileId: desk.profileId,
      availableMinutes,
    }, "Your available time is ready for your confirmation.");
  }

  return (
    <section className={styles.ruledSection} aria-labelledby="capacity-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionMarker}>REAL CAPACITY</p>
          <h2 id="capacity-title">What time can you actually give?</h2>
        </div>
        {desk.capacity ? <p>You confirmed {minutesLabel(desk.capacity.availableMinutes)}.</p> : <p>Nothing is assumed.</p>}
      </div>
      <form className={styles.capacityForm} onSubmit={draftCapacity}>
        <label>
          Available minutes this week
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={minutes}
            onChange={(event) => onMinutesChange(event.target.value)}
          />
        </label>
        <button className={styles.secondaryAction} type="submit">Set this time</button>
        {desk.capacityDraft ? (
          <button
            className={styles.commitAction}
            type="button"
            onClick={() => onCommand({
              kind: "confirm-capacity",
              profileId: desk.profileId,
            }, "Your available time is confirmed.")}
          >
            Confirm {minutesLabel(desk.capacityDraft.availableMinutes)}
            <ArrowIcon />
          </button>
        ) : null}
      </form>
    </section>
  );
}

function RecoverySection({
  desk,
  choices,
  onChoiceChange,
  onPrepare,
  onConfirm,
}: {
  readonly desk: SemesterDeskState;
  readonly choices: Readonly<Record<string, RecoveryChoice>>;
  readonly onChoiceChange: (planItemId: string, choice: RecoveryChoice) => void;
  readonly onPrepare: () => void;
  readonly onConfirm: () => void;
}) {
  const plannedItems = desk.planItems.filter((item) => item.status === "planned");
  const courses = new Map(desk.courses.map((course) => [course.id, course]));

  if (plannedItems.length === 0 && desk.recoveryChanges.length === 0) {
    return null;
  }

  return (
    <section className={styles.ruledSection} aria-labelledby="recovery-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionMarker}>RECOVERY</p>
          <h2 id="recovery-title">Rebuild this week in the open.</h2>
        </div>
        <p>Every planned item gets one clear choice.</p>
      </div>

      {desk.recoveryDraft ? (
        <div className={styles.recoveryReview}>
          <p className={styles.recoverySummary}>{desk.recoveryDraft.summary}</p>
          <ol>
            {desk.recoveryDraft.decisions.map((decision) => {
              const item = planItemFor(desk, decision.planItemId);
              const detail = decision.outcome === "reduced"
                ? `${minutesLabel(item?.currentMinutes ?? 0)} → ${minutesLabel(decision.nextMinutes ?? 0)}`
                : decision.outcome === "kept"
                  ? `${item?.currentDate ?? "Current date"} and ${minutesLabel(item?.currentMinutes ?? 0)} stay the same`
                  : `${item?.currentDate ?? "Current date"} → ${decision.nextDate ?? "New date"}`;
              return (
                <li key={decision.planItemId}>
                  <strong>{recoveryLabels[decision.outcome]}</strong>
                  <span>{item?.title ?? "Planned work"}</span>
                  <small>{detail}. {decision.reason}</small>
                </li>
              );
            })}
          </ol>
          <button className={styles.commitAction} type="button" onClick={onConfirm}>
            Confirm these changes
            <ArrowIcon />
          </button>
        </div>
      ) : plannedItems.length > 0 ? (
        <div className={styles.recoveryEditor}>
          <ol aria-label="Recovery choices in the order you added work">
            {plannedItems.map((item) => {
              const choice = choices[item.id] ?? defaultRecoveryChoice();
              const course = courses.get(item.courseId);
              return (
                <li key={item.id}>
                  <div className={styles.workIdentity}>
                    <strong>{item.title}</strong>
                    <span>{course ? `${course.code} · ` : ""}{item.currentDate} · {minutesLabel(item.currentMinutes)}</span>
                  </div>
                  <label>
                    Keep, move, reduce, or defer
                    <select
                      value={choice.outcome}
                      onChange={(event) => onChoiceChange(item.id, {
                        ...choice,
                        outcome: event.target.value as RecoveryOutcome,
                      })}
                    >
                      <option value="kept">Keep as it is</option>
                      <option value="moved">Move to another date</option>
                      <option value="reduced">Make it shorter</option>
                      <option value="deferred">Defer to another date</option>
                    </select>
                  </label>
                  {choice.outcome === "moved" || choice.outcome === "deferred" ? (
                    <label>
                      New date
                      <input
                        type="date"
                        value={choice.nextDate}
                        onChange={(event) => onChoiceChange(item.id, {
                          ...choice,
                          nextDate: event.target.value,
                        })}
                      />
                    </label>
                  ) : null}
                  {choice.outcome === "reduced" ? (
                    <label>
                      New minutes
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, item.currentMinutes - 1)}
                        step="1"
                        inputMode="numeric"
                        value={choice.nextMinutes}
                        onChange={(event) => onChoiceChange(item.id, {
                          ...choice,
                          nextMinutes: event.target.value,
                        })}
                      />
                    </label>
                  ) : null}
                  <label className={styles.recoveryReason}>
                    Why this is honest today
                    <input
                      placeholder="Write why this is honest today"
                      value={choice.reason}
                      onChange={(event) => onChoiceChange(item.id, {
                        ...choice,
                        reason: event.target.value,
                      })}
                    />
                  </label>
                </li>
              );
            })}
          </ol>
          <button className={styles.secondaryAction} type="button" onClick={onPrepare}>
            Review these changes
          </button>
        </div>
      ) : null}

      {desk.recoveryChanges.length > 0 ? (
        <section className={styles.recoveryLog} aria-labelledby="change-log-title">
          <h3 id="change-log-title">What changed</h3>
          <ol>
            {desk.recoveryChanges.map((change) => {
              const item = planItemFor(desk, change.planItemId);
              const detail = change.outcome === "reduced"
                ? `${minutesLabel(change.previousMinutes)} → ${minutesLabel(change.currentMinutes)}`
                : `${change.previousDate} → ${change.currentDate}`;
              return (
                <li key={change.id}>
                  <strong>{recoveryLabels[change.outcome]}</strong>
                  <span>{item?.title ?? "Planned work"}</span>
                  <small>{detail}. {change.reason}</small>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </section>
  );
}

function LearningLoop({
  desk,
  practiceDraft,
  proofDraft,
  delayedReturnDate,
  focusedItemId,
  onPracticeDraftChange,
  onProofDraftChange,
  onDelayedReturnDateChange,
  onFocusItem,
  onCommand,
}: {
  readonly desk: SemesterDeskState;
  readonly practiceDraft: string;
  readonly proofDraft: string;
  readonly delayedReturnDate: string;
  readonly focusedItemId: string | null;
  readonly onPracticeDraftChange: (value: string) => void;
  readonly onProofDraftChange: (value: string) => void;
  readonly onDelayedReturnDateChange: (value: string) => void;
  readonly onFocusItem: (planItemId: string) => void;
  readonly onCommand: (command: SemesterDeskCommand, successMessage: string) => boolean;
}) {
  const [planItemDraft, setPlanItemDraft] = useState<PlanItemDraft>(emptyPlanItemDraft);
  const orderedItems = orderedPlanItems(desk);
  const selected = desk.selectedNextActionId
    ? planItemFor(desk, desk.selectedNextActionId)
    : undefined;
  const activeSession = desk.protectedStudySessions.find((session) => session.status === "active");
  const activeItem = activeSession ? planItemFor(desk, activeSession.planItemId) : undefined;
  const focusedItem = focusedItemId ? planItemFor(desk, focusedItemId) : undefined;
  const focusedReturn = focusedItem
    ? desk.delayedReturns.find((entry) => entry.planItemId === focusedItem.id && entry.status !== "completed")
    : undefined;

  return (
    <section className={styles.ruledSection} id="learning" aria-labelledby="next-action-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionMarker}>NEXT HONEST ACTION</p>
          <h2 id="next-action-title">Choose one piece of work.</h2>
        </div>
        <p>You choose it. FORGE does not choose it for you.</p>
      </div>

      {orderedItems.length > 0 ? (
        <ol className={styles.workList} aria-label="All work in the order you added it">
          {orderedItems.map((item) => {
            const course = courseFor(desk, item.courseId);
            const blocked = course ? courseNeedsReview(course) : true;
            const selectedItem = item.id === desk.selectedNextActionId;
            const delayedReturn = desk.delayedReturns.find((entry) => (
              entry.planItemId === item.id && entry.status !== "completed"
            ));
            return (
              <li key={item.id} data-selected={selectedItem || undefined}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{course?.code ?? "Course"} · {item.currentDate} · {minutesLabel(item.currentMinutes)}</span>
                  <small>{item.status.replaceAll("-", " ")}</small>
                </div>
                {item.status === "planned" ? (
                  <button
                    className={selectedItem ? styles.selectedAction : styles.secondaryAction}
                    type="button"
                    disabled={blocked}
                    onClick={() => onCommand({
                      kind: "choose-next-action",
                      profileId: desk.profileId,
                      planItemId: item.id,
                    }, `${item.title} is your next action.`)}
                  >
                    {selectedItem ? "Your next action" : blocked ? "Check course details first" : "Choose this work"}
                  </button>
                ) : item.status === "deferred" ? (
                  <button
                    className={styles.secondaryAction}
                    type="button"
                    onClick={() => onCommand({
                      kind: "resume-deferred-item",
                      profileId: desk.profileId,
                      planItemId: item.id,
                    }, `${item.title} is back in your active semester plan.`)}
                  >
                    Resume this work
                  </button>
                ) : item.status === "practice-complete" ? (
                  <button className={styles.secondaryAction} type="button" onClick={() => onFocusItem(item.id)}>
                    Open independent check
                  </button>
                ) : item.status === "proof-complete" ? (
                  <button className={styles.secondaryAction} type="button" onClick={() => onFocusItem(item.id)}>
                    {delayedReturn ? "Continue return" : "Set a return"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : <p className={styles.emptyLine}>No work is in this desk yet.</p>}

      <form
        className={styles.addPlanItemForm}
        onSubmit={(event) => {
          event.preventDefault();
          const saved = onCommand({
            kind: "add-plan-item",
            profileId: desk.profileId,
            courseId: planItemDraft.courseId,
            title: planItemDraft.title,
            date: planItemDraft.date,
            minutes: Number(planItemDraft.minutes),
          }, `Added ${planItemDraft.title} to this Semester Desk.`);
          if (saved) setPlanItemDraft(emptyPlanItemDraft);
        }}
      >
        <p className={styles.sectionMarker}>ADD A PIECE OF WORK</p>
        <label>
          Course
          <select
            value={planItemDraft.courseId}
            onChange={(event) => setPlanItemDraft({ ...planItemDraft, courseId: event.target.value })}
            required
          >
            <option value="">Choose a course</option>
            {desk.courses.map((course) => (
              <option key={course.id} value={course.id}>{course.code}: {course.title}</option>
            ))}
          </select>
        </label>
        <label>
          Work title
          <input
            value={planItemDraft.title}
            onChange={(event) => setPlanItemDraft({ ...planItemDraft, title: event.target.value })}
            required
          />
        </label>
        <label>
          Planned date
          <input
            type="date"
            value={planItemDraft.date}
            onChange={(event) => setPlanItemDraft({ ...planItemDraft, date: event.target.value })}
            required
          />
        </label>
        <label>
          Minutes
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={planItemDraft.minutes}
            onChange={(event) => setPlanItemDraft({ ...planItemDraft, minutes: event.target.value })}
            required
          />
        </label>
        <button className={styles.secondaryAction} type="submit">Add work</button>
      </form>

      {selected && selected.status === "planned" ? (
        <div className={styles.focusRegion} aria-labelledby="study-start-title">
          <p className={styles.sectionMarker}>FOCUSED STUDY</p>
          <h3 id="study-start-title">{selected.title}</h3>
          <p>Set aside {minutesLabel(selected.currentMinutes)}. Work from your own material before you write anything here.</p>
          <button
            className={styles.commitAction}
            type="button"
            onClick={() => onCommand({
              kind: "start-protected-study",
              profileId: desk.profileId,
              planItemId: selected.id,
            }, "Your protected study session has started.")}
          >
            Start protected study
            <ArrowIcon />
          </button>
        </div>
      ) : null}

      {activeSession && activeItem ? (
        <div className={styles.focusRegion} aria-labelledby="practice-title">
          <p className={styles.sectionMarker}>PROTECTED PRACTICE</p>
          <h3 id="practice-title">{activeItem.title}</h3>
          <p>Use this space to think. FORGE does not save this text.</p>
          <label>
            Your working notes
            <textarea
              value={practiceDraft}
              onChange={(event) => onPracticeDraftChange(event.target.value)}
              rows={5}
            />
          </label>
          <div className={styles.actionRow}>
            <button
              className={styles.secondaryAction}
              type="button"
              onClick={() => onCommand({
                kind: "complete-practice",
                profileId: desk.profileId,
                studySessionId: activeSession.id,
                outcome: "needs-more-work",
              }, "Keep working. Your note stays only on this screen.")}
            >
              I need more work
            </button>
            <button
              className={styles.commitAction}
              type="button"
              onClick={() => onCommand({
                kind: "complete-practice",
                profileId: desk.profileId,
                studySessionId: activeSession.id,
                outcome: "completed",
              }, "Practice is complete. Your note stayed only on this screen.")}
            >
              Finish practice
              <ArrowIcon />
            </button>
          </div>
        </div>
      ) : null}

      {!activeSession && focusedItem?.status === "practice-complete" ? (
        <div className={styles.focusRegion} aria-labelledby={`proof-${focusedItem.id}`}>
          <p className={styles.sectionMarker}>INDEPENDENT CHECK</p>
          <h3 id={`proof-${focusedItem.id}`}>{focusedItem.title}</h3>
          <p>Answer without FORGE. The answer text stays only on this screen.</p>
          <label>
            Your answer
            <textarea
              value={proofDraft}
              onChange={(event) => onProofDraftChange(event.target.value)}
              rows={5}
            />
          </label>
          <div className={styles.actionRow}>
            <button
              className={styles.secondaryAction}
              type="button"
              onClick={() => onCommand({
                kind: "submit-independent-proof",
                profileId: desk.profileId,
                planItemId: focusedItem.id,
                outcome: "needs-return",
              }, "Your independent check is complete. Your answer stayed only on this screen.")}
            >
              I need to return to this
            </button>
            <button
              className={styles.commitAction}
              type="button"
              onClick={() => onCommand({
                kind: "submit-independent-proof",
                profileId: desk.profileId,
                planItemId: focusedItem.id,
                outcome: "demonstrated",
              }, "Your independent check is complete. Your answer stayed only on this screen.")}
            >
              I showed my understanding
              <ArrowIcon />
            </button>
          </div>
        </div>
      ) : null}

      {!activeSession && focusedItem?.status === "proof-complete" && !focusedReturn ? (
          <form
            className={styles.returnForm}
            onSubmit={(event) => {
              event.preventDefault();
              const dueAt = delayedReturnDate && !Number.isNaN(Date.parse(delayedReturnDate))
                ? new Date(delayedReturnDate).toISOString()
                : "";
              onCommand({
                kind: "schedule-delayed-return",
                profileId: desk.profileId,
                planItemId: focusedItem.id,
                dueAt,
              }, `Come back to ${focusedItem.title} on the date you chose.`);
            }}
          >
            <p className={styles.sectionMarker}>COME BACK LATER</p>
            <h3>Set a return for {focusedItem.title}</h3>
            <label>
              Return date and time
              <input
                type="datetime-local"
                value={delayedReturnDate}
                onChange={(event) => onDelayedReturnDateChange(event.target.value)}
                required
              />
            </label>
            <button className={styles.secondaryAction} type="submit">Set this return</button>
          </form>
      ) : null}

      {!activeSession && focusedItem && focusedReturn?.status === "due" ? (
            <div className={styles.returnForm}>
              <p className={styles.sectionMarker}>COME BACK ON THIS DATE</p>
              <h3>{focusedItem.title}</h3>
              <p>{new Date(focusedReturn.dueAt).toLocaleString()}</p>
              <button
                className={styles.secondaryAction}
                type="button"
                onClick={() => onCommand({
                  kind: "open-delayed-return",
                  profileId: desk.profileId,
                  delayedReturnId: focusedReturn.id,
                }, "Your delayed return is ready.")}
              >
                Open return
              </button>
            </div>
      ) : null}

      {!activeSession && focusedItem && focusedReturn?.status === "open" ? (
          <div className={styles.focusRegion} aria-labelledby={`delayed-${focusedReturn.id}`}>
            <p className={styles.sectionMarker}>DELAYED RETURN</p>
            <h3 id={`delayed-${focusedReturn.id}`}>{focusedItem.title}</h3>
            <p>Try to recall without looking at saved answer text. FORGE does not keep your answer.</p>
            <div className={styles.actionRow}>
              <button
                className={styles.secondaryAction}
                type="button"
                onClick={() => onCommand({
                  kind: "complete-delayed-return",
                  profileId: desk.profileId,
                  delayedReturnId: focusedReturn.id,
                  outcome: "needs-more-work",
                }, "Your return is recorded. You can make more space for this work later.")}
              >
                I need more work
              </button>
              <button
                className={styles.commitAction}
                type="button"
                onClick={() => onCommand({
                  kind: "complete-delayed-return",
                  profileId: desk.profileId,
                  delayedReturnId: focusedReturn.id,
                  outcome: "retained",
                }, "Your return is recorded.")}
              >
                I retained it
                <ArrowIcon />
              </button>
            </div>
          </div>
      ) : null}
    </section>
  );
}

function AnswerFreeProgress({ desk }: { readonly desk: SemesterDeskState }) {
  const evidence = progressEvidenceFor(desk);
  return (
    <section className={styles.ruledSection} aria-labelledby="progress-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionMarker}>YOUR RETURN PATH</p>
          <h2 id="progress-title">What you completed.</h2>
        </div>
        <p>Only actions and outcomes appear here.</p>
      </div>
      {evidence.length > 0 ? (
        <ol className={styles.progressList} aria-label="Completed learning actions">
          {evidence.map((entry) => {
            const item = planItemFor(desk, entry.planItemId);
            return (
              <li key={entry.id}>
                <strong>{item?.title ?? "Learning action"}</strong>
                <span>{entry.kind.replaceAll("-", " ")} · {entry.outcome.replaceAll("-", " ")}</span>
              </li>
            );
          })}
        </ol>
      ) : <p className={styles.emptyLine}>Your completed learning actions will appear here.</p>}
    </section>
  );
}

function LocalDataSection({
  onDownload,
  onReset,
}: {
  readonly onDownload: () => void;
  readonly onReset: () => void;
}) {
  return (
    <section className={styles.settingsSection} id="settings" tabIndex={-1} aria-labelledby="local-data-settings-title">
      <p className={styles.sectionMarker}>LOCAL DATA</p>
      <h2 id="local-data-settings-title">Your desk stays under your control.</h2>
      <p>Download the unchanged saved JSON before you reset this device.</p>
      <div className={styles.actionRow}>
        <button className={styles.secondaryAction} type="button" onClick={onDownload}>
          <DownloadIcon />
          Download local JSON
        </button>
        <button className={styles.dangerAction} type="button" onClick={onReset}>
          Reset this device
        </button>
      </div>
    </section>
  );
}

function ResetDialog({
  onCancel,
  onDownload,
  onConfirm,
  actionError,
}: {
  readonly onCancel: () => void;
  readonly onDownload: () => void;
  readonly onConfirm: () => void;
  readonly actionError: string | null;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function keepFocusInDialog(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? []);
      if (focusable.length === 0) return;
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey ? focusable.length - 1 : 0;
      if (currentIndex !== -1 && !((event.shiftKey && currentIndex === 0) || (!event.shiftKey && currentIndex === focusable.length - 1))) {
        return;
      }
      event.preventDefault();
      focusable[nextIndex]?.focus();
    }

    window.addEventListener("keydown", keepFocusInDialog);
    return () => window.removeEventListener("keydown", keepFocusInDialog);
  }, []);

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <section ref={dialogRef} className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description">
        <p className={styles.sectionMarker}>RESET THIS DEVICE</p>
        <h2 id="reset-title">Remove this local desk?</h2>
        <p id="reset-description">This removes only the data for this local profile. Download the unchanged JSON first if you want a copy.</p>
        {actionError ? <p className={styles.inlineError} role="alert">{actionError}</p> : null}
        <div className={styles.actionRow}>
          <button className={styles.secondaryAction} type="button" onClick={onDownload}>
            <DownloadIcon />
            Download JSON
          </button>
          <button className={styles.dangerAction} type="button" onClick={onConfirm}>
            Remove local desk
          </button>
          <button ref={cancelButtonRef} className={styles.textButton} type="button" onClick={onCancel}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

function SemesterDeskReady({
  desk,
  saveStatus,
  offline,
  notice,
  saveError,
  capacityMinutes,
  recoveryChoices,
  practiceDraft,
  proofDraft,
  delayedReturnDate,
  focusedItemId,
  resetOpen,
  onCommand,
  onCapacityMinutesChange,
  onRecoveryChoiceChange,
  onPrepareRecovery,
  onConfirmRecovery,
  onPracticeDraftChange,
  onProofDraftChange,
  onDelayedReturnDateChange,
  onFocusItem,
  onRetrySave,
  onDownload,
  onOpenReset,
  onCancelReset,
  onConfirmReset,
  now,
}: {
  readonly desk: SemesterDeskState;
  readonly saveStatus: SaveStatus;
  readonly offline: boolean;
  readonly notice: string;
  readonly saveError: string | null;
  readonly capacityMinutes: string;
  readonly recoveryChoices: Readonly<Record<string, RecoveryChoice>>;
  readonly practiceDraft: string;
  readonly proofDraft: string;
  readonly delayedReturnDate: string;
  readonly focusedItemId: string | null;
  readonly resetOpen: boolean;
  readonly onCommand: (command: SemesterDeskCommand, successMessage: string) => boolean;
  readonly onCapacityMinutesChange: (value: string) => void;
  readonly onRecoveryChoiceChange: (planItemId: string, choice: RecoveryChoice) => void;
  readonly onPrepareRecovery: () => void;
  readonly onConfirmRecovery: () => void;
  readonly onPracticeDraftChange: (value: string) => void;
  readonly onProofDraftChange: (value: string) => void;
  readonly onDelayedReturnDateChange: (value: string) => void;
  readonly onFocusItem: (planItemId: string) => void;
  readonly onRetrySave: () => void;
  readonly onDownload: () => void;
  readonly onOpenReset: () => void;
  readonly onCancelReset: () => void;
  readonly onConfirmReset: () => void;
  readonly now: () => string;
}) {
  return (
    <AppFrame title={desk.title} saveStatus={saveStatus} onReset={onOpenReset}>
      <Notice message={notice} />
      <OfflineMessage offline={offline} />
      <main id="semester-desk-main" className={styles.main} tabIndex={-1}>
        {saveError ? (
          <section className={styles.saveError} role="alert" aria-label="Local save problem">
            <p>{saveError}</p>
            <button className={styles.secondaryAction} type="button" onClick={onRetrySave}>Try save again</button>
          </section>
        ) : null}
        <CourseLedger desk={desk} onCommand={onCommand} now={now} />
        <CapacitySection
          desk={desk}
          minutes={capacityMinutes}
          onMinutesChange={onCapacityMinutesChange}
          onCommand={onCommand}
        />
        <RecoverySection
          desk={desk}
          choices={recoveryChoices}
          onChoiceChange={onRecoveryChoiceChange}
          onPrepare={onPrepareRecovery}
          onConfirm={onConfirmRecovery}
        />
        <LearningLoop
          desk={desk}
          practiceDraft={practiceDraft}
          proofDraft={proofDraft}
          delayedReturnDate={delayedReturnDate}
          focusedItemId={focusedItemId}
          onPracticeDraftChange={onPracticeDraftChange}
          onProofDraftChange={onProofDraftChange}
          onDelayedReturnDateChange={onDelayedReturnDateChange}
          onFocusItem={onFocusItem}
          onCommand={onCommand}
        />
        <AnswerFreeProgress desk={desk} />
        <LocalDataSection onDownload={onDownload} onReset={onOpenReset} />
      </main>
      {resetOpen ? (
        <ResetDialog
          onCancel={onCancelReset}
          onDownload={onDownload}
          onConfirm={onConfirmReset}
          actionError={saveError}
        />
      ) : null}
    </AppFrame>
  );
}

export function SemesterDeskV2App({
  persistence,
  initialProfileId,
  now = () => new Date().toISOString(),
  makeId = defaultIdentifier,
}: SemesterDeskV2AppProps) {
  const [screen, setScreen] = useState<AppScreen>("loading");
  const [desk, setDesk] = useState<SemesterDeskState | null>(null);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft>(emptyOnboardingDraft);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState("Opening your Semester Desk.");
  const [offline, setOffline] = useState(false);
  const [capacityMinutes, setCapacityMinutes] = useState("");
  const [recoveryChoices, setRecoveryChoices] = useState<Record<string, RecoveryChoice>>({});
  const [practiceDraft, setPracticeDraft] = useState("");
  const [proofDraft, setProofDraft] = useState("");
  const [delayedReturnDate, setDelayedReturnDate] = useState("");
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [blockedReference, setBlockedReference] = useState<BlockedLocalReference | null>(null);

  const persistenceRef = useRef<SemesterDeskPersistence | null>(null);
  const browserPersistenceRef = useRef<BrowserSemesterDeskPersistence | null>(null);
  const resetOpenerRef = useRef<HTMLElement | null>(null);
  const deskRef = useRef<SemesterDeskState | null>(null);
  const profileIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const loadEpochRef = useRef(0);
  const storageQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSaveCountRef = useRef(0);

  function runtime(): SemesterDeskRuntime {
    return {
      clock: { now },
      identifiers: { next: (kind) => `${kind}-${makeId()}` },
    };
  }

  const clearTransientExperience = useCallback((options: { readonly includeOnboarding?: boolean } = {}) => {
    if (options.includeOnboarding) setOnboardingDraft(emptyOnboardingDraft);
    setOnboardingError(null);
    setCapacityMinutes("");
    setRecoveryChoices({});
    setPracticeDraft("");
    setProofDraft("");
    setDelayedReturnDate("");
    setFocusedItemId(null);
    setResetOpen(false);
  }, []);

  function openResetDialog() {
    resetOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setResetOpen(true);
  }

  function closeResetDialog() {
    setResetOpen(false);
    const opener = resetOpenerRef.current;
    window.requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus();
    });
  }

  function enqueueStorage<T>(operation: () => Promise<T>): Promise<T> {
    const queued = storageQueueRef.current
      .catch(() => undefined)
      .then(() => operation());
    storageQueueRef.current = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }

  const showOnboarding = useCallback((message: string) => {
    profileIdRef.current = null;
    deskRef.current = null;
    setDesk(null);
    clearTransientExperience({ includeOnboarding: true });
    setBlockedReference(null);
    setSaveStatus("saved");
    setSaveError(null);
    setScreen("onboarding");
    setNotice(message);
  }, [clearTransientExperience]);

  const showBlockedReference = useCallback((message: string, activeProfileId: string | null = null) => {
    profileIdRef.current = null;
    deskRef.current = null;
    setDesk(null);
    clearTransientExperience({ includeOnboarding: true });
    setBlockedReference({ message, activeProfileId });
    setSaveStatus("saved");
    setSaveError(null);
    setScreen("blocked");
    setNotice(message);
  }, [clearTransientExperience]);

  const showRead = useCallback((
    read: SemesterDeskPersistenceRead,
    profileId: string,
    readyNotice = "Your Semester Desk is ready.",
  ) => {
    profileIdRef.current = profileId;
    clearTransientExperience({ includeOnboarding: true });
    setBlockedReference(null);
    setSaveStatus("saved");
    setSaveError(null);
    if (read.kind === "missing") {
      showOnboarding("Start a new Semester Desk on this device.");
      return;
    }
    if (read.kind === "malformed") {
      deskRef.current = null;
      setDesk(null);
      setScreen("malformed");
      setNotice("FORGE did not change local data that needs review.");
      setSaveError(read.message);
      return;
    }
    deskRef.current = read.state;
    setDesk(read.state);
    setCapacityMinutes(String(read.state.capacityDraft?.availableMinutes ?? read.state.capacity?.availableMinutes ?? ""));
    setScreen("ready");
    setNotice(readyNotice);
  }, [clearTransientExperience, showOnboarding]);

  const loadLocation = useCallback(() => {
    const loadEpoch = ++loadEpochRef.current;
    const usesBrowserStorage = persistence === undefined;
    if (usesBrowserStorage && !browserPersistenceRef.current) {
      browserPersistenceRef.current = new BrowserSemesterDeskPersistence(window.localStorage);
    }
    const devicePersistence = persistence ?? browserPersistenceRef.current;
    if (!devicePersistence) return;
    persistenceRef.current = devicePersistence;
    const currentSection = sectionFromLocation();
    const explicitProfileId = initialProfileId === undefined || initialProfileId === null
      ? null
      : normalizeSemesterDeskProfileIdentifier(initialProfileId);
    if (initialProfileId !== undefined && initialProfileId !== null && !explicitProfileId) {
      showBlockedReference("FORGE could not use this local desk reference. It did not change local data.");
      return;
    }

    const location = explicitProfileId
      ? { kind: "profile" as const, profileId: explicitProfileId, section: currentSection }
      : profileLocationFromWindow();
    const activeReference = usesBrowserStorage && !explicitProfileId
      ? activeProfileReferenceFromStorage()
      : null;
    if (location.kind === "invalid") {
      showBlockedReference(
        "FORGE could not use this local desk link. It did not change local data.",
        activeReference?.kind === "profile" ? activeReference.profileId : null,
      );
      return;
    }

    let profileId: string | null = location.kind === "profile" ? location.profileId : null;
    if (activeReference) {
      if (location.kind === "profile") {
        if (
          activeReference.kind === "profile"
          && activeReference.profileId !== location.profileId
        ) {
          showBlockedReference(
            "FORGE could not open that local desk from this link. It did not change local data.",
            activeReference.profileId,
          );
          return;
        }
        if (activeReference.kind === "invalid" || activeReference.kind === "unavailable") {
          showBlockedReference("FORGE could not identify the saved local desk. It did not change local data.");
          return;
        }
      } else if (activeReference.kind === "profile") {
        profileId = activeReference.profileId;
      } else if (activeReference.kind === "invalid" || activeReference.kind === "unavailable") {
        showBlockedReference("FORGE could not identify the saved local desk. It did not change local data.");
        return;
      }
    }

    if (!profileId) {
      showOnboarding("Start a new Semester Desk on this device.");
      return;
    }

    void devicePersistence.read(profileId).then((read) => {
      if (!mountedRef.current || loadEpochRef.current !== loadEpoch) return;
      let readyNotice = "Your Semester Desk is ready.";
      if (read.kind === "loaded" && usesBrowserStorage && !writeActiveProfileReference(profileId)) {
        readyNotice = "Your Semester Desk is ready. FORGE could not save its local return reference.";
      }
      showRead(read, profileId, readyNotice);
      if (read.kind === "loaded" && location.section === "settings") {
        writeProfileIdToLocation(profileId, "settings");
        focusSettingsAfterRender(() => (
          mountedRef.current && loadEpochRef.current === loadEpoch
        ));
      }
    }).catch((error: unknown) => {
      if (!mountedRef.current || loadEpochRef.current !== loadEpoch) return;
      const detail = error instanceof Error && error.message.trim().length > 0
        ? ` ${error.message.trim()}`
        : "";
      showBlockedReference(
        `FORGE could not read local data on this device.${detail}`,
        usesBrowserStorage ? profileId : null,
      );
    });
  }, [initialProfileId, persistence, showBlockedReference, showOnboarding, showRead]);

  function openBlockedSavedDesk() {
    const profileId = blockedReference?.activeProfileId;
    if (!profileId) return;
    if (!writeProfileIdToLocation(profileId, sectionFromLocation())) {
      showBlockedReference("FORGE could not use the saved local desk reference. It did not change local data.");
      return;
    }
    loadLocation();
  }

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) loadLocation();
    });
    window.addEventListener("popstate", loadLocation);
    window.addEventListener("hashchange", loadLocation);
    return () => {
      active = false;
      window.removeEventListener("popstate", loadLocation);
      window.removeEventListener("hashchange", loadLocation);
      mountedRef.current = false;
    };
  }, [loadLocation]);

  useEffect(() => {
    function updateOnlineStatus() {
      setOffline(!navigator.onLine);
    }
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  function persist(next: SemesterDeskState): Promise<void> {
    const activePersistence = persistenceRef.current;
    if (!activePersistence) return Promise.resolve();
    pendingSaveCountRef.current += 1;
    setSaveStatus("saving");
    return enqueueStorage(() => activePersistence.save(next))
      .then((result) => {
        if (!mountedRef.current) return;
        if (!result.ok) {
          if (pendingSaveCountRef.current === 1) {
            setSaveStatus("error");
            setSaveError(result.message);
            setNotice("Your changes remain open in this screen. They did not save.");
          }
          return;
        }
        if (pendingSaveCountRef.current === 1) {
          setSaveStatus("saved");
          setSaveError(null);
        }
      })
      .catch((error) => {
        if (!mountedRef.current || pendingSaveCountRef.current !== 1) return;
        const message = error instanceof Error && error.message.trim().length > 0
          ? `FORGE could not save local data on this device. ${error.message.trim()}`
          : "FORGE could not save local data on this device.";
        setSaveStatus("error");
        setSaveError(message);
        setNotice("Your changes remain open in this screen. They did not save.");
      })
      .finally(() => {
        pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
      });
  }

  function applyCommand(command: SemesterDeskCommand, successMessage: string): boolean {
    const current = deskRef.current;
    if (!current) return false;
    const result = transitionSemesterDesk(current, command, runtime());
    if (!result.ok) {
      setNotice(messageForError(result));
      return false;
    }
    deskRef.current = result.value;
    setDesk(result.value);
    setCapacityMinutes(String(result.value.capacityDraft?.availableMinutes ?? result.value.capacity?.availableMinutes ?? capacityMinutes));
    if (command.kind === "choose-next-action" || command.kind === "start-protected-study") {
      setFocusedItemId(command.planItemId);
    }
    if (command.kind === "complete-practice") {
      const session = current.protectedStudySessions.find((entry) => entry.id === command.studySessionId);
      if (command.outcome === "completed") {
        setPracticeDraft("");
        if (session) setFocusedItemId(session.planItemId);
      }
    }
    if (command.kind === "submit-independent-proof" || command.kind === "schedule-delayed-return") {
      setFocusedItemId(command.planItemId);
    }
    if (command.kind === "complete-delayed-return") setFocusedItemId(null);
    if (command.kind === "submit-independent-proof") setProofDraft("");
    if (command.kind === "schedule-delayed-return") setDelayedReturnDate("");
    setNotice(successMessage);
    void persist(result.value);
    return true;
  }

  async function submitOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOnboardingError(null);
    const profileId = createLocalProfileId();
    const initial = createSemesterDesk({
      profileId,
      title: onboardingDraft.semesterTitle,
    }, runtime());
    if (!initial.ok) {
      setOnboardingError(messageForError(initial));
      return;
    }
    const course = transitionSemesterDesk(initial.value, {
      kind: "add-course",
      profileId,
      code: onboardingDraft.courseCode,
      title: onboardingDraft.courseTitle,
    }, runtime());
    if (!course.ok) {
      setOnboardingError(messageForError(course));
      return;
    }
    const courseId = course.value.courses[0]?.id;
    if (!courseId) {
      setOnboardingError("FORGE could not create the first course.");
      return;
    }
    const fact = transitionSemesterDesk(course.value, {
      kind: "add-course-fact",
      profileId,
      courseId,
      label: onboardingDraft.factLabel,
      value: onboardingDraft.factValue,
      status: onboardingDraft.factStatus,
      sourceLabel: onboardingDraft.factSource,
      ...(onboardingDraft.factStatus === "checked" ? { checkedAt: now() } : {}),
    }, runtime());
    if (!fact.ok) {
      setOnboardingError(messageForError(fact));
      return;
    }
    const completed = transitionSemesterDesk(fact.value, {
      kind: "add-plan-item",
      profileId,
      courseId,
      title: onboardingDraft.workTitle,
      date: onboardingDraft.workDate,
      minutes: Number(onboardingDraft.workMinutes),
    }, runtime());
    if (!completed.ok) {
      setOnboardingError(messageForError(completed));
      return;
    }

    const activePersistence = persistenceRef.current;
    if (!activePersistence) {
      setSaveStatus("error");
      setOnboardingError("FORGE could not open this desk on this device. Try again.");
      return;
    }

    setSaveStatus("saving");
    setNotice("Saving your new Semester Desk on this device.");

    let saved: SemesterDeskPersistenceResult;
    try {
      saved = await enqueueStorage(() => activePersistence.save(completed.value));
    } catch (error) {
      const detail = error instanceof Error && error.message.trim().length > 0
        ? ` ${error.message.trim()}`
        : "";
      saved = { ok: false, message: `FORGE could not save local data on this device.${detail}` };
    }

    if (!saved.ok || !mountedRef.current) {
      let resetResult: SemesterDeskPersistenceResult = { ok: true };
      try {
        resetResult = await enqueueStorage(() => activePersistence.reset(profileId));
      } catch (error) {
        const detail = error instanceof Error && error.message.trim().length > 0
          ? ` ${error.message.trim()}`
          : "";
        resetResult = { ok: false, message: `FORGE could not remove incomplete local data.${detail}` };
      }
      if (!mountedRef.current) return;
      setSaveStatus("error");
      const cleanupMessage = resetResult.ok ? "" : ` ${resetResult.message}`;
      const errorMessage = `${saved.ok ? "FORGE could not finish opening this desk." : saved.message} Your desk did not open.${cleanupMessage}`;
      setOnboardingError(errorMessage);
      setNotice(errorMessage);
      return;
    }

    profileIdRef.current = profileId;
    deskRef.current = completed.value;
    setDesk(completed.value);
    setOnboardingDraft(emptyOnboardingDraft);
    setCapacityMinutes("");
    setScreen("ready");
    const savedReturnReference = persistence === undefined
      ? writeActiveProfileReference(profileId)
      : true;
    setNotice(savedReturnReference
      ? "Your Semester Desk is open."
      : "Your Semester Desk is open. FORGE could not save its local return reference.");
    writeProfileIdToLocation(profileId, "overview");
  }

  function prepareRecovery() {
    const current = deskRef.current;
    if (!current) return;
    const plannedItems = current.planItems.filter((item) => item.status === "planned");
    const decisions = plannedItems.map((item) => {
      const choice = recoveryChoices[item.id] ?? defaultRecoveryChoice();
      return {
        planItemId: item.id,
        outcome: choice.outcome,
        reason: choice.reason,
        ...(choice.outcome === "moved" || choice.outcome === "deferred" ? { nextDate: choice.nextDate } : {}),
        ...(choice.outcome === "reduced" ? { nextMinutes: Number(choice.nextMinutes) } : {}),
      };
    });
    applyCommand({
      kind: "prepare-recovery",
      profileId: current.profileId,
      summary: "Your recovery choices are ready to review.",
      decisions,
    }, "Review the changes before you confirm them.");
  }

  function confirmRecovery() {
    const current = deskRef.current;
    if (!current) return;
    applyCommand({
      kind: "confirm-recovery",
      profileId: current.profileId,
    }, "Your recovery changes are recorded in the open.");
  }

  async function downloadLocalData() {
    const activePersistence = persistenceRef.current;
    const profileId = profileIdRef.current;
    if (!activePersistence || !profileId) return;
    const result = await enqueueStorage(() => activePersistence.exportRaw(profileId));
    if (!result.ok) {
      setSaveError(result.message);
      setNotice(result.message);
      return;
    }
    const blob = new Blob([result.raw], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "forge-semester-desk-local.json";
    link.click();
    URL.revokeObjectURL(href);
    setNotice("Your unchanged local JSON is ready to download.");
  }

  async function resetLocalDesk() {
    const activePersistence = persistenceRef.current;
    const profileId = profileIdRef.current;
    if (!activePersistence || !profileId) return;
    setSaveStatus("saving");
    const result = await enqueueStorage(() => activePersistence.reset(profileId));
    if (!result.ok) {
      setSaveStatus("error");
      setSaveError(result.message);
      setNotice(result.message);
      return;
    }
    const clearedReturnReference = persistence === undefined
      ? clearActiveProfileReference(profileId)
      : true;
    writeProfileIdToLocation(null, "overview");
    deskRef.current = null;
    profileIdRef.current = null;
    setDesk(null);
    clearTransientExperience({ includeOnboarding: true });
    setSaveError(null);
    setSaveStatus("saved");
    setResetOpen(false);
    setScreen("onboarding");
    setNotice(clearedReturnReference
      ? "The local desk was removed from this device."
      : "The local desk was removed. FORGE could not clear its local return reference.");
  }

  if (screen === "loading") {
    return <AppFrame><LoadingState /></AppFrame>;
  }

  if (screen === "onboarding") {
    return (
      <AppFrame>
        <Notice message={notice} />
        <Onboarding
          draft={onboardingDraft}
          onChange={setOnboardingDraft}
          onSubmit={submitOnboarding}
          submitError={onboardingError}
          saving={saveStatus === "saving"}
        />
      </AppFrame>
    );
  }

  if (screen === "malformed") {
    return (
      <AppFrame onReset={openResetDialog}>
        <Notice message={notice} />
        <MalformedStorage
          message={saveError ?? "The saved data needs review."}
          onDownload={() => { void downloadLocalData(); }}
          onReset={openResetDialog}
          actionError={saveError}
        />
        {resetOpen ? (
          <ResetDialog
            onCancel={closeResetDialog}
            onDownload={() => { void downloadLocalData(); }}
            onConfirm={() => { void resetLocalDesk(); }}
            actionError={saveError}
          />
        ) : null}
      </AppFrame>
    );
  }

  if (screen === "blocked" && blockedReference) {
    return (
      <AppFrame>
        <Notice message={notice} />
        <BlockedLocalReferenceState
          blockedReference={blockedReference}
          onOpenSavedDesk={blockedReference.activeProfileId ? openBlockedSavedDesk : null}
        />
      </AppFrame>
    );
  }

  if (!desk) {
    return <AppFrame><LoadingState /></AppFrame>;
  }

  return (
    <SemesterDeskReady
      desk={desk}
      saveStatus={saveStatus}
      offline={offline}
      notice={notice}
      saveError={saveError}
      capacityMinutes={capacityMinutes}
      recoveryChoices={recoveryChoices}
      practiceDraft={practiceDraft}
      proofDraft={proofDraft}
      delayedReturnDate={delayedReturnDate}
      focusedItemId={focusedItemId}
      resetOpen={resetOpen}
      onCommand={applyCommand}
      onCapacityMinutesChange={setCapacityMinutes}
      onRecoveryChoiceChange={(planItemId, choice) => setRecoveryChoices((current) => ({
        ...current,
        [planItemId]: choice,
      }))}
      onPrepareRecovery={prepareRecovery}
      onConfirmRecovery={confirmRecovery}
      onPracticeDraftChange={setPracticeDraft}
      onProofDraftChange={setProofDraft}
      onDelayedReturnDateChange={setDelayedReturnDate}
      onFocusItem={setFocusedItemId}
      onRetrySave={() => {
        if (deskRef.current) void persist(deskRef.current);
      }}
      onDownload={() => { void downloadLocalData(); }}
      onOpenReset={openResetDialog}
      onCancelReset={closeResetDialog}
      onConfirmReset={() => { void resetLocalDesk(); }}
      now={now}
    />
  );
}
