import Link from "next/link";

import { ForgeKicker, ForgeSectionHeading, ForgeStatus } from "./ForgePrimitives";
import { ForgeArrow } from "./ForgeShell";

const LEARNING_OPERATIONS = [
  ["Orient", "See the goal, the capability, the path rationale, and the known gaps."],
  ["Study", "Read, watch, inspect, or listen only when the resource leads into an active operation."],
  ["Retrieve", "Bring the idea back without replaying the explanation."],
  ["Practice", "Repeat the underlying operation with varied examples and visible feedback."],
  ["ModelShift", "Use competing models and a separating experience when a mental model is the real bottleneck."],
  ["Project", "Build, investigate, repair, design, explain, perform, or serve in a real context."],
  ["Prove", "Remove instructional support for an unfamiliar transfer while retaining access."],
  ["Return", "Try again after delay before making any retention claim."],
] as const;

export function HowForgeWorks() {
  return (
    <main className="forge-method-page" id="forge-main" tabIndex={-1}>
      <header className="forge-method-page__hero">
        <ForgeKicker>Active learning, bounded claims</ForgeKicker>
        <h1>A path is credible when every move earns its place.</h1>
        <p>
          FORGE begins with what you want to do, preserves your language, makes the route
          inspectable, and asks you to act before assistance can create the appearance of learning.
        </p>
        <Link className="forge-primary-action" href="/start">
          Shape a first path
          <ForgeArrow />
        </Link>
      </header>

      <section className="forge-method-page__section" aria-labelledby="forge-loop-title">
        <ForgeSectionHeading
          id="forge-loop-title"
          label="The product loop"
          title="Goal → path → action → proof → return."
          description="The system can propose. The learner accepts. Reviewed content supplies authority. Deterministic or accountable human judgment supplies consequential evidence."
        />
        <ol className="forge-method-page__operations">
          {LEARNING_OPERATIONS.map(([name, description], index) => (
            <li key={name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{name}</h3><p>{description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="forge-method-page__section" aria-labelledby="forge-personalization-title">
        <ForgeSectionHeading
          id="forge-personalization-title"
          label="Personalization without profiling"
          title="Change the route—not the standard of evidence."
          description="FORGE does not diagnose a learning style, personality, intelligence, or permanent level."
        />
        <div className="forge-method-page__split">
          <article>
            <ForgeStatus tone="learner">Learner-controlled</ForgeStatus>
            <h3>What may change</h3>
            <ul>
              <li>Pace and cadence</li>
              <li>Equivalent reviewed representations</li>
              <li>Optional examples and project context</li>
              <li>Order where prerequisites permit it</li>
              <li>Access accommodations</li>
            </ul>
          </article>
          <article>
            <ForgeStatus tone="human">New review required</ForgeStatus>
            <h3>What cannot silently change</h3>
            <ul>
              <li>Target capability or prerequisites</li>
              <li>Source claims and publication state</li>
              <li>Proof standard or validator</li>
              <li>Safety, age, privacy, or authority policy</li>
              <li>An accepted learner path</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}

const TRUST_LAYERS = [
  {
    tone: "learner" as const,
    title: "Learner authority",
    body: "You own the goal wording, accept or reject a path, choose what leaves the device, and can export or delete local work.",
  },
  {
    tone: "ai" as const,
    title: "AI proposal authority",
    body: "AI may interpret, rephrase, propose, translate reviewed content, or offer a policy-permitted cue. It cannot publish, grade, determine source truth, or create proof.",
  },
  {
    tone: "evidence" as const,
    title: "Deterministic evidence authority",
    body: "Authored rules and validators control protected transitions and bounded results for exact tasks. One result never becomes a permanent mastery score.",
  },
  {
    tone: "human" as const,
    title: "Human review authority",
    body: "Named reviewers govern source quality, age fit, publication, ambiguous consequential judgment, corrections, and withdrawal.",
  },
] as const;

export function ForgeTrust() {
  return (
    <main className="forge-method-page" id="forge-main" tabIndex={-1}>
      <header className="forge-method-page__hero">
        <ForgeKicker>Evidence and trust</ForgeKicker>
        <h1>FORGE should be inspectable before it is impressive.</h1>
        <p>
          Every useful system can fail. FORGE keeps authority separated, makes unavailable
          capabilities visible, and scopes evidence to the exact work that actually happened.
        </p>
        <div className="forge-method-page__hero-links">
          <Link href="/coverage">See released coverage</Link>
          <Link href="/app/evidence">Open device evidence</Link>
        </div>
      </header>

      <section className="forge-method-page__section" aria-labelledby="authority-title">
        <ForgeSectionHeading
          id="authority-title"
          label="Separated authority"
          title="No single actor gets to decide everything."
          description="Identity, authored knowledge, learner choice, AI proposals, runtime transitions, validation, and publication remain separate trust domains."
        />
        <div className="forge-method-page__trust-grid">
          {TRUST_LAYERS.map((layer) => (
            <article key={layer.title}>
              <ForgeStatus tone={layer.tone}>{layer.title}</ForgeStatus>
              <p>{layer.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="forge-method-page__section" aria-labelledby="data-title">
        <ForgeSectionHeading
          id="data-title"
          label="Data boundary today"
          title="Guest-first. Device-local. Cloud fail-closed."
          description="The current public build does not turn deployment variables into trusted identity, age, consent, sharing, or provider authority."
        />
        <dl className="forge-method-page__contract">
          <div><dt>Raw learner wording</dt><dd>Visible to the learner and kept device-local unless a separate sanitized use is previewed and accepted.</dd></div>
          <div><dt>Under 18</dt><dd>Device-only, curated, no open web, no provider key, no public social surface, and no cloud evidence.</dd></div>
          <div><dt>Cloud account</dt><dd>Structurally unavailable until enrollment, abuse, recovery, consent, deletion, and server authority pass review.</dd></div>
          <div><dt>Evidence</dt><dd>Private by default, bounded to a task and support conditions, exportable and removable by the learner.</dd></div>
          <div><dt>Accessibility</dt><dd>Keyboard, text alternatives, contrast, reduced motion, and equivalent operation stay available during proof.</dd></div>
          <div><dt>External media</dt><dd>Never treated as completion or evidence; future assignment requires review, alternatives, age fit, rights, and active checkpoints.</dd></div>
        </dl>
      </section>
    </main>
  );
}

export function ModelShiftExplainer() {
  return (
    <main className="forge-method-page" id="forge-main" tabIndex={-1}>
      <header className="forge-method-page__hero">
        <ForgeKicker>One engine inside FORGE</ForgeKicker>
        <h1>ModelShift challenges a mental model, then removes the instrument.</h1>
        <p>
          It is used only when two plausible explanations predict different outcomes and an
          authored separating experience can expose the disagreement.
        </p>
        <Link className="forge-primary-action" href="/learn/force-and-motion">
          Open the flagship lab
          <ForgeArrow />
        </Link>
      </header>

      <section className="forge-method-page__section" aria-labelledby="modelshift-sequence-title">
        <ForgeSectionHeading
          id="modelshift-sequence-title"
          label="Signature protocol"
          title="Claim → readings → disagreement → test → unaided proof."
          description="AI is a bounded interpretation layer, never a character, companion, source of truth, or hidden judge."
        />
        <ol className="forge-method-page__sequence">
          {[
            "Encounter a phenomenon and commit a prediction.",
            "Explain the mechanism in your own words.",
            "Inspect exactly two uncertain, plausible readings.",
            "Name where the readings predict different outcomes.",
            "Run a deterministic or source-authoritative separating experience.",
            "Use the smallest governed support and reconstruct the rule.",
            "Watch interpretation, experiment selection, and hints explicitly leave.",
            "Complete an unfamiliar transfer with access accommodations intact.",
            "Record only what this new problem demonstrated and what remains untested.",
          ].map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}
        </ol>
      </section>

      <aside className="forge-method-page__callout">
        <ForgeStatus tone="quiet">Not every activity is a lab</ForgeStatus>
        <p>
          Reading a historical account, retrieving vocabulary, practising a procedure, drafting
          an essay, or building a project can use a simpler activity. ModelShift earns its cost
          only when separating competing models is the learning bottleneck.
        </p>
      </aside>
    </main>
  );
}
