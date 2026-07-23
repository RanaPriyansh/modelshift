import Link from "next/link";
import type { ReactNode } from "react";

import { ForgeArrow, ForgeShell } from "./ForgeShell";
import { EvidenceLedgerPanel } from "./EvidenceLedgerPanel";

function CurrentBoundary({ children }: { children: ReactNode }) {
  return (
    <aside className="forge-prototype-notice" aria-label="Current operating boundary">
      <span>Current boundary</span>
      <p>{children}</p>
    </aside>
  );
}

export function TrailPrototype() {
  return (
    <ForgeShell active="trail">
      <main className="forge-info-page" id="forge-main" tabIndex={-1}>
        <header className="forge-info-hero">
          <span>Your Trail</span>
          <h1>A map of questions and evidence—not a level.</h1>
          <p>
            FORGE is designed to remember the work that changed your model, the help you used, the people who challenged it,
            and the edges that remain open.
          </p>
        </header>

        <CurrentBoundary>
          No account is required. When storage is available, browser-local records can retain bounded outcomes, can be exported or
          deleted below, and deliberately exclude raw explanations and identity. Optional adult cloud continuity does not upload this
          device ledger.
        </CurrentBoundary>

        <EvidenceLedgerPanel compact />

        <section className="forge-trail-map" aria-labelledby="trail-map-title">
          <header>
            <span>Designed trail anatomy</span>
            <h2 id="trail-map-title">Questions become capabilities, work, and better questions.</h2>
          </header>
          <ol>
            <li><span>01</span><div><strong>Question</strong><p>What do I want to understand, make, change, or investigate?</p></div></li>
            <li><span>02</span><div><strong>Capability</strong><p>What meaningful action would show that the idea is usable?</p></div></li>
            <li><span>03</span><div><strong>World & sources</strong><p>Which validated model, text, person, or observation can disagree?</p></div></li>
            <li><span>04</span><div><strong>Project or reality mission</strong><p>Where does the idea meet materials, people, and consequence?</p></div></li>
            <li><span>05</span><div><strong>Proof history</strong><p>What held up alone, in a new context, and after a delay?</p></div></li>
            <li><span>06</span><div><strong>Unresolved edge</strong><p>Which contradiction or next question now belongs to the learner?</p></div></li>
          </ol>
        </section>

        <section className="forge-example-record" aria-labelledby="example-trail-title">
          <header><span>Illustrative record · not learner data</span><h2 id="example-trail-title">Why does a moving object keep moving?</h2></header>
          <div>
            <dl>
              <div><dt>Current evidence</dt><dd>Immediate transfer completed in one unfamiliar graph</dd></div>
              <div><dt>Support used</dt><dd>One authored attention question</dd></div>
              <div><dt>Still open</dt><dd>Delayed retention and transfer into circular motion</dd></div>
            </dl>
            <p>Evidence language stays conditional. One answer never becomes a permanent mastery label.</p>
          </div>
        </section>

        <div className="forge-info-actions">
          <Link className="forge-primary-action" href="/learn/force-and-motion">Open the working world<ForgeArrow /></Link>
          <Link className="forge-secondary-action" href="/evidence">See the evidence contract</Link>
        </div>
      </main>
    </ForgeShell>
  );
}

export function EvidencePrototype() {
  return (
    <ForgeShell active="evidence">
      <main className="forge-info-page forge-info-page--paper" id="forge-main" tabIndex={-1}>
        <header className="forge-info-hero">
          <span>Evidence</span>
          <h1>Proof should say exactly what happened.</h1>
          <p>
            A FORGE record separates assisted performance from a protected transfer attempt and names what remains untested. It is a
            claim with conditions—not a grade, rank, or permanent verdict.
          </p>
        </header>

        <CurrentBoundary>
          When storage is available, Working Worlds can retain bounded outcomes in this browser and schedule return dates after a
          protected transfer attempt matches that World’s current criteria.
          “Educator copy” only marks records for a learner-triggered download; FORGE sends nothing to another person.
        </CurrentBoundary>

        <EvidenceLedgerPanel />

        <section className="forge-proof-sheet" aria-labelledby="proof-sheet-title">
          <header>
            <div><span>Illustrative proof record</span><h2 id="proof-sheet-title">Net force, acceleration & velocity</h2></div>
            <p>Conditions: immediate · unfamiliar graph · one submission</p>
          </header>
          <dl>
            <div><dt>Before</dt><dd>Learner predicted that motion would fade when the engine stopped.</dd></div>
            <div><dt>Separating test</dt><dd>Compared force-free coasting with frictional slowing on synchronized tracks.</dd></div>
            <div><dt>Support</dt><dd>One authored attention question. No worked solution.</dd></div>
            <div><dt>Alone</dt><dd>Predicted one new velocity-time graph after every hint and interpretation surface was removed.</dd></div>
            <div><dt>Later</dt><dd>Not tested yet. Delayed retrieval remains open.</dd></div>
          </dl>
          <footer>
            <span>Bounded claim</span>
            <p>This browser recorded one protected transfer attempt that matched this World’s current criteria. Broader mastery and retention are not established.</p>
          </footer>
        </section>

        <section className="forge-evidence-rules" aria-labelledby="evidence-rules-title">
          <header><span>Evidence rules</span><h2 id="evidence-rules-title">What FORGE refuses to smooth over</h2></header>
          <ul>
            <li><strong>Assistance stays visible.</strong><span>Help is factual context, not a penalty.</span></li>
            <li><strong>Representation matters.</strong><span>Words, diagrams, graphs, code, and reality test different things.</span></li>
            <li><strong>Time matters.</strong><span>Immediate success cannot stand in for delayed retention.</span></li>
            <li><strong>Uncertainty stays named.</strong><span>AI interpretation can be wrong; deterministic outcomes and sources remain inspectable.</span></li>
            <li><strong>The learner owns the record.</strong><span>The intended system supports correction, export, selective sharing, and deletion.</span></li>
          </ul>
        </section>

        <div className="forge-info-actions">
          <Link className="forge-primary-action" href="/learn/force-and-motion">Start a proof-capable World<ForgeArrow /></Link>
          <Link className="forge-secondary-action" href="/trail">See the Trail contract</Link>
        </div>
      </main>
    </ForgeShell>
  );
}
