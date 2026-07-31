"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type {
  UniversityRecoveryWhatIfChoiceId,
  UniversityRecoveryWhatIfFixture,
} from "@/app/internal/university-recovery/recovery-what-if-fixture.server";

import styles from "./UniversityRecoveryWhatIfWorkspace.module.css";

function readableDate(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function readableWindow(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): string {
  const formatter = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone,
  });
  return `${formatter.format(new Date(startsAt))} to ${formatter.format(new Date(endsAt))}`;
}

function readableMinutes(value: number): string {
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0
    ? `${hours} h`
    : `${hours} h ${minutes} min`;
}

function AuthorityBoundary() {
  return (
    <footer className={styles.authority} aria-labelledby="recovery-what-if-authority">
      <p id="recovery-what-if-authority">Authority ceiling</p>
      <dl>
        <div>
          <dt>Capacity</dt>
          <dd>Synthetic learner fixture</dd>
        </div>
        <div>
          <dt>Recommendation</dt>
          <dd>Not allowed</dd>
        </div>
        <div>
          <dt>Plan or calendar change</dt>
          <dd>Not allowed</dd>
        </div>
        <div>
          <dt>Save, message, or external effect</dt>
          <dd>Not allowed</dd>
        </div>
      </dl>
    </footer>
  );
}

export function UniversityRecoveryWhatIfWorkspace({
  fixture,
}: {
  fixture: Readonly<UniversityRecoveryWhatIfFixture>;
}) {
  const [selectedId, setSelectedId] =
    useState<UniversityRecoveryWhatIfChoiceId | null>(null);
  const firstChoiceRef = useRef<HTMLInputElement>(null);
  const pendingScrollPositionRef = useRef<{
    readonly left: number;
    readonly top: number;
  } | null>(null);
  const selected = useMemo(() => (
    fixture.view === "capacity_choices"
      ? fixture.choices.find((choice) => choice.id === selectedId) ?? null
      : null
  ), [fixture, selectedId]);

  useLayoutEffect(() => {
    const pendingScrollPosition = pendingScrollPositionRef.current;
    if (pendingScrollPosition === null) return;

    pendingScrollPositionRef.current = null;
    window.scrollTo({
      behavior: "auto",
      left: pendingScrollPosition.left,
      top: pendingScrollPosition.top,
    });
  }, [selectedId]);

  function selectChoice(
    choiceId: UniversityRecoveryWhatIfChoiceId,
    control: HTMLInputElement,
  ) {
    const activeBounds = control.getBoundingClientRect();
    const focusOutlineClearance = 6;
    const activeControlIsVisible = document.activeElement === control
      && activeBounds.top >= focusOutlineClearance
      && activeBounds.right <= window.innerWidth - focusOutlineClearance
      && activeBounds.bottom <= window.innerHeight - focusOutlineClearance
      && activeBounds.left >= focusOutlineClearance;

    pendingScrollPositionRef.current = activeControlIsVisible
      ? {
          left: window.scrollX,
          top: window.scrollY,
        }
      : null;
    setSelectedId(choiceId);
  }

  function reset() {
    pendingScrollPositionRef.current = null;
    setSelectedId(null);
    firstChoiceRef.current?.focus();
  }

  return (
    <article
      className={styles.surface}
      aria-labelledby="university-recovery-what-if-title"
      data-view={fixture.view}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university workflow research</p>
          <p className={styles.productName}>Recovery capacity what-if</p>
        </div>
        <p className={styles.term}>{fixture.termLabel}</p>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Fixed synthetic adult fixture</strong>
        <span>Preview only</span>
        <span>Not saved</span>
        <span>Not recommended</span>
        <span>Nothing sent</span>
      </div>

      <section className={styles.intro}>
        <p className={styles.stateLabel}>One declaration changes</p>
        <h1 id="university-recovery-what-if-title">
          What changes if the time you can use changes?
        </h1>
        <p>
          Try one fixed sample amount against the same copied deadline, full
          effort range, learner classification, and protected buffer. FORGE
          shows the arithmetic without moving or applying anything.
        </p>
      </section>

      {fixture.view === "source_review" ? (
        <>
          <section className={styles.sourceStop} role="status">
            <p>Source review comes first</p>
            <h2>{fixture.message}</h2>
            <p>
              No available-time choice or recovery result is exposed while the
              copied deadline remains unresolved.
            </p>
          </section>
          <AuthorityBoundary />
        </>
      ) : (
        <>
          <section
            className={styles.fixedEvidence}
            aria-labelledby="recovery-what-if-fixed-title"
          >
            <header>
              <p>Evidence before choice</p>
              <h2 id="recovery-what-if-fixed-title">
                Held fixed in every what-if
              </h2>
            </header>

            <article className={styles.primaryEvidence}>
              <div>
                <p>{fixture.fixedEvidence.courseLabel}</p>
                <h3>{fixture.fixedEvidence.itemTitle}</h3>
                <span>learner classified: required</span>
              </div>
              <dl>
                <div>
                  <dt>Recovery window</dt>
                  <dd>
                    {readableWindow(
                      fixture.fixedEvidence.windowStartsAt,
                      fixture.fixedEvidence.windowEndsAt,
                      fixture.fixedEvidence.timeZone,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Copied deadline</dt>
                  <dd>
                    {readableDate(
                      fixture.fixedEvidence.copiedDeadline,
                      fixture.fixedEvidence.timeZone,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Full effort range</dt>
                  <dd>
                    {readableMinutes(
                      fixture.fixedEvidence.protectedEffortMinutesLow,
                    )}{" "}
                    to{" "}
                    {readableMinutes(
                      fixture.fixedEvidence.protectedEffortMinutesHigh,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Keep protected</dt>
                  <dd>
                    {readableMinutes(
                      fixture.fixedEvidence.protectedBufferMinutes,
                    )}
                  </dd>
                </div>
              </dl>
            </article>

            <div className={styles.fixedNotes}>
              <p>
                <strong>{fixture.fixedEvidence.outsideItemTitle}</strong>
                <span>{fixture.fixedEvidence.outsideCourseLabel}</span>
                remains outside this window by the fixture learner
                disposition.
              </p>
              <p>{fixture.fixedEvidence.sourceBoundary}</p>
            </div>
          </section>

          <section
            className={styles.choiceSection}
            aria-labelledby="recovery-what-if-choice-title"
          >
            <div className={styles.choiceHeading}>
              <div>
                <p>Fixed sample what-if</p>
                <h2 id="recovery-what-if-choice-title">
                  Try an amount of available time
                </h2>
              </div>
              <p>No option is selected for you.</p>
            </div>

            <fieldset className={styles.choiceFieldset}>
              <legend className={styles.srOnly}>
                Try a sample amount of available time
              </legend>
              {fixture.choices.map((choice, index) => (
                <label key={choice.id}>
                  <input
                    ref={index === 0 ? firstChoiceRef : undefined}
                    type="radio"
                    name="university-recovery-what-if-choice"
                    value={choice.id}
                    checked={choice.id === selectedId}
                    onChange={(event) => {
                      selectChoice(choice.id, event.currentTarget);
                    }}
                  />
                  <span>
                    <strong>{choice.label}</strong>
                    <small>{choice.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className={styles.choiceFooter}>
              <p>
                Selection changes only this browser-memory preview and clears
                on refresh.
              </p>
              <button
                type="button"
                onClick={reset}
                disabled={selectedId === null}
              >
                Reset what-if
              </button>
            </div>
          </section>

          <div
            className={styles.srOnly}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {selected?.result.announcement ?? ""}
          </div>

          {selected ? (
            <section
              className={styles.result}
              aria-labelledby="recovery-what-if-result-title"
              data-result={selected.result.kind}
            >
              <div className={styles.resultCopy}>
                <p>Selected capacity consequence</p>
                <h2 id="recovery-what-if-result-title">
                  {selected.result.headline}
                </h2>
                <p>{selected.result.explanation}</p>
              </div>

              <div className={styles.calculation}>
                <p aria-label={`${selected.result.availableMinutes} minus ${selected.result.protectedBufferMinutes} equals ${selected.result.workableMinutes} workable minutes`}>
                  <strong>{selected.result.availableMinutes}</strong>
                  <span>minus</span>
                  <strong>{selected.result.protectedBufferMinutes}</strong>
                  <span>equals</span>
                  <strong>{selected.result.workableMinutes}</strong>
                </p>
                <dl>
                  <div>
                    <dt>Available</dt>
                    <dd>{readableMinutes(selected.result.availableMinutes)}</dd>
                  </div>
                  <div>
                    <dt>Keep protected</dt>
                    <dd>
                      {readableMinutes(
                        selected.result.protectedBufferMinutes,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Workable</dt>
                    <dd>{readableMinutes(selected.result.workableMinutes)}</dd>
                  </div>
                  <div>
                    <dt>Unchanged effort</dt>
                    <dd>
                      {readableMinutes(
                        selected.result.protectedEffortMinutesLow,
                      )}{" "}
                      to{" "}
                      {readableMinutes(
                        selected.result.protectedEffortMinutesHigh,
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {selected.result.humanHelp ? (
                <aside
                  className={styles.humanHelp}
                  aria-labelledby="recovery-what-if-help-title"
                >
                  <p>{selected.result.humanHelp.stateLabel}</p>
                  <h3 id="recovery-what-if-help-title">
                    {selected.result.humanHelp.subject}
                  </h3>
                  <p>{selected.result.humanHelp.question}</p>
                  <span>No send control exists in this preview.</span>
                </aside>
              ) : null}
            </section>
          ) : (
            <section className={styles.emptyResult} aria-label="No what-if result selected">
              <p>Choose one sample amount to inspect its exact arithmetic.</p>
            </section>
          )}

          <section
            className={styles.sourceBoundary}
            aria-labelledby="recovery-what-if-source-title"
          >
            <div>
              <p>Copied source boundary</p>
              <h2 id="recovery-what-if-source-title">
                Reviewed does not mean official.
              </h2>
            </div>
            <p>{fixture.fixedEvidence.sourceBoundary}</p>
          </section>

          <AuthorityBoundary />
        </>
      )}
    </article>
  );
}
