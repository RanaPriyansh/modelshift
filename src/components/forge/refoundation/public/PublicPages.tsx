import Link from "next/link";

import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";

import { PublicFrame } from "./PublicFrame";
import { CANDIDATE_DIRECTIONS, METHOD_STEPS } from "./publicData";
import styles from "./PublicExperience.module.css";
import { StartDraftLink } from "./StartDraftLink";

function PageHero({
  eyebrow,
  title,
  body,
  aside,
}: {
  eyebrow: string;
  title: string;
  body: string;
  aside?: string;
}) {
  return (
    <header className={styles.pageHero}>
      <div>
        <p className={styles.pageEyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      {aside ? <p className={styles.pageHeroAside}>{aside}</p> : null}
    </header>
  );
}

export function HowItWorksPage() {
  return (
    <PublicFrame active="how">
      <main id="forge-main" className={styles.publicPage} tabIndex={-1}>
        <PageHero
          eyebrow="One continuous journey"
          title="A goal becomes work you can inspect and proof you can defend."
          body="Forge is not a chatbot, a catalogue, or an automatic course generator. It is a learner-controlled route from intent to independent capability."
          aside="The route can propose broadly. It calls something available only after its content and evidence boundaries are reviewed."
        />

        <section className={styles.journeySection} aria-labelledby="journey-title">
          <div className={styles.sectionHeading}>
            <span>How the system moves</span>
            <h2 id="journey-title">Seven moments. Different jobs.</h2>
          </div>
          <ol className={styles.journeySteps}>
            {METHOD_STEPS.map((step, index) => (
              <li key={step.number} data-wide={index === 2 || index === 4 || index === 5}>
                <div className={styles.journeyNumber}>{step.number}</div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
                <aside>
                  <span>What you should see</span>
                  <p>{step.proof}</p>
                </aside>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.truthSection} aria-labelledby="truth-title">
          <div>
            <p className={styles.pageEyebrow}>The publication boundary</p>
            <h2 id="truth-title">Proposal and availability are not the same state.</h2>
          </div>
          <div className={styles.truthColumns}>
            <article>
              <span>Forge may propose</span>
              <h3>A candidate route</h3>
              <p>
                Goals, capability hypotheses, prerequisites, source needs, projects, and proof
                plans can be made inspectable before they are ready to teach.
              </p>
            </article>
            <article>
              <span>Forge may call available</span>
              <h3>Only reviewed work</h3>
              <p>
                This build exposes four working Worlds. Each has a real route, bounded source
                authority, and an authored evidence contract.
              </p>
            </article>
          </div>
          <div className={styles.inlineWorlds}>
            {PUBLIC_WORLD_CATALOG.map((world) => (
              <Link href={world.route} key={world.id}>
                <span>Open World</span>
                <strong>{world.title}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.closingBand} aria-labelledby="how-closing-title">
          <div>
            <p className={styles.pageEyebrow}>Begin at the beginning</p>
            <h2 id="how-closing-title">What do you want to be able to do?</h2>
          </div>
          <Link href="/start">
            Shape the goal
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    </PublicFrame>
  );
}

type ExploreAvailability = "all" | "with-worlds" | "outline";

export function ExplorePathsPage({
  query,
  availability,
}: {
  query: string;
  availability: ExploreAvailability;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleDirections = CANDIDATE_DIRECTIONS.filter((direction) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [
        direction.title,
        direction.transformation,
        direction.forWhom,
        ...direction.areas,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    const matchesAvailability =
      availability === "all" ||
      (availability === "with-worlds" && direction.availableWorlds.length > 0) ||
      (availability === "outline" && direction.availableWorlds.length === 0);
    return matchesQuery && matchesAvailability;
  });

  return (
    <PublicFrame active="explore">
      <main id="forge-main" className={styles.publicPage} tabIndex={-1}>
        <PageHero
          eyebrow="Explore directions"
          title="Choose an outcome, not a shelf of courses."
          body="These are credible directions for discovery. They are not complete published paths. Where a reviewed World already exists, it is named explicitly."
          aside="A duration, weekly commitment, project, or proof is not advertised until the path itself has passed review."
        />

        <form className={styles.exploreControls} action="/explore" method="get">
          <label>
            Search directions
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Try AI, engineering, politics…"
            />
          </label>
          <label>
            Current coverage
            <select name="availability" defaultValue={availability}>
              <option value="all">All directions</option>
              <option value="with-worlds">Has a reviewed World</option>
              <option value="outline">Outline only</option>
            </select>
          </label>
          <button type="submit">Apply</button>
        </form>

        <section className={styles.directionSection} aria-labelledby="directions-title">
          <div className={styles.sectionHeading}>
            <span>Candidate paths</span>
            <h2 id="directions-title">
              {visibleDirections.length} direction{visibleDirections.length === 1 ? "" : "s"} to
              inspect
            </h2>
          </div>
          {visibleDirections.length > 0 ? (
            <div className={styles.directionList}>
              {visibleDirections.map((direction, index) => (
                <article key={direction.id}>
                  <div className={styles.directionIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className={styles.directionMain}>
                    <p className={styles.statusLabel}>Candidate direction · not a released path</p>
                    <h3>{direction.title}</h3>
                    <p>{direction.transformation}</p>
                    <dl>
                      <div>
                        <dt>For</dt>
                        <dd>{direction.forWhom}</dd>
                      </div>
                      <div>
                        <dt>Areas a reviewed path would cover</dt>
                        <dd>{direction.areas.join(" · ")}</dd>
                      </div>
                      <div>
                        <dt>Commitment</dt>
                        <dd>Not estimated until a reviewed sequence exists.</dd>
                      </div>
                    </dl>
                  </div>
                  <aside>
                    <div>
                      <span>Available now</span>
                      <p>
                        {direction.availableWorlds.length > 0
                          ? direction.availableWorlds.join(" · ")
                          : "No reviewed World is bound to this direction yet."}
                      </p>
                    </div>
                    <div>
                      <span>Before publication</span>
                      <p>{direction.publicationNeed}</p>
                    </div>
                    {direction.id === "ai-literacy" ? (
                      <Link href="/paths/ai-literacy">
                        Inspect this direction
                        <span aria-hidden="true">→</span>
                      </Link>
                    ) : (
                      <StartDraftLink goal={direction.goal}>
                        Start with this goal
                        <span aria-hidden="true">→</span>
                      </StartDraftLink>
                    )}
                  </aside>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyResult}>
              <h3>No direction matches those filters.</h3>
              <p>Clear the search or ask Forge to begin from your own wording.</p>
              <Link href="/explore">Show every direction</Link>
            </div>
          )}
        </section>

        <section className={styles.workingWorldsSection} aria-labelledby="working-worlds-title">
          <div className={styles.sectionHeading}>
            <span>Reviewed and working</span>
            <h2 id="working-worlds-title">Four Worlds you can open today.</h2>
            <p>
              A World is a bounded learning activity. It is not presented as a complete path.
            </p>
          </div>
          <div className={styles.workingWorldGrid}>
            {PUBLIC_WORLD_CATALOG.map((world) => (
              <article key={world.id}>
                <span>
                  {world.kind} · {world.evidenceTier}
                </span>
                <h3>{world.title}</h3>
                <p>{world.summary}</p>
                <Link href={world.route}>
                  Open reviewed World
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </PublicFrame>
  );
}

const AI_MILESTONES = [
  ["01", "Separate fluency from evidence", "Notice when a plausible answer has not shown its support."],
  ["02", "Trace a factual claim", "Move from generated language to reviewed source material."],
  ["03", "Compare support", "Ask what each source establishes, contradicts, or leaves uncertain."],
  ["04", "Understand model limits", "Distinguish useful assistance from authority the model does not have."],
  ["05", "Build a verification memo", "Candidate project: defend a source-bound decision with explicit limits."],
  ["06", "Prove without the assistant", "Candidate check: verify an unfamiliar claim after support is removed."],
] as const;

export function AiLiteracyPage() {
  const aiWorld = PUBLIC_WORLD_CATALOG.find((world) => world.route === "/learn/ai-and-learning");

  return (
    <PublicFrame active="explore">
      <main id="forge-main" className={styles.publicPage} tabIndex={-1}>
        <PageHero
          eyebrow="Candidate direction · AI literacy"
          title="Use AI without outsourcing your judgment."
          body="The intended transformation is simple to state and hard to fake: trace claims, compare evidence, name uncertainty, and know which decisions remain yours."
          aside="This is not a released end-to-end path. One source-corroboration World works today; the broader sequence, project, and retention proof remain unpublished."
        />

        <section className={styles.pathFacts} aria-labelledby="ai-facts-title">
          <h2 id="ai-facts-title">What can be said honestly today</h2>
          <dl>
            <div>
              <dt>For</dt>
              <dd>Learners who use AI for study or work and want to evaluate its output.</dd>
            </div>
            <div>
              <dt>Prerequisites</dt>
              <dd>No published prerequisite sequence yet.</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>Not published. The reviewed components do not justify a path-length claim.</dd>
            </div>
            <div>
              <dt>Weekly commitment</dt>
              <dd>Not published until the full sequence and workload are reviewed.</dd>
            </div>
          </dl>
        </section>

        <section className={styles.milestoneSection} aria-labelledby="ai-milestones-title">
          <div className={styles.sectionHeading}>
            <span>Proposed capability arc</span>
            <h2 id="ai-milestones-title">Six milestones a released path would need.</h2>
            <p>
              The first four describe the intended learning progression. Project and proof
              remain candidate requirements, not available activities.
            </p>
          </div>
          <ol>
            {AI_MILESTONES.map(([number, title, body], index) => (
              <li key={number} data-live={index === 1 || index === 2}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
                <small>{index === 1 || index === 2 ? "Represented in a working World" : "Candidate milestone"}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.livePathSection} aria-labelledby="ai-live-title">
          <div>
            <p className={styles.pageEyebrow}>Working now</p>
            <h2 id="ai-live-title">{aiWorld?.title ?? "AI & learning"}</h2>
            <p>
              Investigate a model-generated factual claim, compare reviewed research sources,
              and state what the evidence can and cannot support. Correctness stays bound to
              the authored source contract.
            </p>
            <ul>
              <li>Reviewed research sources are included inside the World.</li>
              <li>The model does not get authority to decide whether the transfer is correct.</li>
              <li>The final evidence distinguishes supported work from independent proof.</li>
            </ul>
            <Link href="/learn/ai-and-learning">
              Open the reviewed World
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <aside>
            <span>What this direction does not promise</span>
            <ul>
              <li>A complete AI curriculum</li>
              <li>Professional or academic certification</li>
              <li>Current coverage of every model, tool, or policy</li>
              <li>That one successful activity proves lasting capability</li>
            </ul>
          </aside>
        </section>

        <section className={styles.closingBand} aria-labelledby="ai-closing-title">
          <div>
            <p className={styles.pageEyebrow}>Make the direction yours</p>
            <h2 id="ai-closing-title">Start from your version of AI literacy.</h2>
          </div>
          <StartDraftLink goal="I want to become AI-literate.">
            Personalize this goal
            <span aria-hidden="true">→</span>
          </StartDraftLink>
        </section>
      </main>
    </PublicFrame>
  );
}

export function PricingPage() {
  return (
    <PublicFrame active="pricing">
      <main id="forge-main" className={styles.publicPage} tabIndex={-1}>
        <PageHero
          eyebrow="Pricing"
          title="No paid Forge plan is for sale in this build."
          body="There is no checkout, subscription, trial clock, or account upgrade hidden behind this page. The working learning Worlds can be explored without payment."
          aside="Pricing will be published only when the product can name what is included, how continuity works, and what a learner keeps after cancellation."
        />

        <section className={styles.pricingSection} aria-labelledby="pricing-now-title">
          <article className={styles.availablePlan}>
            <p className={styles.statusLabel}>Available now · no payment</p>
            <h2 id="pricing-now-title">Explore on this device</h2>
            <p>
              Open the four reviewed Worlds and create browser-local learning evidence under
              the limits stated in each experience.
            </p>
            <ul>
              <li>Four bounded, working Worlds</li>
              <li>Authored activities and transfer checks</li>
              <li>Browser-local evidence controls</li>
              <li>No card details and no automatic renewal</li>
            </ul>
            <Link href="/explore">
              See what is available
              <span aria-hidden="true">→</span>
            </Link>
          </article>
          <div className={styles.unavailablePlans}>
            <article>
              <span>Not offered here</span>
              <h3>Individual continuity</h3>
              <p>
                Cross-device progress, complete broad paths, and a paid learner subscription
                are not available in this deployment.
              </p>
            </article>
            <article>
              <span>Not offered here</span>
              <h3>Family or educator plan</h3>
              <p>
                There is no family billing, roster, monitoring, or educator purchase flow in
                this deployment.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.pricingPrinciples} aria-labelledby="pricing-principles-title">
          <div>
            <p className={styles.pageEyebrow}>Before a price exists</p>
            <h2 id="pricing-principles-title">Three promises the commercial product must keep.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <h3>Say what is actually included.</h3>
                <p>No complete-path claim from a few reviewed components.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Keep learner evidence legible.</h3>
                <p>Assistance, independent transfer, retention, and untested states stay distinct.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Make ownership and exit clear.</h3>
                <p>Data handling, export, deletion, cancellation, and post-cancellation access must be explicit.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.closingBand} aria-labelledby="pricing-closing-title">
          <div>
            <p className={styles.pageEyebrow}>Start without a purchase</p>
            <h2 id="pricing-closing-title">Try a reviewed World.</h2>
          </div>
          <Link href="/learn/force-and-motion">
            Open force &amp; motion
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    </PublicFrame>
  );
}
