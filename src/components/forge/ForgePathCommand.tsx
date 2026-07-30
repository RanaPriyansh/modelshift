"use client";

import Link from "next/link";
import {
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import styles from "./ForgePathCommand.module.css";

function previewFor(request: string) {
  const normalized = request.trim().toLocaleLowerCase();
  if (normalized.includes("hour") || normalized.includes("time")) {
    return {
      object: "Weekly availability",
      change: "Review the path against the new time constraint.",
      reason: "A smaller week may change pace, not the evidence standard.",
    };
  }
  if (normalized.includes("replace") || normalized.includes("resource") || normalized.includes("video")) {
    return {
      object: "Reviewed resource request",
      change: "Ask for an equivalent source with the same learning role.",
      reason: "A replacement needs provenance, access, and review before assignment.",
    };
  }
  if (normalized.includes("why") || normalized.includes("next")) {
    return {
      object: "Sequence rationale",
      change: "Inspect the current prerequisite and next-action contract.",
      reason: "The current path does not change when you ask for its rationale.",
    };
  }
  return {
    object: "Learning direction",
    change: "Send this request through the reviewed path builder.",
    reason: "A draft cannot silently add work, publish content, or change evidence.",
  };
}

export function ForgePathCommand() {
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof previewFor> | null>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [])].filter((element) => !element.hidden);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function close() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.trim().length < 3) return;
    setPreview(previewFor(request));
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={styles.trigger}
        onClick={() => {
          setPreview(null);
          setOpen(true);
        }}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true">✦</span>
        Plan a change
      </button>
      {open ? (
        <div className={styles.backdrop} onMouseDown={close} role="presentation">
          <section
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className={styles.dialog}
            onMouseDown={(event) => event.stopPropagation()}
            ref={dialogRef}
            role="dialog"
          >
            <header>
              <p>Path command · preview only</p>
              <button aria-label="Close path command" onClick={close} type="button">
                ×
              </button>
            </header>
            <h2 id={titleId}>What should Forge reconsider?</h2>
            <p id={descriptionId}>
              Describe a constraint, question, or direction. Nothing changes until a reviewed
              proposal is inspected and accepted.
            </p>
            <form onSubmit={submit}>
              <label htmlFor={`${titleId}-request`}>
                Ask a question or preview a direction change
              </label>
              <div className={styles.inputRow}>
                <input
                  id={`${titleId}-request`}
                  maxLength={280}
                  onChange={(event) => setRequest(event.target.value)}
                  placeholder="I have only three hours this week."
                  ref={inputRef}
                  value={request}
                />
                <button disabled={request.trim().length < 3} type="submit">
                  Preview
                </button>
              </div>
              <p className={styles.voiceBoundary}>
                Voice input is unavailable in this build; no microphone permission is requested.
              </p>
            </form>
            {preview ? (
              <div className={styles.preview} aria-live="polite">
                <p>Proposed review</p>
                <dl>
                  <div>
                    <dt>Object</dt>
                    <dd>{preview.object}</dd>
                  </div>
                  <div>
                    <dt>Would change</dt>
                    <dd>{preview.change}</dd>
                  </div>
                  <div>
                    <dt>Why</dt>
                    <dd>{preview.reason}</dd>
                  </div>
                </dl>
                <footer>
                  <button onClick={close} type="button">Keep current path</button>
                  <Link href="/start" onClick={close}>Review in path builder</Link>
                </footer>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
