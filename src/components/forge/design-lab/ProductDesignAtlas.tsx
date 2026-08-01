import Image from "next/image";

import styles from "./ProductDesignAtlas.module.css";

type ScreenMode = "light" | "dark";

type ScreenRecord = {
  id: string;
  title: string;
  route: string;
  maps: string;
  mode: ScreenMode;
};

const PUBLIC_SCREENS: readonly ScreenRecord[] = [
  {
    id: "PUB-01",
    title: "Scenic goal entry",
    route: "/",
    maps: "Public home",
    mode: "dark",
  },
  {
    id: "PUB-02",
    title: "Goal clarification",
    route: "/start",
    maps: "Goal entry, clarification, and path preview",
    mode: "light",
  },
  {
    id: "PUB-03",
    title: "Reviewed paths",
    route: "/paths",
    maps: "Directory, filters, and no-result state",
    mode: "light",
  },
  {
    id: "PUB-04",
    title: "Path detail",
    route: "/paths/[slug]",
    maps: "Reviewed, candidate, gap, and withdrawn states",
    mode: "dark",
  },
  {
    id: "PUB-05",
    title: "Method narrative",
    route: "/how-forge-works",
    maps: "How FORGE Works and ModelShift",
    mode: "light",
  },
  {
    id: "PUB-07",
    title: "Evidence and trust",
    route: "/trust",
    maps: "Trust hub, evidence contract, coverage, and pricing",
    mode: "dark",
  },
] as const;

const APP_SCREENS: readonly ScreenRecord[] = [
  {
    id: "APP-01",
    title: "Today",
    route: "/app",
    maps: "Ready, empty, blocked, offline, and complete",
    mode: "dark",
  },
  {
    id: "APP-04",
    title: "Path detail",
    route: "/app/paths/[recordId]",
    maps: "Goals, path list, path detail, and revision state",
    mode: "light",
  },
  {
    id: "APP-05",
    title: "Action brief",
    route: "/app/study",
    maps: "Brief, session entry, and policy boundary",
    mode: "light",
  },
  {
    id: "APP-09",
    title: "Evidence ledger",
    route: "/app/evidence",
    maps: "Evidence list, record detail, challenge, and export",
    mode: "dark",
  },
  {
    id: "APP-11",
    title: "Return queue",
    route: "/app/returns",
    maps: "Upcoming, due, expired, and completed returns",
    mode: "light",
  },
  {
    id: "APP-08",
    title: "Project workspace",
    route: "/app/projects/[projectId]",
    maps: "Project list, brief, critique, revision, and defence",
    mode: "dark",
  },
] as const;

const FOCUS_SCREENS: readonly ScreenRecord[] = [
  {
    id: "FOCUS-01",
    title: "Concentrated activity",
    route: "/focus/activity/[sessionId]",
    maps: "Ordinary attempt, local draft, bounded assistance, and safe exit",
    mode: "light",
  },
  {
    id: "FOCUS-02",
    title: "ModelShift protocol",
    route: "/focus/modelshift/[sessionId]",
    maps: "Commit, investigate, reconstruct, and prove",
    mode: "dark",
  },
  {
    id: "FOCUS-03",
    title: "Bounded guest World",
    route: "/learn/[world]",
    maps: "Experiment, idealization, source, safety, and recovery",
    mode: "dark",
  },
] as const;

const IOS_SCREENS: readonly ScreenRecord[] = [
  {
    id: "IOS-01",
    title: "Goal entry",
    route: "Welcome",
    maps: "Welcome and goal clarification",
    mode: "dark",
  },
  {
    id: "IOS-04",
    title: "Today",
    route: "Today tab",
    maps: "Next action, due return, and alternatives",
    mode: "light",
  },
  {
    id: "IOS-08",
    title: "Attempt",
    route: "Focus",
    maps: "Action brief and learner attempt",
    mode: "light",
  },
  {
    id: "IOS-09",
    title: "Repair",
    route: "Focus",
    maps: "Feedback, smallest scaffold, and revision",
    mode: "dark",
  },
  {
    id: "IOS-10",
    title: "Protected proof",
    route: "Focus",
    maps: "Independent proof and submission",
    mode: "light",
  },
  {
    id: "IOS-14",
    title: "Delayed return",
    route: "Today",
    maps: "Return queue, evidence detail, and result limits",
    mode: "dark",
  },
] as const;

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function ScreenMeta({ screen }: { screen: ScreenRecord }) {
  return (
    <header className={styles.screenMeta}>
      <div>
        <span>{screen.id}</span>
        <h3>{screen.title}</h3>
      </div>
      <code>{screen.route}</code>
      <p>{screen.maps}</p>
    </header>
  );
}

function BrowserFrame({
  children,
  label,
  mode,
}: {
  children: React.ReactNode;
  label: string;
  mode: ScreenMode;
}) {
  return (
    <div className={styles.browser} data-mode={mode}>
      <div className={styles.browserBar} aria-hidden="true">
        <span />
        <span />
        <span />
        <small>{label}</small>
      </div>
      {children}
    </div>
  );
}

function MiniNav({ app = false }: { app?: boolean }) {
  return (
    <div className={styles.miniNav}>
      <strong>FORGE</strong>
      <nav aria-label={app ? "Application preview navigation" : "Public preview navigation"}>
        <span>{app ? "Today" : "Paths"}</span>
        <span>{app ? "Paths" : "How it works"}</span>
        <span>{app ? "Projects" : "Trust"}</span>
        <span>{app ? "Evidence" : "Start"}</span>
      </nav>
      <i aria-hidden="true">◐</i>
    </div>
  );
}

function PublicHeroScreen() {
  return (
    <div className={`${styles.publicViewport} ${styles.publicHero}`}>
      <Image
        alt=""
        className={styles.publicHeroImage}
        fill
        sizes="(max-width: 760px) 100vw, 72vw"
        src="/forge/landscapes/learning-threshold-cobalt.png"
      />
      <MiniNav />
      <div className={styles.heroCopy}>
        <span>One goal. Work you can prove.</span>
        <h4>Learn what matters next.</h4>
        <p>Turn one real goal into hard practice, clear feedback, independent proof, and a planned return.</p>
        <div className={styles.heroInput}>
          <span>I want to understand why this method works.</span>
          <b>Start learning <Arrow /></b>
        </div>
      </div>
    </div>
  );
}

function StartScreen() {
  return (
    <div className={styles.publicViewport}>
      <MiniNav />
      <div className={styles.startLayout}>
        <aside>
          <span>01 / 03</span>
          <ol>
            <li data-active="true">Goal</li>
            <li>Starting point</li>
            <li>Path preview</li>
          </ol>
          <p>Your words stay unchanged until you approve an interpretation.</p>
        </aside>
        <section>
          <span>Clarify one useful outcome</span>
          <h4>What should you become able to do?</h4>
          <p>Choose the result that best matches your goal. You can revise it before a path becomes active.</p>
          <div className={styles.choiceList}>
            <b data-selected="true">Explain the method and use it in a new case.</b>
            <b>Complete a project with this method.</b>
            <b>Evaluate whether the method is suitable.</b>
          </div>
          <div className={styles.inlineActions}>
            <button type="button">Review this goal <Arrow /></button>
            <span>Save as draft</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function PathsScreen() {
  return (
    <div className={styles.publicViewport}>
      <MiniNav />
      <div className={styles.directoryHead}>
        <span>Reviewed paths</span>
        <h4>Choose an outcome, not a shelf of courses.</h4>
        <p>Each path names its evidence conditions, gaps, project, and return.</p>
      </div>
      <div className={styles.pathFilter}>
        <span>Search outcomes</span>
        <span>All review states</span>
        <b>3 reviewed paths</b>
      </div>
      <div className={styles.pathRows}>
        {[
          ["01", "Verify an AI claim", "Reviewed", "Trace support, compare sources, and defend one bounded conclusion."],
          ["02", "Reason from primary sources", "Reviewed", "Observe, compare, and make one claim that survives challenge."],
          ["03", "Understand force and motion", "Reviewed World", "Test two models, reconstruct one, and transfer without help."],
        ].map(([number, title, state, body]) => (
          <article key={title}>
            <span>{number}</span>
            <div><small>{state}</small><h5>{title}</h5><p>{body}</p></div>
            <b><Arrow /></b>
          </article>
        ))}
      </div>
    </div>
  );
}

function PathDetailScreen() {
  return (
    <div className={`${styles.publicViewport} ${styles.pathDetail}`}>
      <MiniNav />
      <div className={styles.detailHero}>
        <span>Reviewed path · version 1.4</span>
        <h4>Use AI without outsourcing your judgment.</h4>
        <p>Trace claims, compare evidence, state uncertainty, and know which decisions remain yours.</p>
        <button type="button">Start with this goal <Arrow /></button>
      </div>
      <div className={styles.detailBody}>
        <ol>
          <li><span>01</span><b>Separate fluency from evidence</b><small>Reviewed</small></li>
          <li><span>02</span><b>Trace a factual claim</b><small>Reviewed</small></li>
          <li><span>03</span><b>Compare support and contradiction</b><small>Reviewed</small></li>
          <li><span>04</span><b>Build a verification memo</b><small>Candidate</small></li>
        </ol>
        <aside>
          <span>Path contract</span>
          <dl>
            <div><dt>Project</dt><dd>Verification memo</dd></div>
            <div><dt>Proof</dt><dd>Fresh claim, no assistant</dd></div>
            <div><dt>Return</dt><dd>Reviewed delayed case</dd></div>
            <div><dt>Open gap</dt><dd>Reviewer authority</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

function MethodScreen() {
  return (
    <div className={styles.publicViewport}>
      <MiniNav />
      <div className={styles.methodHead}>
        <span>One continuous journey</span>
        <h4>A goal becomes work you can inspect.</h4>
        <p>Each stage has a different job. Completion and evidence never become the same state.</p>
      </div>
      <ol className={styles.methodSteps}>
        {[
          ["01", "Recall", "Bring the model back before help appears."],
          ["02", "Attempt", "Work the difficult part and make your thinking visible."],
          ["03", "Repair", "Use specific feedback and the smallest useful scaffold."],
          ["04", "Prove", "Transfer the idea to a fresh case without instructional help."],
          ["05", "Return", "Check the same capability later, after spacing."],
        ].map(([number, title, body]) => (
          <li key={number}><span>{number}</span><h5>{title}</h5><p>{body}</p></li>
        ))}
      </ol>
    </div>
  );
}

function TrustScreen() {
  return (
    <div className={`${styles.publicViewport} ${styles.trustViewport}`}>
      <MiniNav />
      <div className={styles.trustHead}>
        <span>Evidence and trust</span>
        <h4>Know what happened. Know what it can support.</h4>
      </div>
      <div className={styles.trustGrid}>
        <article>
          <span>01</span>
          <h5>Evidence</h5>
          <p>Exact claim, task, assistance, result, limits, and correction history.</p>
          <b>Inspect evidence rules <Arrow /></b>
        </article>
        <article>
          <span>02</span>
          <h5>Sources</h5>
          <p>Publisher, version, review state, rights, role, and fallback.</p>
          <b>Inspect source rules <Arrow /></b>
        </article>
        <article>
          <span>03</span>
          <h5>AI</h5>
          <p>AI may propose and assist. It does not decide truth or grant authority.</p>
          <b>Inspect AI limits <Arrow /></b>
        </article>
        <article>
          <span>04</span>
          <h5>Privacy and access</h5>
          <p>Local-first records, explicit import, export, deletion, and accessible proof.</p>
          <b>Inspect data controls <Arrow /></b>
        </article>
      </div>
    </div>
  );
}

function PublicScreen({ screen, index }: { screen: ScreenRecord; index: number }) {
  const content = [
    <PublicHeroScreen key="hero" />,
    <StartScreen key="start" />,
    <PathsScreen key="paths" />,
    <PathDetailScreen key="detail" />,
    <MethodScreen key="method" />,
    <TrustScreen key="trust" />,
  ][index];

  return (
    <article className={styles.screenCard}>
      <ScreenMeta screen={screen} />
      <BrowserFrame label={`forge.local${screen.route}`} mode={screen.mode}>
        {content}
      </BrowserFrame>
    </article>
  );
}

function AppFrame({
  children,
  mode,
  active,
}: {
  children: React.ReactNode;
  mode: ScreenMode;
  active: string;
}) {
  return (
    <BrowserFrame label={`app.local/${active.toLocaleLowerCase()}`} mode={mode}>
      <div className={styles.appViewport}>
        <MiniNav app />
        {children}
      </div>
    </BrowserFrame>
  );
}

function TodayAppScreen() {
  return (
    <div className={styles.appPage}>
      <div className={styles.appHero}>
        <span>Today · one meaningful action</span>
        <h4>Verify a claim before you use it.</h4>
        <p>Your accepted path has one valid next activity. Progress remains separate from evidence.</p>
      </div>
      <section className={styles.nextAction}>
        <header><b>Ready</b><span>02 / 05</span></header>
        <h5>Compare support and contradiction.</h5>
        <p>Find one source that supports the claim and one source that limits it.</p>
        <dl>
          <div><dt>Why now</dt><dd>The claim and source are already separated.</dd></div>
          <div><dt>Time</dt><dd>18 to 25 minutes</dd></div>
          <div><dt>Assistance</dt><dd>Source prompts only</dd></div>
        </dl>
        <button type="button">Open action brief <Arrow /></button>
      </section>
      <div className={styles.supportGrid}>
        <article><span>Path context</span><b>2 of 5 activities worked through</b><p>No evidence claim comes from this count.</p></article>
        <article><span>Return proof</span><b>A delayed task opens Friday.</b><p>Prior results remain hidden during the task.</p></article>
      </div>
    </div>
  );
}

function PathAppScreen() {
  return (
    <div className={styles.appPage}>
      <div className={styles.appHero}>
        <span>Active path · exact revision</span>
        <h4>Use AI without outsourcing judgment.</h4>
        <p>Accepted revision 1.4 · updated only after your explicit approval.</p>
      </div>
      <div className={styles.pathWorkspace}>
        <ol>
          {[
            ["01", "Separate claim and source", "Complete"],
            ["02", "Trace the source", "Complete"],
            ["03", "Compare support", "Ready"],
            ["04", "Build a memo", "Locked"],
            ["05", "Defend a fresh claim", "Locked"],
          ].map(([number, title, state]) => (
            <li key={number} data-state={state}>
              <span>{number}</span><b>{title}</b><small>{state}</small>
            </li>
          ))}
        </ol>
        <aside>
          <span>Why this sequence</span>
          <p>A defensible claim needs source identity before corroboration or contradiction can be evaluated.</p>
          <b>Reviewed World</b>
          <p>AI and learning · v1.3</p>
          <b>Open gap</b>
          <p>External reviewer authority is not published.</p>
        </aside>
      </div>
    </div>
  );
}

function StudyBriefScreen() {
  return (
    <div className={styles.appPage}>
      <div className={styles.briefHead}>
        <span>Action brief · reviewed World</span>
        <h4>Compare support and contradiction.</h4>
        <p>Complete one source-bound comparison. Save a draft if you need to stop.</p>
      </div>
      <div className={styles.briefGrid}>
        <section>
          <span>You will do</span>
          <ol>
            <li>State the exact claim.</li>
            <li>Inspect two reviewed source passages.</li>
            <li>Name support, limits, and contradiction.</li>
            <li>Revise the conclusion.</li>
          </ol>
        </section>
        <section>
          <span>Assistance contract</span>
          <dl>
            <div><dt>Available</dt><dd>Source navigation and one process prompt</dd></div>
            <div><dt>Unavailable</dt><dd>Generated conclusion</dd></div>
            <div><dt>Evidence</dt><dd>Practice record only</dd></div>
            <div><dt>Stop</dt><dd>Save and exit at any time</dd></div>
          </dl>
        </section>
      </div>
      <div className={styles.briefActions}><button type="button">Start attempt <Arrow /></button><span>Save and exit</span></div>
    </div>
  );
}

function EvidenceAppScreen() {
  return (
    <div className={styles.appPage}>
      <div className={styles.appHero}>
        <span>Evidence · learner-owned ledger</span>
        <h4>What happened, under which conditions.</h4>
        <p>Each record keeps support, assistance, task identity, limits, and correction history together.</p>
      </div>
      <div className={styles.evidenceRows}>
        {[
          ["Demonstrated once", "Distinguished claim from source in a fresh case.", "No instructional help · World 1.3"],
          ["Return due", "Apply the same distinction after delay.", "Opens 08 Aug · one attempt"],
          ["Open question", "Can the claim survive a conflicting primary source?", "Not evaluated"],
        ].map(([state, claim, detail]) => (
          <article key={claim}>
            <span>{state}</span><h5>{claim}</h5><p>{detail}</p><b>Inspect provenance <Arrow /></b>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReturnAppScreen() {
  return (
    <div className={styles.appPage}>
      <div className={styles.appHero}>
        <span>Returns · proof after delay</span>
        <h4>Come back to the capability, not the lesson.</h4>
        <p>A return uses a fresh case. Instructional content remains hidden.</p>
      </div>
      <div className={styles.returnRows}>
        <article data-state="due"><span>Due now</span><div><h5>Separate claim from source.</h5><p>Fresh unfamiliar example · one protected attempt</p></div><b>Open return <Arrow /></b></article>
        <article><span>Upcoming</span><div><h5>Compare support and contradiction.</h5><p>Opens 14 Aug · access support remains available</p></div><b>Inspect boundary</b></article>
        <article><span>Completed</span><div><h5>Explain a force model.</h5><p>One bounded attempt recorded · no broad retention claim</p></div><b>Inspect evidence</b></article>
      </div>
    </div>
  );
}

function ProjectAppScreen() {
  return (
    <div className={styles.appPage}>
      <div className={styles.projectHead}>
        <div><span>Project · active revision</span><h4>Produce a bounded verification memo.</h4></div>
        <b>Stage 03 / 05 · Revision</b>
      </div>
      <div className={styles.projectLayout}>
        <nav aria-label="Project preview stages">
          <span>Brief</span>
          <span>Sources</span>
          <span data-active="true">Revision</span>
          <span>Critique</span>
          <span>Defence</span>
        </nav>
        <section>
          <span>Current operation</span>
          <h5>Revise the decision language.</h5>
          <p>Name what the evidence supports, what remains uncertain, and what would change the conclusion.</p>
          <div className={styles.memo}>
            <small>Draft 03 · learner work</small>
            <p>The available sources support the narrow claim that…</p>
            <p>They do not establish…</p>
          </div>
          <button type="button">Save revision <Arrow /></button>
        </section>
        <aside>
          <span>Provenance</span>
          <p>2 reviewed sources</p>
          <p>1 AI process prompt</p>
          <p>3 learner revisions</p>
          <span>Next</span>
          <p>Request critique from a named reviewer.</p>
        </aside>
      </div>
    </div>
  );
}

function AppScreen({ screen, index }: { screen: ScreenRecord; index: number }) {
  const content = [
    <TodayAppScreen key="today" />,
    <PathAppScreen key="path" />,
    <StudyBriefScreen key="brief" />,
    <EvidenceAppScreen key="evidence" />,
    <ReturnAppScreen key="returns" />,
    <ProjectAppScreen key="project" />,
  ][index];

  return (
    <article className={styles.screenCard}>
      <ScreenMeta screen={screen} />
      <AppFrame active={screen.title} mode={screen.mode}>{content}</AppFrame>
    </article>
  );
}

function FocusFrame({
  children,
  mode,
  label,
}: {
  children: React.ReactNode;
  mode: ScreenMode;
  label: string;
}) {
  return (
    <BrowserFrame label={label} mode={mode}>
      <div className={styles.focusDesktop}>
        {children}
      </div>
    </BrowserFrame>
  );
}

function FocusTopBar({ stage }: { stage: string }) {
  return (
    <header className={styles.focusDesktopBar}>
      <span>Exit</span>
      <b>{stage}</b>
      <span>Save state</span>
    </header>
  );
}

function ActivityFocusScreen() {
  return (
    <FocusFrame label="focus.local/activity/session" mode="light">
      <FocusTopBar stage="FOCUS · ATTEMPT" />
      <main className={styles.focusDesktopMain}>
        <section className={styles.focusDesktopPrompt}>
          <span>Learner attempt</span>
          <h4>Explain the missing mechanism.</h4>
          <p>Use the observed result. Do not restate the result as the explanation.</p>
          <div>
            <span>Reviewed source · passage 02</span>
            <p>The reported result applies to the tested population and conditions.</p>
          </div>
        </section>
        <section className={styles.focusDesktopWork}>
          <span>Your explanation</span>
          <p>The second case fails because…</p>
          <small>Draft saved on this device.</small>
        </section>
        <aside className={styles.focusDesktopContract}>
          <span>Assistance contract</span>
          <h5>Available after a useful attempt</h5>
          <p>One comparison scaffold. No completed explanation.</p>
          <dl>
            <div><dt>Sources</dt><dd>Available</dd></div>
            <div><dt>Accessibility</dt><dd>Available</dd></div>
            <div><dt>Generated answer</dt><dd>Unavailable</dd></div>
          </dl>
        </aside>
      </main>
      <footer className={styles.focusDesktopActions}>
        <button type="button">Submit attempt <Arrow /></button>
        <span>Save and exit</span>
      </footer>
    </FocusFrame>
  );
}

function ModelShiftFocusScreen() {
  return (
    <FocusFrame label="focus.local/modelshift/session" mode="dark">
      <FocusTopBar stage="MODEL SHIFT · 02 / 04" />
      <div className={styles.modelShiftDesktop}>
        <aside>
          <span>Protocol</span>
          <ol>
            <li><b>01</b><span>Commit</span></li>
            <li data-active="true"><b>02</b><span>Investigate</span></li>
            <li><b>03</b><span>Reconstruct</span></li>
            <li><b>04</b><span>Prove</span></li>
          </ol>
          <nav aria-label="ModelShift focus support">
            <span>Sources</span>
            <span>Idealizations</span>
            <span>Safety</span>
          </nav>
        </aside>
        <main>
          <span>Investigate</span>
          <h4>Which observation breaks your first model?</h4>
          <div className={styles.observationGrid}>
            <article>
              <span>Observation A</span>
              <h5>The first case follows the predicted relation.</h5>
              <p>The stated factor and result change together.</p>
            </article>
            <article data-selected="true">
              <span>Observation B</span>
              <h5>The result changes while the stated factor stays fixed.</h5>
              <p>Your first model cannot explain this observation.</p>
            </article>
          </div>
          <div className={styles.focusDesktopActions}>
            <button type="button">Commit observation B <Arrow /></button>
            <span>Inspect idealization</span>
          </div>
        </main>
      </div>
    </FocusFrame>
  );
}

function WorldFocusScreen() {
  return (
    <FocusFrame label="learn.local/force-and-motion" mode="dark">
      <FocusTopBar stage="GUEST WORLD · EXPERIMENT" />
      <section className={styles.worldFocusScene}>
        <Image
          alt=""
          fill
          sizes="(max-width: 760px) 100vw, 72vw"
          src="/forge/landscapes/learning-threshold-cobalt.png"
        />
        <div>
          <span>World 03 · force and motion</span>
          <h4>Test the model before you trust it.</h4>
          <p>The controls change an idealized system. Inspect the limits before you use the result.</p>
        </div>
      </section>
      <div className={styles.worldFocusBody}>
        <section>
          <span>Experiment</span>
          <h5>Change force while mass stays fixed.</h5>
          <div className={styles.worldTrack}>
            <i />
            <b />
          </div>
          <dl>
            <div><dt>Force</dt><dd>42 N</dd></div>
            <div><dt>Mass</dt><dd>8 kg</dd></div>
            <div><dt>Trial</dt><dd>Not run</dd></div>
          </dl>
          <button type="button">Run trial <Arrow /></button>
        </section>
        <aside>
          <span>Idealization</span>
          <h5>The track removes friction.</h5>
          <p>The result does not directly describe a real road, body, or machine.</p>
          <span>Safety</span>
          <p>Do not copy this setup with moving equipment.</p>
        </aside>
      </div>
    </FocusFrame>
  );
}

function FocusScreen({ screen, index }: { screen: ScreenRecord; index: number }) {
  const content = [
    <ActivityFocusScreen key="activity" />,
    <ModelShiftFocusScreen key="modelshift" />,
    <WorldFocusScreen key="world" />,
  ][index];

  return (
    <article className={styles.screenCard}>
      <ScreenMeta screen={screen} />
      {content}
    </article>
  );
}

function PhoneFrame({
  children,
  mode,
  title,
  tab,
}: {
  children: React.ReactNode;
  mode: ScreenMode;
  title: string;
  tab?: "Today" | "Paths" | "Projects" | "Evidence";
}) {
  return (
    <div className={styles.phone} data-mode={mode}>
      <div className={styles.phoneScreen}>
        <div className={styles.statusBar}><span>9:41</span><i /><span>5G ▰</span></div>
        <div className={styles.phoneNav}><b>{title}</b><span>•••</span></div>
        {children}
        {tab ? (
          <nav className={styles.phoneTabs} aria-label="iOS preview tab bar">
            {["Today", "Paths", "Projects", "Evidence"].map((item) => (
              <span data-active={item === tab} key={item}><i>{item === "Today" ? "⌂" : item === "Paths" ? "◇" : item === "Projects" ? "□" : "≡"}</i>{item}</span>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function GoalPhone() {
  return (
    <PhoneFrame mode="dark" title="FORGE">
      <div className={`${styles.phoneBody} ${styles.goalPhone}`}>
        <Image
          alt=""
          className={styles.phoneScene}
          fill
          sizes="320px"
          src="/forge/landscapes/learning-threshold-cobalt.png"
        />
        <div>
          <span>Start with one real goal</span>
          <h4>What do you want to become able to do?</h4>
          <div className={styles.phoneInput}>I want to evaluate AI claims.</div>
          <button type="button">Clarify this goal</button>
          <small>No account is required for this first local draft.</small>
        </div>
      </div>
    </PhoneFrame>
  );
}

function TodayPhone() {
  return (
    <PhoneFrame mode="light" tab="Today" title="Today">
      <div className={styles.phoneBody}>
        <div className={styles.phoneLandscape}>
          <span>One meaningful action</span>
          <h4>Verify a claim before you use it.</h4>
        </div>
        <section className={styles.phoneAction}>
          <header><b>Ready</b><span>18 min</span></header>
          <h5>Compare support and contradiction.</h5>
          <p>Use two reviewed source passages. Keep your conclusion bounded.</p>
          <dl><div><dt>Assistance</dt><dd>Source prompts</dd></div><div><dt>Evidence</dt><dd>Practice only</dd></div></dl>
          <button type="button">Open action brief</button>
        </section>
        <div className={styles.phoneDue}><span>Return opens Friday</span><b>Inspect</b></div>
      </div>
    </PhoneFrame>
  );
}

function AttemptPhone() {
  return (
    <PhoneFrame mode="light" title="Attempt">
      <div className={styles.phoneBody}>
        <div className={styles.focusProgress}><span data-active="true">Attempt</span><span>Repair</span><span>Prove</span></div>
        <section className={styles.focusQuestion}>
          <span>Your operation</span>
          <h4>What does this source establish?</h4>
          <p>State the strongest claim that the passage supports. Do not add outside facts.</p>
        </section>
        <div className={styles.sourceExcerpt}>
          <span>Reviewed source · passage 02</span>
          <p>“The reported result applies to the tested population and conditions…”</p>
        </div>
        <label className={styles.phoneTextArea}>
          <span>Your answer</span>
          <b>The passage supports…</b>
          <small>168 characters</small>
        </label>
        <button className={styles.phonePrimary} type="button">Commit attempt</button>
        <span className={styles.phoneTextAction}>Save and exit</span>
      </div>
    </PhoneFrame>
  );
}

function RepairPhone() {
  return (
    <PhoneFrame mode="dark" title="Repair">
      <div className={styles.phoneBody}>
        <div className={styles.focusProgress}><span>Attempt</span><span data-active="true">Repair</span><span>Prove</span></div>
        <section className={styles.repairCard}>
          <span>Specific gap</span>
          <h4>Your claim reaches beyond the tested population.</h4>
          <p>The source reports one bounded group. Your answer applies the result to all learners.</p>
        </section>
        <section className={styles.scaffoldCard}>
          <span>Smallest useful scaffold</span>
          <h5>Compare these two statements.</h5>
          <button type="button">The tested group showed the result.</button>
          <button type="button">All learners will show the result.</button>
        </section>
        <div className={styles.assistanceLabel}><span>AI contribution</span><p>One contrast prompt. No conclusion was generated.</p></div>
        <button className={styles.phonePrimary} type="button">Revise my answer</button>
      </div>
    </PhoneFrame>
  );
}

function ProofPhone() {
  return (
    <PhoneFrame mode="light" title="Protected proof">
      <div className={`${styles.phoneBody} ${styles.proofPhone}`}>
        <div className={styles.proofLock}><span>Protected operation</span><b>Instructional help is off.</b></div>
        <section>
          <span>Fresh case · one submission</span>
          <h4>Separate the claim, source, and inference.</h4>
          <p>Use the unfamiliar passage. State one conclusion and one limit.</p>
        </section>
        <div className={styles.proofSupport}><span>Access support remains available</span><b>Text size · VoiceOver · contrast</b></div>
        <label className={styles.phoneTextArea}><span>Your proof</span><b>Write your response here.</b><small>0 / 700</small></label>
        <button className={styles.phonePrimary} type="button">Submit proof</button>
        <span className={styles.phoneTextAction}>Save and exit</span>
      </div>
    </PhoneFrame>
  );
}

function ReturnPhone() {
  return (
    <PhoneFrame mode="dark" title="Delayed return">
      <div className={`${styles.phoneBody} ${styles.returnPhone}`}>
        <div className={styles.returnMarker}><span>Due today</span><b>One fresh case</b></div>
        <section>
          <span>Return after 7 days</span>
          <h4>Can you use the distinction without the lesson?</h4>
          <p>Prior answers, hints, and instructional content remain hidden.</p>
        </section>
        <dl className={styles.returnContract}>
          <div><dt>Window</dt><dd>Closes 10 Aug at 18:00</dd></div>
          <div><dt>Attempt</dt><dd>One submission</dd></div>
          <div><dt>Access</dt><dd>Accessibility remains available</dd></div>
          <div><dt>Result</dt><dd>One bounded retention observation</dd></div>
        </dl>
        <button className={styles.phonePrimary} type="button">Start protected return</button>
        <span className={styles.phoneTextAction}>Not now</span>
      </div>
    </PhoneFrame>
  );
}

function IosScreen({ screen, index }: { screen: ScreenRecord; index: number }) {
  const content = [
    <GoalPhone key="goal" />,
    <TodayPhone key="today" />,
    <AttemptPhone key="attempt" />,
    <RepairPhone key="repair" />,
    <ProofPhone key="proof" />,
    <ReturnPhone key="return" />,
  ][index];

  return (
    <article className={styles.phoneCard}>
      <ScreenMeta screen={screen} />
      <div className={styles.phoneStage}>{content}</div>
    </article>
  );
}

function FoundationStrip() {
  return (
    <section
      className={styles.foundationSection}
      id="forge-terrain-foundations"
      aria-labelledby="atlas-foundations-title"
    >
      <header className={styles.atlasHeader}>
        <div><span>System foundations</span><h2 id="atlas-foundations-title">FORGE Terrain</h2></div>
        <p>Vivid at thresholds. Quiet during work. Precise when evidence appears.</p>
      </header>
      <div className={styles.foundationGrid}>
        <article className={styles.typeSpecimen}>
          <span>Typography</span>
          <b>Learn what matters next.</b>
          <p>Geist carries the interface. Geist Mono carries evidence and source metadata.</p>
          <code>LEARNER ACTS · AI ASSISTS · EVIDENCE DECIDES</code>
        </article>
        <article className={styles.colorSpecimen}>
          <span>Semantic color</span>
          <div><i data-color="cobalt" /><b>AI contribution</b><code>#2F66D8</code></div>
          <div><i data-color="alpine" /><b>Tested evidence</b><code>#2C8A61</code></div>
          <div><i data-color="orange" /><b>Learner commitment</b><code>#F0643B</code></div>
          <div><i data-color="ivory" /><b>Quiet work</b><code>#F4F7F1</code></div>
        </article>
        <article className={styles.shapeSpecimen}>
          <span>Shape and space</span>
          <div><i data-size="6" /><b>6 px</b><small>Controls and rows</small></div>
          <div><i data-size="12" /><b>12 px</b><small>Panels and fields</small></div>
          <p>Use the 4, 8, 12, 16, 24, 32, 48, and 64 pixel space scale.</p>
        </article>
        <article className={styles.authoritySpecimen}>
          <span>Authority language</span>
          <p data-tone="learner">Learner commitment</p>
          <p data-tone="ai">AI contribution</p>
          <p data-tone="evidence">Tested evidence</p>
          <p data-tone="quiet">Not tested</p>
        </article>
      </div>
    </section>
  );
}

function StateStrip() {
  const states = [
    ["Loading", "Preserve the destination name."],
    ["Empty", "State that nothing exists."],
    ["Offline", "Keep local work and retry."],
    ["Blocked", "Name the policy or data reason."],
    ["Contaminated", "Keep the record. Remove the claim."],
    ["Withdrawn", "Explain the replacement or stop."],
    ["Error", "Keep learner input and recover."],
    ["Safe fallback", "Offer a manual route."],
  ] as const;

  return (
    <section className={styles.stateSection} aria-labelledby="atlas-states-title">
      <header className={styles.atlasHeader}>
        <div><span>Shared application states</span><h2 id="atlas-states-title">Failure stays truthful and recoverable.</h2></div>
        <p>Every state uses text, shape, and an exact action. Color never carries the full meaning.</p>
      </header>
      <div className={styles.stateGrid}>
        {states.map(([state, body], index) => (
          <article key={state} data-tone={String((index % 4) + 1)}>
            <i aria-hidden="true" />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{state}</h3>
            <p>{body}</p>
            <b>{state === "Loading" ? "Reading local state" : state === "Empty" ? "Create one goal" : "Inspect recovery"}</b>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProductDesignAtlas() {
  return (
    <div className={styles.atlas}>
      <FoundationStrip />

      <section className={styles.platformSection} id="public-site-atlas" aria-labelledby="public-site-atlas-title">
        <header className={styles.atlasHeader}>
          <div><span>Public site · six representative families</span><h2 id="public-site-atlas-title">A landscape opens the door. The product earns trust below it.</h2></div>
          <p>These frames cover the eleven canonical public page families through shared layouts and exact state variants.</p>
        </header>
        <div className={styles.screenGrid}>
          {PUBLIC_SCREENS.map((screen, index) => <PublicScreen index={index} key={screen.id} screen={screen} />)}
        </div>
      </section>

      <section className={styles.platformSection} id="web-app-atlas" aria-labelledby="web-app-atlas-title">
        <header className={styles.atlasHeader}>
          <div><span>Web application · six representative families</span><h2 id="web-app-atlas-title">One next action. Every boundary remains visible.</h2></div>
          <p>These frames cover the fourteen canonical learner application families and their shared state contracts.</p>
        </header>
        <div className={styles.screenGrid}>
          {APP_SCREENS.map((screen, index) => <AppScreen index={index} key={screen.id} screen={screen} />)}
        </div>
      </section>

      <section className={styles.platformSection} id="focus-mode-atlas" aria-labelledby="focus-mode-atlas-title">
        <header className={styles.atlasHeader}>
          <div><span>Focus mode · three canonical families</span><h2 id="focus-mode-atlas-title">Broad navigation leaves. The learner operation remains.</h2></div>
          <p>These frames preserve exit, local save, sources, limits, safety, accessibility, and exact recovery.</p>
        </header>
        <div className={styles.screenGrid}>
          {FOCUS_SCREENS.map((screen, index) => <FocusScreen index={index} key={screen.id} screen={screen} />)}
        </div>
      </section>

      <section className={styles.platformSection} id="ios-app-atlas" aria-labelledby="ios-app-atlas-title">
        <header className={styles.atlasHeader}>
          <div><span>iOS application · six representative families</span><h2 id="ios-app-atlas-title">Native structure carries the same learning contract.</h2></div>
          <p>These screens map the eighteen iOS families to native navigation, focus, sheets, alerts, and Dynamic Type.</p>
        </header>
        <div className={styles.phoneGrid}>
          {IOS_SCREENS.map((screen, index) => <IosScreen index={index} key={screen.id} screen={screen} />)}
        </div>
      </section>

      <StateStrip />
    </div>
  );
}
