import Link from "next/link";
import { StartSprintForm } from "./BuildEntry";
import { ProductShell } from "./ProductShell";
import { ArrowIcon, BuildIcon, CheckIcon, CompassIcon, LocalIcon, ProofIcon, SparkIcon } from "./SprintIcons";

const EXAMPLES = [
  ["Campus tool", "Help students find one useful event this week.", "campus-tool"],
  ["Portfolio case", "Turn one real decision into a clear case study.", "portfolio-case"],
  ["Research explainer", "Make a difficult idea useful to a specific reader.", "research-explainer"],
] as const;

const DAYS = [
  ["01", "Define & scope", "Choose one person and one useful outcome."],
  ["02", "User insight", "Replace assumptions with one real observation."],
  ["03", "Build the core", "Make the smallest version that actually works."],
  ["04", "Refine & test", "Watch someone use it and repair the friction."],
  ["05", "Polish", "Make the important parts clear and dependable."],
  ["06", "Proof Lab", "Show the work without hiding behind the tools."],
  ["07", "Deliver & reflect", "Ship, name what changed, and leave honest edges."],
] as const;

export function ForgeLanding() {
  return (
    <ProductShell>
      <main id="forge-sprint-main" tabIndex={-1}>
        <section className="forge-landing-hero" aria-labelledby="forge-landing-title">
          <div className="forge-landing-hero__copy">
            <span className="forge-sprint-kicker">A seven-day project sprint for student builders</span>
            <h1 id="forge-landing-title">Build something real.<br /><em>Prove it’s yours.</em></h1>
            <p>
              Forge helps you turn one useful idea into a shipped project—and a clear,
              honest record of the decisions, evidence, and learning behind it.
            </p>
            <div className="forge-landing-hero__actions">
              <Link className="forge-button forge-button--primary" href="/build/new">
                Start a 7-day sprint <ArrowIcon />
              </Link>
              <a className="forge-text-link" href="#how-it-works">See how it works</a>
            </div>
            <p className="forge-local-note"><LocalIcon /> No account. No feed. Your work stays in this browser.</p>
          </div>
          <aside className="forge-landing-prompt" aria-label="Start a Forge sprint">
            <span>Start with a useful finish line</span>
            <h2>What will exist by next week?</h2>
            <StartSprintForm compact />
            <div>
              <span>Good sprint</span>
              <p>“A working event finder five classmates can try.”</p>
              <span>Too broad</span>
              <p>“Learn full-stack development.”</p>
            </div>
          </aside>
        </section>

        <section className="forge-example-strip" aria-labelledby="example-title">
          <div>
            <span className="forge-section-number">01 / Start from a real use</span>
            <h2 id="example-title">Useful beats impressive.</h2>
          </div>
          <div className="forge-example-grid">
            {EXAMPLES.map(([label, copy, template]) => (
              <Link key={template} href={"/build/new?template=" + template}>
                <span>{label}</span>
                <h3>{copy}</h3>
                <span className="forge-card-action">Use this pattern <ArrowIcon /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="forge-how" id="how-it-works" aria-labelledby="how-title">
          <header>
            <span className="forge-section-number">02 / The method</span>
            <h2 id="how-title">A small loop that ends in evidence.</h2>
            <p>Forge keeps the project moving without pretending the system did the work for you.</p>
          </header>
          <ol>
            <li><CompassIcon /><span>01</span><h3>Choose a finish line</h3><p>Name who it helps and what must work by Day 7.</p></li>
            <li><BuildIcon /><span>02</span><h3>Make one move daily</h3><p>Follow a focused map, record decisions, and adapt it to reality.</p></li>
            <li><ProofIcon /><span>03</span><h3>Assemble honest proof</h3><p>Show the artifact, your reasoning, AI use, and what remains unfinished.</p></li>
          </ol>
        </section>

        <section className="forge-day-map" aria-labelledby="day-map-title">
          <header>
            <span className="forge-section-number">03 / Your seven-day map</span>
            <h2 id="day-map-title">Enough structure to move.<br />Enough freedom to make it yours.</h2>
          </header>
          <ol>
            {DAYS.map(([number, title, detail], index) => (
              <li key={number} className={index === 5 ? "is-proof-day" : undefined}>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{detail}</p></div>
                {index === 5 ? <SparkIcon /> : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="forge-proof-preview" aria-labelledby="proof-preview-title">
          <div className="forge-proof-preview__copy">
            <span className="forge-section-number">04 / Proof, not points</span>
            <h2 id="proof-preview-title">Leave with a story you can stand behind.</h2>
            <p>
              Your proof page connects the finished artifact to the choices, checks,
              evidence, and reflection that made it real. It is learner-declared—not a
              credential or automated claim of authorship.
            </p>
            <Link className="forge-button forge-button--light" href="/proof/example">
              Open an example proof <ArrowIcon />
            </Link>
          </div>
          <article className="forge-proof-card">
            <header><span>PROJECT PROOF / EXAMPLE</span><strong>Campus Event Matcher</strong></header>
            <div className="forge-proof-card__status"><CheckIcon /><div><strong>Core outcome shown</strong><span>Self-declared · evidence attached</span></div></div>
            <dl>
              <div><dt>Built for</dt><dd>Students overwhelmed by noisy campus calendars.</dd></div>
              <div><dt>What shipped</dt><dd>Filterable event list and a useful event detail flow.</dd></div>
              <div><dt>Critical decision</dt><dd>Cut recommendations; made date and accessibility filters dependable.</dd></div>
            </dl>
            <footer><span>7 daily moves</span><span>3 evidence links</span><span>2 open questions</span></footer>
          </article>
        </section>

        <section className="forge-patterns" aria-labelledby="patterns-title">
          <header>
            <span className="forge-section-number">05 / Practical starting patterns</span>
            <h2 id="patterns-title">Use a pattern. Keep the project yours.</h2>
          </header>
          <div>
            <Link href="/build/new?template=campus-tool"><span>01</span><h3>Campus utility</h3><p>Solve one repeated friction for people around you.</p><ArrowIcon /></Link>
            <Link href="/build/new?template=portfolio-case"><span>02</span><h3>Portfolio case</h3><p>Make one piece of real work legible to someone new.</p><ArrowIcon /></Link>
            <Link href="/build/new?template=research-explainer"><span>03</span><h3>Research explainer</h3><p>Turn careful research into an artifact people can use.</p><ArrowIcon /></Link>
            <Link href="/templates"><span>04</span><h3>See every template</h3><p>Compare finish lines and choose the closest pattern.</p><ArrowIcon /></Link>
          </div>
        </section>

        <section className="forge-trust-strip" aria-label="Forge product principles">
          <div><LocalIcon /><strong>Browser-local by default</strong><span>Your sprint stays on this device unless you export it.</span></div>
          <div><SparkIcon /><strong>AI use stays visible</strong><span>Declare where tools helped; never fake authorship verification.</span></div>
          <div><CheckIcon /><strong>Completion means shipped</strong><span>No streaks, points, rankings, or attention traps.</span></div>
        </section>

        <section className="forge-final-cta">
          <span>One week from now, something useful could exist.</span>
          <h2>What will you build?</h2>
          <Link className="forge-button forge-button--primary" href="/build/new">
            Shape my sprint <ArrowIcon />
          </Link>
        </section>
      </main>
    </ProductShell>
  );
}
