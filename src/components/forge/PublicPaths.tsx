import Link from "next/link";

import { PUBLIC_GOAL_DIRECTIONS } from "@/src/forge/public-paths";
import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";

import { ForgeKicker, ForgeSectionHeading, ForgeStatus } from "./ForgePrimitives";
import { ForgeArrow } from "./ForgeShell";
import { StartDraftLink } from "./refoundation/public/StartDraftLink";

export function PublicPaths() {
  return (
    <main className="forge-path-catalog" id="forge-main" tabIndex={-1}>
      <header className="forge-path-catalog__hero">
        <ForgeKicker>Goals before course catalogs</ForgeKicker>
        <h1>Learn toward something you want to do.</h1>
        <p>
          FORGE can shape any goal into an inspectable candidate map. It only calls a path
          reviewed when its capabilities, sources, activities, projects, proof, and limits
          have passed human publication gates.
        </p>
        <div className="forge-path-catalog__hero-actions">
          <Link className="forge-primary-action" href="/start">
            Shape my goal
            <ForgeArrow />
          </Link>
          <Link className="forge-text-link" href="/coverage">
            Inspect current coverage
          </Link>
        </div>
      </header>

      <aside className="forge-path-catalog__boundary" aria-labelledby="published-paths-title">
        <ForgeStatus tone="human">Publication boundary</ForgeStatus>
        <h2 id="published-paths-title">No complete broad path is published yet.</h2>
        <p>
          Four reviewed activities work today. They are real components, not proof that FORGE
          already provides a complete engineering, finance, psychology, civic, or homeschool
          curriculum. The missing work stays visible below.
        </p>
      </aside>

      <section className="forge-path-catalog__section" aria-labelledby="working-activities-title">
        <ForgeSectionHeading
          id="working-activities-title"
          label="Reviewed activities available now"
          title="Small, complete Worlds with proof after help."
          description="Each World binds an authored capability, reviewed sources, deterministic or source-authoritative transitions, governed support, and an unfamiliar transfer."
        />
        <div className="forge-path-catalog__worlds">
          {PUBLIC_WORLD_CATALOG.map((world) => (
            <article key={world.id}>
              <ForgeStatus tone="evidence">Released activity · v{world.version}</ForgeStatus>
              <h3>{world.title}</h3>
              <p>{world.summary}</p>
              <dl>
                <div><dt>Evidence</dt><dd>{world.evidenceTier}</dd></div>
                <div><dt>Age modes</dt><dd>{world.ageModes.join(" · ")}</dd></div>
              </dl>
              <Link href={world.route}>
                Open reviewed activity
                <ForgeArrow />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="forge-path-catalog__section" aria-labelledby="goal-directions-title">
        <ForgeSectionHeading
          id="goal-directions-title"
          label="Goal directions"
          title="Broad enough for a life. Honest enough to show the gaps."
          description="Choose a direction to begin with your own wording. FORGE will not silently turn an outline or a few components into a published course."
        />
        <div className="forge-path-catalog__directions">
          {PUBLIC_GOAL_DIRECTIONS.map((direction) => (
            <article key={direction.id}>
              <div className="forge-path-catalog__direction-heading">
                <ForgeStatus tone={direction.status === "reviewed_components" ? "evidence" : "quiet"}>
                  {direction.status === "reviewed_components"
                    ? "Reviewed components · no complete path"
                    : "Outline only · not instruction"}
                </ForgeStatus>
                <h3>{direction.title}</h3>
                <p>{direction.desiredCapability}</p>
              </div>
              <dl>
                <div>
                  <dt>Meaningful outcome</dt>
                  <dd>{direction.practicalOutcome}</dd>
                </div>
                <div>
                  <dt>Available now</dt>
                  <dd>
                    {direction.availableNow.length > 0
                      ? direction.availableNow.join(" · ")
                      : "No reviewed activity is bound to this direction yet."}
                  </dd>
                </div>
              </dl>
              <details>
                <summary>What is missing before publication?</summary>
                <ul>
                  {direction.missingBeforePathPublication.map((gap) => <li key={gap}>{gap}</li>)}
                </ul>
              </details>
              <StartDraftLink goal={direction.learnerQuestion}>
                Start from this goal
                <ForgeArrow />
              </StartDraftLink>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
