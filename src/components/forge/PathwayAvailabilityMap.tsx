import Link from "next/link";

import type { PublicPathwayAvailability } from "@/src/forge/pathways/public-availability";

import { ForgeKicker, ForgeSectionHeading, ForgeStatus } from "./ForgePrimitives";
import { ForgeArrow } from "./ForgeShell";

function sourcePolicyText(entry: Extract<PublicPathwayAvailability, { status: "released-capability" }>) {
  return entry.ageModes.map((mode) => `${mode.label}: ${mode.policyLabel}`).join(" · ");
}

export function PathwayAvailabilityMap({
  availability,
}: {
  availability: readonly PublicPathwayAvailability[];
}) {
  const releasedCount = availability.filter((entry) => entry.status === "released-capability").length;
  const gapCount = availability.length - releasedCount;
  const mappingLabel = releasedCount === 1 ? "mapping" : "mappings";
  const mappingVerb = releasedCount === 1 ? "appears" : "appear";
  const areaLabel = availability.length === 1 ? "area" : "areas";
  const gapLabel = gapCount === 1 ? "gap" : "gaps";
  const gapVerb = gapCount === 1 ? "remains" : "remain";

  return (
    <main className="forge-pathways-page" id="forge-main" tabIndex={-1}>
      <header className="forge-pathways-hero">
        <ForgeKicker>Current availability</ForgeKicker>
        <h1>What FORGE can—and cannot—offer today.</h1>
        <p>
          {releasedCount} released {mappingLabel} {mappingVerb} across {availability.length} entitlement {areaLabel}. {gapCount} identified {gapLabel} {gapVerb} visible instead of
          being filled with a course list, a generated lesson, or a promise.
        </p>
      </header>

      <aside className="forge-pathways-boundary" aria-labelledby="pathways-boundary-title">
        <ForgeStatus tone="quiet">Availability map only</ForgeStatus>
        <h2 id="pathways-boundary-title">Not a curriculum, recommendation, or coverage claim.</h2>
        <p>
          This map lists current released mappings and explicit absences. It is not a coverage claim and does not set a pace, grade level,
          sequence, prerequisite, personal path, completion status, or homeschool decision.
        </p>
      </aside>

      <section className="forge-pathways-section" aria-labelledby="pathways-map-title">
        <ForgeSectionHeading
          id="pathways-map-title"
          label="Nine-area entitlement ledger"
          title="Released capability and identified gap stay equally visible."
          description={`${releasedCount} released mappings · ${gapCount} identified gaps · no missing area is hidden.`}
        />
        <ol className="forge-pathways-list" aria-label="Current pathway availability by entitlement area">
          {availability.map((entry, index) => (
            <li
              className={`forge-pathway-row forge-pathway-row--${entry.status}`}
              data-testid={`pathway-${entry.status}-${entry.area}`}
              key={entry.area}
            >
              <span className="forge-pathway-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div className="forge-pathway-main">
                <p className="forge-pathway-area">{entry.areaLabel}</p>
                <h3>{entry.status === "released-capability" ? entry.capability.title : "No released capability yet"}</h3>
                {entry.status === "released-capability" ? (
                  <>
                    <ForgeStatus tone="evidence">Released capability</ForgeStatus>
                    <dl>
                      <div><dt>Available to</dt><dd>{entry.ageModes.map((mode) => mode.label).join(" · ")}</dd></div>
                      <div><dt>Source policy</dt><dd>{sourcePolicyText(entry)}</dd></div>
                      <div><dt>Return proof</dt><dd>{entry.returnProof.text}</dd></div>
                    </dl>
                  </>
                ) : (
                  <>
                    <ForgeStatus tone="quiet">Identified gap</ForgeStatus>
                    <p className="forge-pathway-gap-copy">{entry.gapText}</p>
                  </>
                )}
              </div>
              {entry.status === "released-capability" ? (
                <Link className="forge-pathway-open" href={entry.world.route}>
                  Open {entry.world.title} World
                  <ForgeArrow />
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="forge-pathways-control" aria-labelledby="pathways-control-title">
        <ForgeSectionHeading
          id="pathways-control-title"
          label="Learner control stays visible"
          title="A map can explain availability without directing a learner."
          description="A future reviewed pathway must make its rationale, alternatives, missing evidence, and decision authority inspectable."
        />
        <ul>
          <li><strong>Choose another question.</strong><span>Question-first intake remains open; this map does not lock an order.</span></li>
          <li><strong>Pause, decline, or ask for help.</strong><span>Those are learner rights, not gaps to be smoothed over by a recommendation.</span></li>
          <li><strong>Keep missing areas visible.</strong><span>Only a separately reviewed released package can change an identified gap.</span></li>
        </ul>
        <Link className="forge-secondary-action forge-pathways-home-link" href="/">
          Ask a different question
          <ForgeArrow />
        </Link>
      </section>
    </main>
  );
}
