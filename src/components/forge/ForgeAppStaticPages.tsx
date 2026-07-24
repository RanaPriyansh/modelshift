import Link from "next/link";

import { BUILT_IN_WORLD_PACKS } from "@/src/forge/worlds";
import { FIRST_PILOT_PROJECT_TEMPLATE } from "@/src/forge/projects/contracts";

import { ForgeKicker, ForgeSectionHeading, ForgeStatus } from "./ForgePrimitives";
import { ForgeArrow } from "./ForgeShell";

export function ForgeProjects() {
  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Projects · capability in a real context</ForgeKicker>
        <h1>Make work that can survive critique.</h1>
        <p>
          A project is more than an output. It binds capabilities, constraints, source and AI-use
          provenance, artifact revisions, critique, defence, unfamiliar transfer, and—where
          reviewed—delayed return.
        </p>
      </header>

      <aside className="forge-app-boundary">
        <ForgeStatus tone="human">Current publication boundary</ForgeStatus>
        <h2>No project is released as canonical capability evidence yet.</h2>
        <p>
          One source-verification workspace works as a fixture. It can support thinking and an
          artifact draft, but it has no published project proof family, reviewer authority, or
          delayed-return task. Finishing it creates no status or evidence claim.
        </p>
      </aside>

      <section className="forge-app-section" aria-labelledby="project-fixture-title">
        <ForgeSectionHeading
          id="project-fixture-title"
          label="Working fixture"
          title="Verify an AI-generated claim before acting."
          description="A practical adult-path seed that uses existing source-corroboration and primary-source components while its full path remains unpublished."
        />
        <article className="forge-project-brief">
          <header>
            <ForgeStatus tone="learner">Fixture-only workspace</ForgeStatus>
            <h3>Produce a bounded verification memo.</h3>
            <p>Trace one factual claim through available support, identify what the evidence can establish, name what remains open, and revise the decision language.</p>
          </header>
          <ol>
            <li><span>01</span><div><strong>Choose a consequential claim.</strong><small>Remove personal, private, medical, legal, or financial data.</small></div></li>
            <li><span>02</span><div><strong>Separate claim, source, and inference.</strong><small>Do not treat a link or model output as evidence by itself.</small></div></li>
            <li><span>03</span><div><strong>Seek contradiction and corroboration.</strong><small>Bind exact source locators and version context.</small></div></li>
            <li><span>04</span><div><strong>Revise the decision.</strong><small>State confidence, limits, and what would change the conclusion.</small></div></li>
            <li><span>05</span><div><strong>Defend it unaided.</strong><small>Planned; no released proof task is bound today.</small></div></li>
          </ol>
          <Link className="forge-primary-action" href={`/app/projects/${FIRST_PILOT_PROJECT_TEMPLATE.projectId}`}>
            Inspect fixture contract
            <ForgeArrow />
          </Link>
        </article>
      </section>

      <section className="forge-app-section" aria-labelledby="project-families-title">
        <ForgeSectionHeading
          id="project-families-title"
          label="Project families"
          title="Build, investigate, repair, design, explain, perform, or serve."
          description="These are product contracts for future reviewed templates—not a claim that FORGE can safely assign them today."
        />
        <div className="forge-project-families">
          {[
            ["Build", "Create and test an artifact against measurable constraints."],
            ["Investigate", "Collect or compare evidence using a reproducible method."],
            ["Repair", "Diagnose a failure, act safely, and verify the repair."],
            ["Design", "Frame needs, make trade-offs, prototype, and test with users."],
            ["Explain", "Create an evidence-bound explanation for a real audience."],
            ["Perform", "Practise, record, critique, and repeat a skilled performance."],
            ["Serve", "Contribute useful work under real stakeholder and safeguarding constraints."],
          ].map(([title, description]) => (
            <article key={title}><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
      </section>
    </main>
  );
}

/**
 * The only resolvable project detail is an authored fixture contract. It is
 * intentionally not presented as an active learner project or a source of
 * capability evidence until publication and reviewer authority exist.
 */
export function ForgeProjectFixtureDetail() {
  const template = FIRST_PILOT_PROJECT_TEMPLATE;
  const content = template.content;
  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Project detail · authored fixture only</ForgeKicker>
        <h1>Written explanation and independent defence</h1>
        <p>{content.mapBindingSemantics.practicalOutcome}</p>
        <div className="forge-app-page__hero-actions">
          <Link className="forge-secondary-action" href="/app/projects">All project contracts</Link>
          <Link className="forge-primary-action" href="/paths/source-corroboration">Open the separate source-verification fixture</Link>
        </div>
      </header>

      <aside className="forge-app-boundary">
        <ForgeStatus tone="human">Not assigned or released</ForgeStatus>
        <h2>This is not an active learner project.</h2>
        <p>
          FORGE exposes this immutable authored package to make its planned brief, provenance,
          critique, and defence requirements inspectable. It has no learner assignment, artifact
          upload, reviewer authority, published proof family, or delayed-return claim.
        </p>
      </aside>

      <section className="forge-app-section" aria-labelledby="project-brief-title">
        <ForgeSectionHeading
          id="project-brief-title"
          label={`${template.id} · v${template.version}`}
          title="Brief and constraints"
          description={content.authenticConsequence.learnerVisibleConsequence}
        />
        <article className="forge-project-brief">
          <dl>
            <div><dt>Project identity</dt><dd>{template.projectId}</dd></div>
            <div><dt>Package digest</dt><dd>{template.digest}</dd></div>
            <div><dt>Mode</dt><dd>{content.mode}</dd></div>
            <div><dt>Consequence</dt><dd>{content.authenticConsequence.context.replaceAll("-", " ")} only; no external publication or contact</dd></div>
            <div><dt>Materials</dt><dd>{content.materials.map((material) => material.learnerVisibleLabel).join(" · ")}</dd></div>
            <div><dt>No-cost alternative</dt><dd>{content.noCostMaterialAlternative.mode.replaceAll("-", " ")}; no purchase, travel, or external account</dd></div>
          </dl>
        </article>
      </section>

      <section className="forge-app-section" aria-labelledby="project-stages-title">
        <ForgeSectionHeading
          id="project-stages-title"
          label="Inspectable authored stages"
          title="Artifacts, critique, revision, and protected defence."
          description="These requirements are package content. They do not create a live submission path in this release."
        />
        <div className="forge-project-families">
          {content.milestones.map((milestone) => (
            <article key={milestone.milestoneId}>
              <h3>{String(milestone.sequence).padStart(2, "0")} · {milestone.operationId.replace("operation.authored.", "")}</h3>
              <p>{milestone.learnerAction}</p>
              <small>Required artifacts: {milestone.completionArtifactIds.join(" · ")}</small>
            </article>
          ))}
          {content.proofOperations.map((operation) => (
            <article key={operation.operationId}>
              <h3>{operation.kind.replaceAll("-", " ")}</h3>
              <p>{operation.learnerInstruction}</p>
              <small>AI, collaborators, and reused work are not permitted in this protected operation.</small>
            </article>
          ))}
        </div>
      </section>

      <section className="forge-app-section" aria-labelledby="project-provenance-title">
        <ForgeSectionHeading
          id="project-provenance-title"
          label="Required provenance if this package is ever assigned"
          title="Work must remain attributable and challengeable."
          description="The contract expects creator, creation time, contribution identities, source references, and revision history for every required artifact."
        />
        <div className="forge-project-families">
          {content.artifacts.map((artifact) => (
            <article key={artifact.artifactId}>
              <h3>{artifact.artifactId}</h3>
              <p>{artifact.learnerVisibleDescription}</p>
              <small>Formats: {artifact.acceptedFormats.join(" · ")}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ForgeLibrary() {
  const reviewedSources = BUILT_IN_WORLD_PACKS.flatMap((pack) =>
    pack.manifest.sources.map((source) => ({ source, world: pack.manifest })),
  ).filter(
    (entry, index, entries) =>
      entries.findIndex((candidate) => candidate.source.id === entry.source.id) === index,
  );

  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Library · governed inputs, not progress</ForgeKicker>
        <h1>Know what a resource is for—and who reviewed it.</h1>
        <p>
          Opening, watching, or saving a resource never counts as learning evidence. These source
          receipts are bound to released Worlds; they are not a general recommendation feed.
        </p>
      </header>

      <aside className="forge-app-boundary">
        <ForgeStatus tone="quiet">External media boundary</ForgeStatus>
        <h2>YouTube and open-web discovery are candidate inputs only.</h2>
        <p>
          Production assignment requires a time-bounded observation, exact review digest,
          learning role, age and region fit, transcript or inspectable alternative, rights and
          privacy checks, fallback resource, and an active checkpoint. Autoplay and engagement
          ranking stay out.
        </p>
      </aside>

      <section className="forge-app-section" aria-labelledby="reviewed-sources-title">
        <ForgeSectionHeading
          id="reviewed-sources-title"
          label={`${reviewedSources.length} released source receipts`}
          title="Sources currently bound to working Worlds."
          description="Each row names its publisher, review state, content version, access time, license when declared, and the exact World that uses it."
        />
        <div className="forge-library-list">
          {reviewedSources.map(({ source, world }) => (
            <article key={source.id}>
              <header>
                <ForgeStatus tone="evidence">{source.review.status}</ForgeStatus>
                <span>{source.id}</span>
              </header>
              <h3>{source.title}</h3>
              <p>{source.publisher}</p>
              <dl>
                <div><dt>Bound activity</dt><dd>{world.title} · v{world.version}</dd></div>
                <div><dt>Content version</dt><dd>{source.contentVersion}</dd></div>
                <div><dt>Reviewed</dt><dd>{source.review.status === "reviewed" ? `${source.review.reviewedBy} · ${source.review.reviewedAt}` : source.review.status}</dd></div>
                <div><dt>License</dt><dd>{"license" in source && source.license ? source.license : "No license statement carried in this receipt."}</dd></div>
              </dl>
              <a href={source.url} rel="noreferrer" target="_blank">Open publisher source <ForgeArrow /></a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
