"use client";

import Link from "next/link";
import { useState } from "react";

import type { SourceCorroborationPathPreview } from "@/src/forge/paths/source-corroboration-preview";

import { ForgeKicker, ForgeStatus } from "./ForgePrimitives";
import { ForgeArrow } from "./ForgeShell";

const MAX_DRAFT_LENGTH = 480;
const MAX_LINK_LENGTH = 180;
const MAX_REVISION_LENGTH = 320;

const LINEAR_MAP = [
  {
    id: "world",
    label: "Working source-corroboration World",
    fallback: "A bounded World route is available for examining one model-generated factual claim against authored evidence cards.",
    tone: "working",
  },
  {
    id: "sources",
    label: "Legacy source metadata",
    fallback: "Older source labels remain visible as metadata. They are not a new source check or a current publication decision.",
    tone: "legacy",
  },
  {
    id: "provider",
    label: "External video",
    fallback: "Disabled in this fixture path. No player, iframe, or external request is loaded here.",
    tone: "disabled",
  },
  {
    id: "project",
    label: "Fixture written-explanation project",
    fallback: "Use a short written explanation to make the missing support and your revision inspectable in this page session.",
    tone: "fixture",
  },
  {
    id: "proof",
    label: "Honour-based local cold transfer",
    fallback: "You may try a fresh explanation later without help. This page does not verify, record, or evaluate that attempt.",
    tone: "local",
  },
  {
    id: "return",
    label: "Delayed return",
    fallback: "Unavailable. This fixture does not schedule a return, send a reminder, or retain a future task.",
    tone: "unavailable",
  },
];

function linearMap(preview: SourceCorroborationPathPreview) {
  return LINEAR_MAP.map((presentationStep) => {
    const projectionStep = preview.steps.find((step) => step.id === presentationStep.id);
    return {
      ...presentationStep,
      action: projectionStep?.action ?? null,
      detail: presentationStep.id === "proof" ? presentationStep.fallback : projectionStep?.text ?? presentationStep.fallback,
      status: projectionStep?.status ?? "projection-unavailable",
    };
  });
}

function CharacterCount({ used, limit }: { used: number; limit: number }) {
  return <small className="forge-source-path-count">{used} / {limit}</small>;
}

export function SourceCorroborationPath({
  preview,
}: {
  preview: SourceCorroborationPathPreview;
}) {
  const [draft, setDraft] = useState("");
  const [unsupportedLink, setUnsupportedLink] = useState("");
  const [revision, setRevision] = useState("");
  const [recorded, setRecorded] = useState(false);

  const hasScratchpadEntry = draft.trim().length > 0 || unsupportedLink.trim().length > 0 || revision.trim().length > 0;
  const isWorldActionAvailable = preview.banner.status === "working-world" && preview.primaryAction.available;
  const projectAction = preview.steps.find((step) => step.id === "project")?.action;
  const isScratchpadAvailable = projectAction?.available === true;

  return (
    <main className="forge-source-path" id="forge-main" tabIndex={-1}>
      <header className="forge-source-path-hero" data-projection-title={preview.title}>
        <ForgeKicker>Source path preview</ForgeKicker>
        <h1>Verify before you trust.</h1>
        <p>
          Follow one linear presentation of a source-corroboration route. It names what is working, what is only legacy metadata,
          and what this fixture cannot offer.
        </p>
      </header>

      <aside
        className="forge-source-path-banner"
        aria-label="Presentation boundary"
        data-projection-status={preview.banner.status}
      >
        <ForgeStatus tone="quiet">Adult presentation · fixture path · not assigned</ForgeStatus>
        <div className="forge-source-path-banner-copy">
          <p>{preview.banner.text}</p>
          <p>This is a local presentation surface, not an assignment, account workflow, evidence record, or claim about your learning.</p>
        </div>
      </aside>

      <section className="forge-source-path-section" aria-labelledby="source-path-map-title">
        <div className="forge-source-path-heading">
          <span>Linear map</span>
          <h2 id="source-path-map-title">Keep the route’s limits in the route.</h2>
        </div>
        <ol className="forge-source-path-map" aria-label="Source corroboration path availability">
          {linearMap(preview).map((step, index) => (
            <li
              className={`forge-source-path-step forge-source-path-step--${step.tone}`}
              data-projection-status={step.status}
              key={step.label}
            >
              <span className="forge-source-path-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
                {step.action ? (
                  <small className="forge-source-path-action-state">
                    {step.action.available
                      ? "Action available in this presentation."
                      : "Action unavailable in this presentation."}
                  </small>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        {isWorldActionAvailable ? (
          <Link className="forge-secondary-action forge-source-path-cta" href="/learn/ai-and-learning">
            Open the working source-corroboration World
            <ForgeArrow />
          </Link>
        ) : (
          <p className="forge-source-path-cta forge-source-path-cta--unavailable" role="status">
            The working World action is unavailable in this presentation: {preview.primaryAction.unavailableReason ?? "presentation-boundary"}.
          </p>
        )}
      </section>

      <section className="forge-source-scratchpad" aria-labelledby="source-scratchpad-title">
        <div className="forge-source-path-heading">
          <span>Ephemeral scratchpad</span>
          <h2 id="source-scratchpad-title">Draft, name the gap, then revise.</h2>
          <p>Nothing below is saved, sent, scored, or added to evidence. It clears when this page refreshes.</p>
        </div>
        {isScratchpadAvailable ? (
          <>
            <div className="forge-source-scratchpad-grid">
              <label>
                <span>Draft an evidence-labelled explanation</span>
                <textarea
                  aria-label="Draft an evidence-labelled explanation"
                  aria-describedby="source-draft-count"
                  maxLength={MAX_DRAFT_LENGTH}
                  onChange={(event) => { setDraft(event.target.value); setRecorded(false); }}
                  placeholder="For example: This statement is supported by… but the source does not establish…"
                  rows={6}
                  value={draft}
                />
                <CharacterCount used={draft.length} limit={MAX_DRAFT_LENGTH} />
                <span className="forge-visually-hidden" id="source-draft-count">{draft.length} of {MAX_DRAFT_LENGTH} characters used</span>
              </label>
              <label>
                <span>Name an unsupported link or missing support</span>
                <input
                  aria-label="Name an unsupported link or missing support"
                  maxLength={MAX_LINK_LENGTH}
                  onChange={(event) => { setUnsupportedLink(event.target.value); setRecorded(false); }}
                  placeholder="A link, source label, or claim that is not supported"
                  type="text"
                  value={unsupportedLink}
                />
                <CharacterCount used={unsupportedLink.length} limit={MAX_LINK_LENGTH} />
              </label>
              <label>
                <span>Revise and record what changed</span>
                <textarea
                  aria-label="Revise and record what changed"
                  maxLength={MAX_REVISION_LENGTH}
                  onChange={(event) => { setRevision(event.target.value); setRecorded(false); }}
                  placeholder="What did you narrow, remove, or qualify after naming the missing support?"
                  rows={5}
                  value={revision}
                />
                <CharacterCount used={revision.length} limit={MAX_REVISION_LENGTH} />
              </label>
            </div>
            <div className="forge-source-scratchpad-footer">
              <button disabled={!hasScratchpadEntry} onClick={() => setRecorded(true)} type="button">
                Mark this revision in this session
              </button>
              <p aria-live="polite">
                {recorded
                  ? "Revision noted only in this open page. Refreshing clears it."
                  : "This scratchpad stays in this open page and clears on refresh."}
              </p>
            </div>
          </>
        ) : (
          <p className="forge-source-scratchpad-unavailable" role="status">
            The exact authored fixture template did not pass this presentation check. <code>fixture-template-unavailable</code>
          </p>
        )}
      </section>

      <aside className="forge-source-unavailable" aria-labelledby="source-unavailable-title">
        <span>Explicitly unavailable here</span>
        <h2 id="source-unavailable-title">No hidden continuation behind the fixture.</h2>
        <ul>
          <li>External video playback or automatic external requests</li>
          <li>Account, provider, model, database, API, or evidence-record actions</li>
          <li>Automatic status labels or a delayed-return claim</li>
          <li>Scheduled reminders, persistence, or a retained scratchpad</li>
        </ul>
      </aside>
    </main>
  );
}
