"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import {
  applyPathDecision,
  compileContinuityFromPlan,
  createInitialActivityStates,
  type ContinuityCompilerResult,
  type PathDecisionV1,
} from "@/src/forge/continuity";
import {
  createDeviceContinuityRecord,
} from "@/src/lib/forge-continuity";
import type {
  ForgePlanContract,
  ForgePlanRequest,
} from "@/src/lib/forge-planner/schema";

import { ForgeArrow } from "./ForgeShell";
import { ForgeKicker, ForgeStatus } from "./ForgePrimitives";
import { createBrowserContinuityStore } from "./continuity-client";
import {
  canonicalMinorTopicQuestion,
  localMinorExploratoryPlan,
  minorSafePlannerRequest,
} from "./minor-safe-plan";
import { clearStartDraft, readStartDraft } from "./start-draft";

const REQUEST_TIMEOUT_MS = 8_000;

type StartStep = "goal" | "outcome" | "context" | "review";

const AGE_OPTIONS = [
  ["adult", "Adult", "Self-directed, device-local start"],
  ["teen", "Teen", "Device-only reviewed routes"],
  ["child", "Child + grown-up", "Shared, device-only guidance"],
] as const;

const DEPTH_OPTIONS = [
  ["quick", "First look"],
  ["standard", "Working knowledge"],
  ["deep", "Deep study"],
] as const;

const TIME_OPTIONS = [
  ["15_min", "15 minutes"],
  ["45_min", "45 minutes"],
  ["2_hours", "Up to 2 hours"],
  ["ongoing", "An ongoing path"],
] as const;

function randomId(prefix: string): string {
  return `${prefix}.${crypto.randomUUID().toLowerCase()}`;
}

function ChoiceRow({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: ReadonlyArray<readonly [string, string, string?]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="forge-start-choice">
      <legend>{legend}</legend>
      <div>
        {options.map(([id, label, note]) => (
          <label className={value === id ? "is-selected" : undefined} key={id}>
            <input
              checked={value === id}
              name={name}
              onChange={() => onChange(id)}
              type="radio"
              value={id}
            />
            <strong>{label}</strong>
            {note ? <small>{note}</small> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ReviewCandidate({
  compiled,
  learnerWords,
  onAccept,
  onReject,
  onRevise,
  onSaveOpen,
  saving,
}: {
  compiled: Extract<ContinuityCompilerResult, { ok: true }>;
  learnerWords: string;
  onAccept: () => void;
  onReject: () => void;
  onRevise: () => void;
  onSaveOpen: () => void;
  saving: boolean;
}) {
  const reviewed = compiled.revision.authority.kind === "reviewed_world";
  return (
    <section className="forge-start-review" aria-labelledby="candidate-path-title">
      <header>
        <ForgeStatus tone={reviewed ? "evidence" : "human"}>
          {reviewed ? "Reviewed World match · acceptance required" : "Coverage gap · not executable"}
        </ForgeStatus>
        <h2 id="candidate-path-title">{compiled.revision.title}</h2>
        <blockquote>{learnerWords}</blockquote>
        <p>
          {reviewed
            ? "The route, source IDs, World version, internal phase summary, and execution boundary come from the reviewed registry. Your acceptance activates one exact World activity on this device."
            : "No reviewed World matches this goal. FORGE preserved an inspectable source-verification map, but it cannot activate a lesson, source claim, or proof route."}
        </p>
      </header>

      <ol className="forge-start-review__nodes">
        {compiled.revision.nodes.map((node) => (
          <li key={node.nodeId}>
            <span>{String(node.position + 1).padStart(2, "0")}</span>
            <div>
              <h3>{node.title}</h3>
              <p>{node.objective}</p>
              <small>
                {node.authority.kind === "reviewed_world"
                  ? `Reviewed activity · ${node.authority.worldRef.worldId} · v${node.authority.worldRef.worldVersion}`
                  : "Identified gap · source verification required · cannot run"}
              </small>
            </div>
          </li>
        ))}
      </ol>

      <dl className="forge-start-review__contract">
        <div><dt>Learner wording</dt><dd>Stored only in the device-local goal record after you choose to save.</dd></div>
        <div><dt>Path history</dt><dd>Acceptance creates a new immutable revision; it does not mutate this candidate.</dd></div>
        <div><dt>AI authority</dt><dd>No model may activate a route, publish content, grade proof, or change this path.</dd></div>
        <div><dt>Evidence</dt><dd>Starting or completing a path is not capability evidence. A protected unfamiliar task is required.</dd></div>
      </dl>

      <div className="forge-start-review__actions">
        {reviewed ? (
          <button className="forge-primary-action" disabled={saving} onClick={onAccept} type="button">
            {saving ? "Saving accepted path…" : "Accept exact path"}
            <ForgeArrow />
          </button>
        ) : (
          <button className="forge-secondary-action" disabled={saving} onClick={onSaveOpen} type="button">
            {saving ? "Saving open question…" : "Save as an open question"}
          </button>
        )}
        <button className="forge-secondary-action" disabled={saving} onClick={onRevise} type="button">
          Revise my request
        </button>
        <button disabled={saving} onClick={onReject} type="button">
          Reject this candidate
        </button>
        <Link href="/paths">Compare other goal directions</Link>
      </div>
    </section>
  );
}

export function ForgeStart({ initialGoal = "" }: { initialGoal?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<StartStep>("goal");
  const [goal, setGoal] = useState(initialGoal.slice(0, 600));
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [currentKnowledge, setCurrentKnowledge] = useState("");
  const [successShape, setSuccessShape] = useState("use");
  const [startingPoint, setStartingPoint] = useState("curious");
  const [ageMode, setAgeMode] = useState<ForgePlanRequest["ageMode"]>("adult");
  const [depth, setDepth] = useState<ForgePlanRequest["depth"]>("standard");
  const [timeAvailable, setTimeAvailable] = useState<ForgePlanRequest["timeAvailable"]>("45_min");
  const [constraints, setConstraints] = useState("");
  const [guardianPresent, setGuardianPresent] = useState(false);
  const [representationNeeds, setRepresentationNeeds] = useState<ForgePlanRequest["modalityNeeds"]>(["text", "visual"]);
  const [dataAccepted, setDataAccepted] = useState(false);
  const [compiled, setCompiled] = useState<Extract<ContinuityCompilerResult, { ok: true }> | null>(null);
  const [planning, setPlanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      const draft = readStartDraft();
      if (draft) {
        setGoal((current) => current || draft.goal);
        setDesiredOutcome((current) => current || draft.desiredOutcome);
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
      mountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);

  function nextFromGoal(event: FormEvent) {
    event.preventDefault();
    if (goal.trim().length < 3) {
      setMessage("Write at least three characters so the goal can be inspected.");
      return;
    }
    setMessage("");
    setStep("outcome");
  }

  function nextFromOutcome(event: FormEvent) {
    event.preventDefault();
    if (desiredOutcome.trim().length < 3) {
      setMessage("Name something meaningful you want to be able to do.");
      return;
    }
    setMessage("");
    setStep("context");
  }

  async function requestCandidate(event: FormEvent) {
    event.preventDefault();
    if (ageMode === "child" && !guardianPresent) {
      setMessage("Child mode needs a grown-up present for this local session.");
      return;
    }
    if (!dataAccepted) {
      setMessage("Review and accept the one-response data boundary before requesting a path.");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    setPlanning(true);
    setCompiled(null);
    setMessage("");

    try {
      const request: ForgePlanRequest = {
        question: goal.trim(),
        ageMode,
        depth,
        startingPoint,
        successShape,
        currentKnowledge: currentKnowledge.trim(),
        practicalOutcome: desiredOutcome.trim(),
        timeAvailable,
        modalityNeeds: representationNeeds,
        constraints: constraints.trim(),
        guardianManaged: ageMode === "child" && guardianPresent,
        sourceMode: ageMode === "child" ? "authored_only" : "curated",
      };
      const canonicalMinorQuestion = ageMode === "adult"
        ? null
        : canonicalMinorTopicQuestion(goal);
      let response: Response | null = null;
      let plan: ForgePlanContract;
      if (ageMode !== "adult" && canonicalMinorQuestion === null) {
        plan = localMinorExploratoryPlan(request);
      } else {
        const outboundRequest = ageMode === "adult"
          ? request
          : minorSafePlannerRequest(request, canonicalMinorQuestion!);
        response = await fetch("/api/forge/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(outboundRequest),
          signal: controller.signal,
        });
        plan = (await response.json()) as ForgePlanContract;
      }
      if (!mountedRef.current || requestRef.current !== controller || controller.signal.aborted) return;
      if (plan.contractKind === "refusal") {
        setMessage(plan.message);
        return;
      }
      if (response && !response.ok) throw new Error("planner_unavailable");

      const now = new Date().toISOString();
      const result = await compileContinuityFromPlan(
        plan,
        {
          schemaVersion: "learner-goal.v1",
          goalId: randomId("goal"),
          storageClass: "learner-owned-device-local",
          learnerWords: goal.trim(),
          desiredOutcome: desiredOutcome.trim(),
          createdAt: now,
        },
        {
          pathId: randomId("path"),
          revisionId: randomId("path-revision"),
          compiledAt: now,
        },
      );
      if (!result.ok) {
        setMessage("The candidate path did not pass the local integrity contract. Nothing was saved.");
        return;
      }
      setCompiled(result);
      setStep("review");
    } catch (error) {
      if (!mountedRef.current || requestRef.current !== controller) return;
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "The path request took too long. Nothing was saved; try again."
          : "The path service is unavailable. Nothing was saved; choose a reviewed activity instead.",
      );
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        if (mountedRef.current) setPlanning(false);
      }
    }
  }

  async function acceptReviewedPath() {
    if (!compiled || compiled.revision.authority.kind !== "reviewed_world") return;
    setSaving(true);
    setMessage("");
    try {
      const decidedAt = new Date().toISOString();
      const decision: PathDecisionV1 = {
        schemaVersion: "path-decision.v1",
        decisionId: randomId("path-decision"),
        decision: "accept",
        pathId: compiled.revision.pathId,
        baseRevisionId: compiled.revision.revisionId,
        baseRevisionNumber: compiled.revision.revisionNumber,
        baseRevisionDigest: compiled.revision.revisionDigest,
        resultRevisionId: randomId("path-revision"),
        decidedAt,
      };
      const accepted = await applyPathDecision(compiled.revision, decision);
      if (!accepted.accepted) throw new Error(accepted.reason);
      const initialStates = await createInitialActivityStates(accepted.revision, decidedAt);
      if (!initialStates.ok) throw new Error(initialStates.reason);
      const record = createDeviceContinuityRecord({
        recordId: randomId("continuity-record"),
        goal: compiled.goal,
        revisions: [compiled.revision, accepted.revision],
        decisions: [decision],
        activityStates: initialStates.states,
        currentRevisionId: accepted.revision.revisionId,
        updatedAt: decidedAt,
      });
      const stored = createBrowserContinuityStore().save(record);
      if (!stored.ok) {
        setMessage(`The path was not saved (${stored.reason.replaceAll("_", " ")}). Export is not claimed.`);
        return;
      }
      clearStartDraft();
      router.push("/app");
    } catch {
      setMessage("The acceptance record failed its integrity check. Nothing was saved.");
    } finally {
      setSaving(false);
    }
  }

  function saveOpenQuestion() {
    if (!compiled || compiled.revision.authority.kind === "reviewed_world") return;
    setSaving(true);
    setMessage("");
    try {
      const updatedAt = new Date().toISOString();
      const record = createDeviceContinuityRecord({
        recordId: randomId("continuity-record"),
        goal: compiled.goal,
        revisions: [compiled.revision],
        currentRevisionId: compiled.revision.revisionId,
        updatedAt,
      });
      const stored = createBrowserContinuityStore().save(record);
      if (!stored.ok) {
        setMessage(`The open question was not saved (${stored.reason.replaceAll("_", " ")}).`);
        return;
      }
      clearStartDraft();
      router.push("/app");
    } catch {
      setMessage("The open-question record failed its integrity check. Nothing was saved.");
    } finally {
      setSaving(false);
    }
  }

  function reviseCandidate() {
    setCompiled(null);
    setDataAccepted(false);
    setMessage("The candidate was not saved. Edit your request, then review the one-response data boundary again.");
    setStep("goal");
  }

  function rejectCandidate() {
    setCompiled(null);
    setDataAccepted(false);
    clearStartDraft();
    setMessage("Candidate rejected. No path, decision, or learner wording was saved.");
    setStep("goal");
  }

  return (
    <main className="forge-start-page" id="forge-main" tabIndex={-1}>
      <header className="forge-start-page__hero">
        <ForgeKicker>Guest-first · saved only after your decision</ForgeKicker>
        <h1>Turn a goal into a credible first path.</h1>
        <p>
          FORGE asks only for context that changes the route. You will inspect the exact
          candidate, its authority, and its gaps before anything becomes active on this device.
        </p>
      </header>

      <nav className="forge-start-steps" aria-label="Path setup progress">
        {[
          ["goal", "Goal"],
          ["outcome", "Outcome"],
          ["context", "Route context"],
          ["review", "Review"],
        ].map(([id, label], index) => (
          <span aria-current={step === id ? "step" : undefined} key={id}>
            <i>{index + 1}</i>{label}
          </span>
        ))}
      </nav>

      {step === "goal" ? (
        <form className="forge-start-form" onSubmit={nextFromGoal}>
          <div className="forge-start-form__heading">
            <span>Question 1 of 3</span>
            <h2>What do you want to understand, make, or become able to do?</h2>
            <p>A topic, project, profession, decision, or honest “I do not know where to begin” all work.</p>
          </div>
          <div className="forge-start-primary-field">
            <label htmlFor="forge-start-goal">Your words</label>
            <textarea
              aria-describedby="forge-start-goal-description"
              autoFocus
              id="forge-start-goal"
              maxLength={600}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="I want to…"
              required
              rows={4}
              value={goal}
            />
            <small id="forge-start-goal-description">
              {goal.length} / 600 · remains unsaved until you choose to save a reviewed result
            </small>
          </div>
          <div className="forge-start-form__actions">
            <button className="forge-primary-action" type="submit">Name the outcome <ForgeArrow /></button>
            <Link href="/paths">Explore goal directions</Link>
          </div>
        </form>
      ) : null}

      {step === "outcome" ? (
        <form className="forge-start-form" onSubmit={nextFromOutcome}>
          <div className="forge-start-form__heading">
            <span>Question 2 of 3</span>
            <h2>What should you be able to do when this becomes useful?</h2>
            <p>This keeps the path aimed at capability instead of passive completion.</p>
          </div>
          <div className="forge-start-primary-field">
            <label htmlFor="forge-start-outcome">Meaningful outcome</label>
            <textarea
              aria-describedby="forge-start-outcome-description"
              autoFocus
              id="forge-start-outcome"
              maxLength={280}
              onChange={(event) => setDesiredOutcome(event.target.value)}
              placeholder="For example: build, explain, decide, repair, investigate, or perform…"
              required
              rows={3}
              value={desiredOutcome}
            />
            <small id="forge-start-outcome-description">{desiredOutcome.length} / 280</small>
          </div>
          <label className="forge-start-secondary-field">
            <span>What can you already do or recognize? · optional</span>
            <textarea
              maxLength={280}
              onChange={(event) => setCurrentKnowledge(event.target.value)}
              placeholder="Name prior knowledge, experience, or where you get stuck."
              rows={3}
              value={currentKnowledge}
            />
          </label>
          <ChoiceRow
            legend="The outcome is mainly to…"
            name="success-shape"
            onChange={setSuccessShape}
            options={[
              ["explain", "Explain it"],
              ["use", "Use it"],
              ["build", "Build with it"],
            ]}
            value={successShape}
          />
          <div className="forge-start-form__actions">
            <button className="forge-secondary-action" onClick={() => setStep("goal")} type="button">Back</button>
            <button className="forge-primary-action" type="submit">Set route context <ForgeArrow /></button>
          </div>
        </form>
      ) : null}

      {step === "context" ? (
        <form className="forge-start-form" onSubmit={requestCandidate}>
          <div className="forge-start-form__heading">
            <span>Question 3 of 3</span>
            <h2>What constraints materially change the route?</h2>
            <p>These settings choose safe reviewed options. They do not diagnose a learning style or permanent level.</p>
          </div>
          <div className="forge-start-context-grid">
            <ChoiceRow
              legend="Age and guidance mode"
              name="start-age"
              onChange={(value) => {
                setAgeMode(value as ForgePlanRequest["ageMode"]);
                if (value !== "child") setGuardianPresent(false);
              }}
              options={AGE_OPTIONS}
              value={ageMode}
            />
            <ChoiceRow
              legend="Starting point"
              name="start-point"
              onChange={setStartingPoint}
              options={[
                ["curious", "Curious", "Begin with the phenomenon"],
                ["familiar", "Familiar", "Find the fragile part"],
                ["stuck", "Stuck", "Repair the blocker"],
              ]}
              value={startingPoint}
            />
            <ChoiceRow legend="Depth" name="start-depth" onChange={(value) => setDepth(value as ForgePlanRequest["depth"])} options={DEPTH_OPTIONS} value={depth} />
            <ChoiceRow legend="Time available now" name="start-time" onChange={(value) => setTimeAvailable(value as ForgePlanRequest["timeAvailable"])} options={TIME_OPTIONS} value={timeAvailable} />
          </div>
          <fieldset className="forge-start-representations">
            <legend>Representations and access needs</legend>
            <p>Choose one to four. Access remains available during independent proof.</p>
            <div>
              {([
                ["text", "Text"],
                ["video", "Video"],
                ["visual", "Visual"],
                ["audio", "Audio"],
                ["hands_on", "Hands-on"],
                ["low_bandwidth", "Low bandwidth"],
                ["screen_reader", "Screen reader"],
              ] as const).map(([id, label]) => {
                const selected = representationNeeds.includes(id);
                return (
                  <label className={selected ? "is-selected" : undefined} key={id}>
                    <input
                      checked={selected}
                      disabled={!selected && representationNeeds.length >= 4}
                      onChange={() => setRepresentationNeeds((current) =>
                        selected
                          ? current.length === 1 ? current : current.filter((item) => item !== id)
                          : [...current, id as ForgePlanRequest["modalityNeeds"][number]],
                      )}
                      type="checkbox"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label className="forge-start-secondary-field">
            <span>Materials, cost, language, mobility, bandwidth, or deadline · optional</span>
            <textarea
              maxLength={280}
              onChange={(event) => setConstraints(event.target.value)}
              rows={3}
              value={constraints}
            />
          </label>
          {ageMode === "child" ? (
            <label className="forge-start-consent">
              <input
                checked={guardianPresent}
                onChange={(event) => setGuardianPresent(event.target.checked)}
                type="checkbox"
              />
              <span><strong>A grown-up is present and managing this device session.</strong><small>This is local presentation state, not verified guardian identity or legal consent.</small></span>
            </label>
          ) : null}
          <label className="forge-start-consent">
            <input
              checked={dataAccepted}
              onChange={(event) => setDataAccepted(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Use these exact fields for one first-party planning response.</strong>
              <small>
                {ageMode === "adult"
                  ? "The exact fields go to one first-party planning request and are not added to an account profile. External model transport remains disabled. Only a later saved local goal keeps your words."
                  : "Your goal, current knowledge, desired outcome, and constraints stay in this tab. Only a fixed reviewed-topic token and selected routing enums may reach the first-party planner; an unmatched goal stays entirely local."}
              </small>
            </span>
          </label>
          <div className="forge-start-form__actions">
            <button className="forge-secondary-action" onClick={() => setStep("outcome")} type="button">Back</button>
            <button className="forge-primary-action" disabled={planning} type="submit">
              {planning ? "Checking reviewed authority…" : "Build inspectable candidate"}
              <ForgeArrow />
            </button>
          </div>
        </form>
      ) : null}

      {step === "review" && compiled ? (
        <ReviewCandidate
          compiled={compiled}
          learnerWords={goal.trim()}
          onAccept={() => { void acceptReviewedPath(); }}
          onReject={rejectCandidate}
          onRevise={reviseCandidate}
          onSaveOpen={saveOpenQuestion}
          saving={saving}
        />
      ) : null}

      {message ? <p className="forge-start-message" role="alert">{message}</p> : null}
    </main>
  );
}
