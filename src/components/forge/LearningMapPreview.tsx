"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  ExploratorySourcePlanContract,
  GroundedLearningContract,
} from "@/src/lib/forge-planner/schema";

import { ForgeArrow } from "./ForgeShell";

type RevisionNotes = Readonly<Record<string, string>>;
type MapDecision = "draft" | "accepted" | "revision_requested" | "rejected";

const TIME_LABELS: Readonly<Record<GroundedLearningContract["request"]["timeAvailable"], string>> = {
  "15_min": "About 15 minutes",
  "45_min": "About 45 minutes",
  "2_hours": "Up to two hours",
  ongoing: "An ongoing path",
};

const MODALITY_LABELS: Readonly<
  Record<GroundedLearningContract["request"]["modalityNeeds"][number], string>
> = {
  text: "Text",
  video: "Video",
  visual: "Visuals",
  audio: "Audio",
  hands_on: "Hands-on work",
  low_bandwidth: "Low bandwidth",
  screen_reader: "Screen-reader compatible",
};

const MODALITY_STATUS: Readonly<
  Record<GroundedLearningContract["request"]["modalityNeeds"][number], string>
> = {
  text: "Available through authored interface copy and reviewed source links.",
  visual: "Available through this World’s authored visual or interactive representation.",
  screen_reader: "Semantic controls and text alternatives are present; manual assistive-technology validation remains open.",
  video: "Requested, but no reviewed video is bound to this route.",
  audio: "Requested, but no reviewed audio route is bound to this World.",
  hands_on: "Requested, but no general physical project is bound to this World.",
  low_bandwidth: "Requested, but no offline or guaranteed low-bandwidth package is released.",
};

export function LearningMapPreview({
  learnerQuestion,
  plan,
  routeHref,
}: {
  learnerQuestion: string;
  plan: ExploratorySourcePlanContract | GroundedLearningContract;
  routeHref?: string;
}) {
  const [revisionNotes, setRevisionNotes] = useState<RevisionNotes>({});
  const [openRevisionId, setOpenRevisionId] = useState<string | null>(null);
  const [decision, setDecision] = useState<MapDecision>("draft");
  const grounded = plan.contractKind === "grounded_learning";

  const requestedChanges = useMemo(
    () => Object.values(revisionNotes).filter((note) => note.trim().length > 0).length,
    [revisionNotes],
  );
  const mapSteps = grounded
    ? plan.learning.milestones.map((milestone) => ({
        id: milestone.id,
        objective: milestone.title,
        exitGate: milestone.objective,
      }))
    : plan.exploration.steps;
  const routeActivated = grounded && decision === "accepted" && routeHref;

  const decisionMessage = (() => {
    if (decision === "accepted") {
      return grounded
        ? "Reviewed route accepted for this page. Entering the World starts a separate local learning session."
        : "This unverified question map is retained only in this page. No lesson, source, or learning claim was activated.";
    }
    if (decision === "rejected") {
      return "Map rejected for this page. No route, content, or learner record was activated.";
    }
    if (requestedChanges > 0) {
      return `${requestedChanges} local revision ${requestedChanges === 1 ? "request" : "requests"} — not submitted or saved.`;
    }
    return "No revision requests in this page.";
  })();

  return (
    <section
      className="forge-map-preview"
      aria-labelledby="forge-map-preview-title"
      data-map-state={decision}
    >
      <header className="forge-map-preview__header">
        <span>{grounded ? "Reviewed route · learner decision required" : "Contestable map · not yet verified"}</span>
        <h4 id="forge-map-preview-title">
          {grounded ? "Inspect the route before it becomes your next move." : "Your goal has a visible route to review."}
        </h4>
        <p>
          {grounded
            ? "FORGE matched an authored World and reviewed sources. You can accept this route, ask for a local revision, or reject it; FORGE will not silently enroll you."
            : "This is a source-verification map, not a generated course. Every gate must resolve before FORGE can call subject content, resources, projects, or proof available."}
        </p>
      </header>

      <article className="forge-map-intent">
        <span>Your exact words</span>
        <blockquote>{learnerQuestion}</blockquote>
        <small>Held only in this open page. It is not saved to a learner profile.</small>
        <dl>
          {plan.request.currentKnowledge ? (
            <div><dt>What you already know</dt><dd>{plan.request.currentKnowledge}</dd></div>
          ) : null}
          {plan.request.practicalOutcome ? (
            <div><dt>Practical outcome</dt><dd>{plan.request.practicalOutcome}</dd></div>
          ) : null}
          <div><dt>Time available</dt><dd>{TIME_LABELS[plan.request.timeAvailable]}</dd></div>
          <div>
            <dt>Representations</dt>
            <dd>{plan.request.modalityNeeds.map((need) => MODALITY_LABELS[need]).join(", ")}</dd>
          </div>
          {plan.request.constraints ? (
            <div><dt>Constraints</dt><dd>{plan.request.constraints}</dd></div>
          ) : null}
        </dl>
      </article>

      <ol className="forge-map-gates">
        {mapSteps.map((step, index) => {
          const note = revisionNotes[step.id] ?? "";
          const revisionOpen = openRevisionId === step.id;
          return (
            <li key={step.id} className={note.trim() ? "has-revision" : undefined}>
              <span className="forge-map-gates__index">{String(index + 1).padStart(2, "0")}</span>
              <div className="forge-map-gates__copy">
                <span>{note.trim() ? "Learner revision requested" : "Required verification gate"}</span>
                <strong>{step.objective}</strong>
                <small>{step.exitGate}</small>

                {revisionOpen ? (
                  <label htmlFor={`forge-map-revision-${step.id}`}>
                    <span>What should change?</span>
                    <textarea
                      id={`forge-map-revision-${step.id}`}
                      rows={2}
                      maxLength={240}
                      value={note}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRevisionNotes((current) => ({ ...current, [step.id]: value }));
                        setDecision(value.trim() ? "revision_requested" : "draft");
                      }}
                      placeholder="Describe the scope, order, wording, or constraint you want reviewed."
                    />
                    <small>{note.length} / 240 · local and unsent</small>
                  </label>
                ) : null}
              </div>
              <button
                type="button"
                aria-expanded={revisionOpen}
                aria-controls={`forge-map-revision-${step.id}`}
                onClick={() => setOpenRevisionId(revisionOpen ? null : step.id)}
              >
                {revisionOpen ? "Close note" : note.trim() ? "Edit request" : "Ask to revise"}
              </button>
            </li>
          );
        })}
      </ol>

      {!grounded ? (
        <div className="forge-map-unavailable" aria-label="Capabilities not yet available for this goal">
          <span>Still uncompiled</span>
          <ul>
            <li>Reviewed concepts and prerequisites</li>
            <li>Eligible text, video, and visual representations</li>
            <li>Safe practical project and practice sequence</li>
            <li>Assistance withdrawal and independent proof</li>
          </ul>
        </div>
      ) : (
        <div className="forge-map-available" aria-label="Representation availability for this route">
          <span>Route capability check</span>
          <ul>
            {plan.request.modalityNeeds.map((need) => (
              <li key={need}>
                <strong>{MODALITY_LABELS[need]}</strong>
                <small>{MODALITY_STATUS[need]}</small>
              </li>
            ))}
          </ul>
          {plan.request.practicalOutcome ? (
            <p>
              Your practical outcome remains learner-authored. This World is reviewed only for its named objective and proof task;
              accepting the route does not certify that it completes the broader outcome.
            </p>
          ) : null}
        </div>
      )}

      <footer className="forge-map-preview__footer">
        <p aria-live="polite">{decisionMessage}</p>
        <div className="forge-map-decision">
          {decision !== "accepted" ? (
            <button
              className="forge-map-decision__accept"
              type="button"
              disabled={requestedChanges > 0}
              onClick={() => setDecision("accepted")}
            >
              {grounded ? "Accept reviewed route" : "Keep question map"}
            </button>
          ) : null}
          {decision !== "rejected" ? (
            <button type="button" onClick={() => setDecision("rejected")}>Reject this map</button>
          ) : null}
          {decision !== "draft" || requestedChanges > 0 ? (
            <button
              type="button"
              onClick={() => {
                setRevisionNotes({});
                setOpenRevisionId(null);
                setDecision("draft");
              }}
            >
              Return to draft
            </button>
          ) : null}
        </div>
      </footer>

      {routeActivated ? (
        <div className="forge-map-activation" data-testid="forge-map-activation">
          <p>The map is accepted for this page. The World still makes only its own bounded evidence claim.</p>
          <Link className="forge-primary-action" href={routeHref}>
            Enter working World <ForgeArrow />
          </Link>
        </div>
      ) : null}

      {requestedChanges > 0 && decision === "revision_requested" ? (
        <div className="forge-map-revision-summary">
          <span>Local revision only</span>
          <p>FORGE has not sent, saved, reviewed, or applied these requests. Return to the intake to compile a different route.</p>
          <button
            type="button"
            onClick={() => {
              setRevisionNotes({});
              setOpenRevisionId(null);
              setDecision("draft");
            }}
          >
            Clear local requests
          </button>
        </div>
      ) : null}
    </section>
  );
}
