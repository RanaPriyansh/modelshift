import type {
  UniversityResearchSurfacePacketV1,
  UniversityResearchSurfaceToken,
} from "@/src/forge/university-research-artifacts/surface-packet";

import styles from "./UniversityResearchNeutralWorksheet.module.css";

function SurfaceToken({
  token,
}: {
  token: UniversityResearchSurfaceToken;
}) {
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

export function UniversityResearchNeutralWorksheet({
  packet,
}: Readonly<{
  packet: UniversityResearchSurfacePacketV1;
}>) {
  return (
    <main id="neutral-worksheet-main" className={styles.page}>
      <a className={styles.skipLink} href="#neutral-worksheet-title">
        Skip to worksheet
      </a>
      <article
        className={styles.worksheet}
        aria-labelledby="neutral-worksheet-title"
        data-pack={packet.packId}
      >
        <header className={styles.header}>
          <h1 id="neutral-worksheet-title">{packet.title}</h1>
        </header>

        <div className={styles.stateSurface}>
          <fieldset className={styles.navigation}>
            <legend>{packet.navigationHeading}</legend>
            <div>
              {packet.navigationItems.map((item, index) => (
                <label key={item.scenarioId} htmlFor={item.inputId}>
                  <input
                    id={item.inputId}
                    type="radio"
                    name="university-research-example"
                    value={item.scenarioId}
                    aria-controls={item.regionId}
                    defaultChecked={index === 0}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.scenarios}>
            {packet.scenarios.map((scenario) => (
              <section
                key={scenario.scenarioId}
                id={scenario.regionId}
                className={styles.scenario}
                data-scenario={scenario.scenarioId}
                aria-label={`Example ${scenario.ordinal} worksheet`}
              >
                <section
                  className={styles.section}
                  aria-labelledby={`research-example-${scenario.ordinal}-facts-heading`}
                >
                  <h2 id={`research-example-${scenario.ordinal}-facts-heading`}>
                    {scenario.factsHeading}
                  </h2>
                  <table>
                    <tbody>
                      {scenario.facts.map((fact) => (
                        <tr key={fact.itemId}>
                          <th scope="row">{fact.label}</th>
                          <td>
                            {fact.tokens.map((token, index) => (
                              <SurfaceToken
                                key={`${fact.itemId}-${index}`}
                                token={token}
                              />
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section
                  className={styles.section}
                  aria-labelledby={`research-example-${scenario.ordinal}-choices-heading`}
                >
                  <h2 id={`research-example-${scenario.ordinal}-choices-heading`}>
                    {scenario.choicesHeading}
                  </h2>
                  <ul className={styles.choices}>
                    {scenario.choices.map((choice) => (
                      <li key={choice.choiceId}>
                        <span>{choice.label}</span>
                        <small>Owner: {choice.owner}</small>
                      </li>
                    ))}
                  </ul>
                </section>

                <section
                  className={styles.section}
                  aria-labelledby={`research-example-${scenario.ordinal}-job-heading`}
                >
                  <h2 id={`research-example-${scenario.ordinal}-job-heading`}>
                    {scenario.nextJobHeading}
                  </h2>
                  <dl className={styles.definitionList}>
                    <div>
                      <dt>Job</dt>
                      <dd>{scenario.nextJob.kind}</dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>{scenario.nextJob.owner}</dd>
                    </div>
                  </dl>
                  {scenario.nextJob.primaryControl.kind
                      === "local_anchor_navigation"
                    && scenario.nextJob.primaryControl.label
                    && scenario.nextJob.primaryControl.targetId
                    ? (
                        <a
                          className={styles.localControl}
                          href={`#${scenario.nextJob.primaryControl.targetId}`}
                        >
                          {scenario.nextJob.primaryControl.label}
                        </a>
                      )
                    : (
                        <p className={styles.noControl}>
                          No local control for this example.
                        </p>
                      )}
                </section>

                <section
                  id={scenario.effectBoundaryId}
                  className={styles.section}
                  aria-labelledby={`research-example-${scenario.ordinal}-effects-heading`}
                  tabIndex={-1}
                >
                  <h2 id={`research-example-${scenario.ordinal}-effects-heading`}>
                    {scenario.effectsHeading}
                  </h2>
                  <dl className={styles.definitionList}>
                    {scenario.effects.map((effect) => (
                      <div key={effect.label}>
                        <dt>{effect.label}</dt>
                        <dd>{effect.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section
                  className={styles.section}
                  aria-labelledby={`research-example-${scenario.ordinal}-tasks-heading`}
                >
                  <h2 id={`research-example-${scenario.ordinal}-tasks-heading`}>
                    {scenario.tasksHeading}
                  </h2>
                  <ol className={styles.tasks}>
                    {scenario.tasks.map((task) => <li key={task}>{task}</li>)}
                  </ol>
                </section>

                <section
                  className={styles.section}
                  aria-labelledby={`research-example-${scenario.ordinal}-terminal-heading`}
                >
                  <h2 id={`research-example-${scenario.ordinal}-terminal-heading`}>
                    {scenario.terminalHeading}
                  </h2>
                  <dl className={styles.definitionList}>
                    {scenario.terminal.map((entry) => (
                      <div key={entry.label}>
                        <dt>{entry.label}</dt>
                        <dd>{entry.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </section>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
