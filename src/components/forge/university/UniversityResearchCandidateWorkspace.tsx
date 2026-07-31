import type { UniversityResearchCandidateCompilationV1 } from "@/src/forge/university-research-artifacts/candidate-contracts";
import type {
  UniversityResearchSurfacePacketV1,
  UniversityResearchSurfaceScenario,
  UniversityResearchSurfaceToken,
} from "@/src/forge/university-research-artifacts/surface-packet";
import type { UniversitySemesterLoopProjectionStatus } from "@/src/forge/university-semester-loop";

import styles from "./UniversityResearchCandidateWorkspace.module.css";

type JourneyState = "checked" | "current" | "not_needed" | "stopped" | "waiting";
type JourneyStage = Readonly<{
  id: "sources" | "today" | "recovery" | "study" | "return";
  label: string;
  state: JourneyState;
}>;

const JOURNEY_LABELS = Object.freeze({
  sources: "Sources",
  today: "Today",
  recovery: "Recovery",
  study: "Protected study",
  return: "Return",
});

function journeyFor(
  status: UniversitySemesterLoopProjectionStatus,
): readonly JourneyStage[] {
  const states: Record<JourneyStage["id"], JourneyState> = {
    sources: "waiting",
    today: "waiting",
    recovery: "waiting",
    study: "waiting",
    return: "waiting",
  };
  switch (status) {
    case "source_review_required":
      states.sources = "current";
      break;
    case "recovery_required":
      states.sources = "checked";
      states.today = "stopped";
      states.recovery = "current";
      break;
    case "learner_choice_required":
      states.sources = "checked";
      states.today = "current";
      break;
    case "protected_study_ready":
    case "world_review_required":
      states.sources = "checked";
      states.today = "checked";
      states.recovery = "not_needed";
      states.study = "current";
      break;
    case "path_complete":
      states.sources = "checked";
      states.today = "checked";
      states.recovery = "not_needed";
      states.study = "not_needed";
      states.return = "current";
      break;
    case "path_blocked":
      states.sources = "checked";
      states.today = "stopped";
      break;
    case "invalid":
      states.sources = "stopped";
      break;
  }
  return (Object.keys(JOURNEY_LABELS) as JourneyStage["id"][]).map((id) => ({
    id,
    label: JOURNEY_LABELS[id],
    state: states[id],
  }));
}

function titleCase(value: string): string {
  return value.replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

function stateLabel(state: JourneyState): string {
  return state === "not_needed" ? "not needed" : state.replaceAll("_", " ");
}

function shortDigest(value: string): string {
  return `${value.slice(0, 19)}...`;
}

function SurfaceToken({
  token,
}: Readonly<{
  token: UniversityResearchSurfaceToken;
}>) {
  switch (token.kind) {
    case "identifier":
      return (
        <bdi dir="ltr" className={styles.identifier}>
          <code>{token.value}</code>
        </bdi>
      );
    case "timestamp":
      return <time dateTime={token.value}>{token.value}</time>;
    case "text":
      return token.value;
  }
}

function CandidateScenarioRegion({
  surface,
  compilation,
}: Readonly<{
  surface: UniversityResearchSurfaceScenario;
  compilation: Readonly<UniversityResearchCandidateCompilationV1>;
}>) {
  const journey = journeyFor(compilation.projection.status);
  const ordinal = String(surface.ordinal).padStart(2, "0");
  const titleId = `university-research-candidate-${surface.ordinal}-title`;
  const evidenceTitleId =
    `university-research-candidate-${surface.ordinal}-evidence-title`;
  const choicesTitleId =
    `university-research-candidate-${surface.ordinal}-choices-title`;
  const effectsTitleId =
    `university-research-candidate-${surface.ordinal}-effects-title`;
  const tasksTitleId =
    `university-research-candidate-${surface.ordinal}-tasks-title`;
  const journeyTitleId =
    `university-research-candidate-${surface.ordinal}-journey-title`;

  return (
    <section
      id={`candidate-${surface.regionId}`}
      className={styles.scenario}
      data-scenario={surface.scenarioId}
      data-status={compilation.projection.status}
      aria-labelledby={titleId}
    >
      <section className={styles.hero}>
        <p className={styles.heroIndex} aria-hidden="true">{ordinal}</p>
        <div>
          <p className={styles.eyebrow}>
            Current state / {titleCase(surface.candidateStateLabel)}
          </p>
          <h1 id={titleId}>One semester. One honest next move.</h1>
        </div>
      </section>

      <section className={styles.journey} aria-labelledby={journeyTitleId}>
        <h2 className="sr-only" id={journeyTitleId}>
          Semester learning loop
        </h2>
        <ol>
          {journey.map((stage, index) => (
            <li
              key={stage.id}
              data-state={stage.state}
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stage.label}</strong>
              <small>{stateLabel(stage.state)}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.currentJob}>
        <div>
          <p>Current bounded job</p>
          <h2>{titleCase(surface.nextJob.kind)}</h2>
        </div>
        <div>
          <p>
            This job belongs to {surface.nextJob.owner}. The exact facts,
            choices, and effects remain separate below.
          </p>
          {surface.nextJob.primaryControl.kind === "local_anchor_navigation"
              && surface.nextJob.primaryControl.label
              && surface.nextJob.primaryControl.targetId
            ? (
                <a href={`#${surface.nextJob.primaryControl.targetId}`}>
                  {surface.nextJob.primaryControl.label}
                </a>
              )
            : (
                <p className={styles.noControl}>
                  No local control is available in this state.
                </p>
              )}
        </div>
      </section>

      <section
        className={styles.evidence}
        aria-labelledby={evidenceTitleId}
      >
        <header>
          <p>Same canonical scenario record</p>
          <h2 id={evidenceTitleId}>The facts stay inspectable.</h2>
          <span>
            No score blends source uncertainty, declared capacity, path
            ownership, activity binding, or terminal state.
          </span>
        </header>
        <div className={styles.factGrid}>
          {surface.facts.map((fact, index) => (
            <section key={fact.itemId} className={styles.factCard}>
              <p>{String(index + 1).padStart(2, "0")} / {fact.label}</p>
              <div>
                {fact.tokens.map((token, tokenIndex) => (
                  <SurfaceToken
                    key={`${fact.itemId}-${tokenIndex}`}
                    token={token}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <div className={styles.detailGrid}>
        <section aria-labelledby={choicesTitleId}>
          <p>Choices</p>
          <h2 id={choicesTitleId}>{surface.choicesHeading}</h2>
          <ul>
            {surface.choices.map((choice) => (
              <li key={choice.choiceId}>
                <strong>{choice.label}</strong>
                <span>Owner: {choice.owner}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          id={surface.effectBoundaryId}
          aria-labelledby={effectsTitleId}
          tabIndex={-1}
        >
          <p>Effect boundary</p>
          <h2 id={effectsTitleId}>{surface.effectsHeading}</h2>
          <dl>
            {surface.effects.map((effect) => (
              <div key={effect.label}>
                <dt>{effect.label}</dt>
                <dd>{effect.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className={styles.tasks} aria-labelledby={tasksTitleId}>
        <div>
          <p>Fixed inspection script</p>
          <h2 id={tasksTitleId}>{surface.tasksHeading}</h2>
        </div>
        <ol>
          {surface.tasks.map((task) => <li key={task}>{task}</li>)}
        </ol>
      </section>

      <footer className={styles.authority}>
        <div>
          <p>{surface.terminalHeading}</p>
          <strong>
            {titleCase(surface.terminal[0]?.value ?? "Unavailable")}
          </strong>
        </div>
        <dl>
          {surface.terminal.map((entry) => (
            <div key={entry.label}>
              <dt>{entry.label}</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
          <div>
            <dt>Scenario binding</dt>
            <dd>{shortDigest(compilation.digests.bindingDigest)}</dd>
          </div>
          <div>
            <dt>Projection</dt>
            <dd>{shortDigest(compilation.digests.projectionDigest)}</dd>
          </div>
        </dl>
        <p className={styles.claimCeiling}>
          This local synthetic compilation does not establish live data,
          institutional truth, rendered parity, independent equivalence,
          participant readiness, accessibility conformance, learning, demand,
          or production readiness.
        </p>
      </footer>
    </section>
  );
}

export function UniversityResearchCandidateWorkspace({
  packet,
  compilations,
}: Readonly<{
  packet: UniversityResearchSurfacePacketV1;
  compilations: readonly Readonly<UniversityResearchCandidateCompilationV1>[];
}>) {
  const boundScenarios: {
    surface: UniversityResearchSurfaceScenario;
    compilation: Readonly<UniversityResearchCandidateCompilationV1>;
  }[] = [];
  for (const surface of packet.scenarios) {
    const compilation = compilations.find(
      (candidate) => candidate.scenarioId === surface.scenarioId,
    );
    if (
      !compilation
      || compilation.packId !== packet.packId
      || compilation.digests.packDigest !== packet.packDigest
      || compilation.projection.status !== compilation.scenario.expectedStatus
    ) {
      return <UniversityResearchCandidateUnavailable />;
    }
    boundScenarios.push({ surface, compilation });
  }
  const firstCompilation = boundScenarios[0]?.compilation;
  if (boundScenarios.length !== 7 || !firstCompilation) {
    return <UniversityResearchCandidateUnavailable />;
  }

  return (
    <article
      className={styles.surface}
      aria-label="University research candidate"
      data-pack={packet.packId}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university workflow research</p>
          <p className={styles.course}>
            {firstCompilation.scenario.context.courseLabel}
          </p>
        </div>
        <div className={styles.termBlock}>
          <p>{firstCompilation.scenario.context.termLabel}</p>
          <span>{firstCompilation.scenario.context.timeZone}</span>
        </div>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Synthetic adult fixture</strong>
        <span>Copied facts are not university truth</span>
        <span>Local navigation only</span>
        <span>No save, send, session, submission, or evidence</span>
      </div>

      <div className={styles.stateSurface}>
        <fieldset className={styles.scenarioPicker}>
          <legend>Stress-test the same semester</legend>
          <div>
            {packet.scenarios.map((scenario, index) => (
              <label
                key={scenario.scenarioId}
                htmlFor={`candidate-${packet.navigationItems[index]?.inputId}`}
              >
                <input
                  id={`candidate-${packet.navigationItems[index]?.inputId}`}
                  type="radio"
                  name="university-research-candidate-scenario"
                  value={scenario.scenarioId}
                  aria-controls={`candidate-${scenario.regionId}`}
                  defaultChecked={index === 0}
                />
                <span>{titleCase(scenario.candidateStateLabel)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.scenarios}>
          {boundScenarios.map(({ surface, compilation }) => (
            <CandidateScenarioRegion
              key={surface.scenarioId}
              surface={surface}
              compilation={compilation}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

export function UniversityResearchCandidateUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No university research candidate is available.</h1>
      <p>
        No canonical scenario, semester-loop projection, control, participant
        task, capture, or external effect was exposed.
      </p>
    </section>
  );
}
