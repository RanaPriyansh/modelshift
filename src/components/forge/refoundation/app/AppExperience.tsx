"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createEvidenceLedgerStore,
  createLocalStorageEvidenceLedgerAdapter,
  type EvidenceEntry,
} from "@/src/lib/forge-evidence";
import {
  FORGE_DEVICE_PROFILE_EVENT,
  clearForgeDeviceProfile,
  createForgeDeviceProfile,
  readForgeDeviceProfile,
  type ForgeDeviceProfile,
} from "@/src/lib/forge-profile/device-profile";

import styles from "./appExperience.module.css";

type AppRoute = "home" | "plan" | "explore" | "projects" | "profile";
type IconName =
  | "anvil"
  | "arrow"
  | "check"
  | "compass"
  | "document"
  | "evidence"
  | "folder"
  | "home"
  | "lock"
  | "path"
  | "play"
  | "profile"
  | "search"
  | "spark"
  | "warning";

const NAV_ITEMS: readonly {
  id: AppRoute | "evidence";
  href: string;
  label: string;
  shortLabel?: string;
  icon: IconName;
}[] = [
  { id: "home", href: "/home", label: "Home", icon: "home" },
  { id: "plan", href: "/plan", label: "My Plan", shortLabel: "Plan", icon: "path" },
  { id: "explore", href: "/explore-auth", label: "Explore", icon: "compass" },
  { id: "projects", href: "/projects", label: "Projects", icon: "folder" },
  { id: "evidence", href: "/app/evidence", label: "Evidence", icon: "evidence" },
  { id: "profile", href: "/profile", label: "Profile", icon: "profile" },
] as const;

const PREFERENCES_KEY = "forge.refoundation.preferences:v1";
const PREFERENCES_EVENT = "forge:refoundation-preferences";

interface InterfacePreferences {
  reduceMotion: boolean;
  higherContrast: boolean;
  largerText: boolean;
}

const DEFAULT_PREFERENCES: InterfacePreferences = {
  reduceMotion: false,
  higherContrast: false,
  largerText: false,
};

function readPreferences(): InterfacePreferences {
  try {
    const candidate = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null") as Partial<InterfacePreferences> | null;
    return {
      reduceMotion: candidate?.reduceMotion === true,
      higherContrast: candidate?.higherContrast === true,
      largerText: candidate?.largerText === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(preferences: InterfacePreferences) {
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "anvil":
      return (
        <svg {...common}>
          <path d="M3 5h16c0 2.8-2 4.5-5.4 4.9v2.2h3.1l1.8 4H5.7l1.8-4h3.1V9.9C7.3 9.5 5.2 7.9 5 6H3z" />
          <path d="M3 5h18M8 19h8" />
        </svg>
      );
    case "arrow":
      return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "compass":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9z" /></svg>;
    case "document":
      return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></svg>;
    case "evidence":
      return <svg {...common}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h4M9 12h7M9 16h5" /></svg>;
    case "folder":
      return <svg {...common}><path d="M3 6.5h7l2 2h9v10.5H3z" /></svg>;
    case "home":
      return <svg {...common}><path d="m3 11 9-8 9 8" /><path d="M5.5 9.5V21h13V9.5M10 21v-6h4v6" /></svg>;
    case "lock":
      return <svg {...common}><rect x="6" y="10" width="12" height="11" rx="2" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v3" /></svg>;
    case "path":
      return <svg {...common}><path d="M4 6h2M10 6h10M4 12h2M10 12h10M4 18h2M10 18h10" /><path d="m5 5 1 1-1 1m0 4 1 1-1 1m0 4 1 1-1 1" /></svg>;
    case "play":
      return <svg {...common}><path d="m9 6 9 6-9 6z" /></svg>;
    case "profile":
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
    case "search":
      return <svg {...common}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>;
    case "spark":
      return <svg {...common}><path d="m12 2 1.5 5.1L18 9l-4.5 1.9L12 16l-1.5-5.1L6 9l4.5-1.9zM5 15l.9 2.6L8.5 19l-2.6 1.4L5 23l-.9-2.6L1.5 19l2.6-1.4z" /></svg>;
    case "warning":
      return <svg {...common}><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v5M12 17.5v.1" /></svg>;
  }
}

function AppFrame({
  active,
  children,
}: {
  active: AppRoute;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    const refresh = () => setPreferences(readPreferences());
    refresh();
    window.addEventListener(PREFERENCES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PREFERENCES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const shellClassName = [
    styles.shell,
    preferences.reduceMotion ? styles.reduceMotion : "",
    preferences.higherContrast ? styles.higherContrast : "",
    preferences.largerText ? styles.largerText : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={shellClassName}>
      <a className={styles.skipLink} href="#forge-app-main" tabIndex={0}>Skip to main content</a>
      <aside className={styles.rail} aria-label="FORGE workspace">
        <Link className={styles.brand} href="/home" aria-label="FORGE home">
          <Icon name="anvil" size={36} />
          <span>FORGE</span>
        </Link>
        <nav className={styles.railNav} aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              className={styles.navLink}
              data-active={item.id === active ? "true" : undefined}
              href={item.href}
              key={item.id}
              aria-current={item.id === active ? "page" : undefined}
            >
              <Icon name={item.icon} size={24} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.railTrust}>
          <Icon name="lock" size={20} />
          <span>Private on this device</span>
          <span className={styles.trustDot}><Icon name="check" size={13} /></span>
        </div>
      </aside>

      <div className={styles.stage}>
        <header className={styles.topbar}>
          <span className={styles.deviceState}><Icon name="lock" size={19} /> Private on this device</span>
          <Link className={styles.directionLink} href="/start">
            <Icon name="compass" size={19} />
            <span>Change direction</span>
          </Link>
        </header>
        <main className={styles.main} id="forge-app-main" tabIndex={-1}>
          {children}
        </main>
        <footer className={styles.footer}>
          <Icon name="anvil" size={20} />
          <span>Learner acts</span><i>·</i><span>AI assists</span><i>·</i><span>Evidence decides</span>
        </footer>
      </div>

      <nav className={styles.mobileNav} aria-label="Primary mobile">
        {NAV_ITEMS.map((item) => (
          <Link
            className={styles.mobileNavLink}
            data-active={item.id === active ? "true" : undefined}
            href={item.href}
            key={item.id}
            aria-current={item.id === active ? "page" : undefined}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.shortLabel ?? item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={styles.sectionLabel}>{children}</p>;
}

function HomePath() {
  return (
    <section className={styles.pathSection} aria-labelledby="current-path-title">
      <div className={styles.sectionHeadingRow}>
        <div>
          <SectionLabel>Reviewed sequence</SectionLabel>
          <h2 id="current-path-title">Your current path</h2>
        </div>
        <Link className={styles.quietButton} href="/plan">Inspect plan <Icon name="arrow" size={17} /></Link>
      </div>
      <ol className={styles.pathStrip}>
        <li data-state="complete"><span><Icon name="check" size={17} /></span><div><strong>Orientation</strong><small>Reviewed first</small></div></li>
        <li data-state="current"><span>2</span><div><strong>Claims &amp; evidence</strong><small>Current focus</small></div></li>
        <li><span>3</span><div><strong>Model limits</strong><small>Reviewed next</small></div></li>
        <li data-state="gap"><span>4</span><div><strong>Further path</strong><small>Needs review</small></div></li>
      </ol>
    </section>
  );
}

function evidenceLabel(entry: EvidenceEntry) {
  const capability = entry.capabilityId.includes("source-corroboration")
    ? "Source claim transfer"
    : entry.capabilityId.includes("primary-source")
      ? "Primary-source boundary"
      : entry.capabilityId.includes("force-motion")
        ? "Force and motion transfer"
        : entry.capabilityId.includes("proportional")
          ? "Proportional reasoning transfer"
          : "Recorded capability attempt";

  const outcome = entry.proof.outcome === "proved"
    ? "demonstrated once"
    : entry.proof.outcome === "not_proved"
      ? "ready to revisit"
      : entry.proof.outcome === "open_question"
        ? "open question"
        : "practice recorded";
  const returnState = entry.returnSchedule ? "return schedule present" : "return not tested";
  return `${capability} · ${outcome} · ${returnState}`;
}

function LocalEvidenceSummary() {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "ready"; entry: EvidenceEntry | null; reset: boolean }
    | { phase: "unavailable" }
  >({ phase: "loading" });

  useEffect(() => {
    const read = () => {
      try {
        const result = createEvidenceLedgerStore(
          createLocalStorageEvidenceLedgerAdapter(),
        ).read();
        if (result.status === "storage_unavailable" || result.status === "storage_error") {
          setState({ phase: "unavailable" });
          return;
        }
        const entry = [...result.ledger.entries]
          .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))[0] ?? null;
        setState({
          phase: "ready",
          entry,
          reset: result.status === "reset_malformed" || result.status === "reset_unknown_version",
        });
      } catch {
        setState({ phase: "unavailable" });
      }
    };
    read();
    window.addEventListener("focus", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("focus", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  let copy = "Reading browser-local evidence…";
  if (state.phase === "unavailable") copy = "Browser-local evidence is unavailable.";
  if (state.phase === "ready" && state.reset) copy = "No valid local evidence record could be read.";
  if (state.phase === "ready" && !state.reset && !state.entry) copy = "No evidence has been recorded in this browser yet.";
  if (state.phase === "ready" && !state.reset && state.entry) copy = evidenceLabel(state.entry);

  return (
    <Link className={`${styles.signalCard} ${styles.signalCardEvidence}`} href="/app/evidence">
      <span className={styles.signalIcon}><Icon name="document" size={25} /></span>
      <span><small>Recent browser-local evidence</small><strong>{copy}</strong></span>
      <Icon name="arrow" size={19} />
    </Link>
  );
}

function buildCommandPreview(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return {
      focus: "No proposed focus",
      addition: "Enter a question or direction to preview it.",
    };
  }
  if (normalized.includes("model") || normalized.includes("limit")) {
    return {
      focus: "Would move review focus to Model limits",
      addition: "Would ask for a reviewed reasoning-limits step",
    };
  }
  if (normalized.includes("source") || normalized.includes("evidence")) {
    return {
      focus: "Would keep review focus on Claims & evidence",
      addition: "Would ask for a source-strength checkpoint",
    };
  }
  return {
    focus: "Would keep the current reviewed path unchanged",
    addition: "Would send this direction through path review",
  };
}

function CommandPreview() {
  const [draft, setDraft] = useState("Focus on identifying weak evidence");
  const [preview, setPreview] = useState(() => buildCommandPreview("Focus on identifying weak evidence"));
  const [open, setOpen] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreview(buildCommandPreview(draft));
    setOpen(true);
  }

  return (
    <section className={styles.commandSurface} aria-labelledby="command-title">
      <span className={styles.commandIcon}><Icon name="spark" size={25} /></span>
      <form onSubmit={submit}>
        <label id="command-title" htmlFor="forge-direction-draft">Ask a question or preview a direction change</label>
        <div className={styles.commandInputRow}>
          <input
            id="forge-direction-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Try: Focus on identifying weak evidence"
          />
          <button type="submit">Preview change</button>
        </div>
        <p>Draft stays in this open page. Previewing does not save or apply a path change.</p>
      </form>
      {open ? (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            aria-describedby="command-preview-description"
            aria-labelledby="command-preview-title"
            aria-modal="true"
            className={styles.dialog}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <SectionLabel>Preview only · not saved</SectionLabel>
            <h2 id="command-preview-title">Review this possible direction</h2>
            <p id="command-preview-description">FORGE has not changed your path. A real revision still needs explicit review.</p>
            <div className={styles.previewRows}>
              <span><small>Focus</small><strong>{preview.focus}</strong></span>
              <span><small>Possible addition</small><strong>{preview.addition}</strong></span>
            </div>
            <div className={styles.dialogActions}>
              <button className={styles.primaryButton} type="button" onClick={() => setOpen(false)}>Keep as draft</button>
              <Link className={styles.secondaryButton} href="/start">Review direction safely</Link>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function HomeExperience() {
  return (
    <AppFrame active="home">
      <header className={styles.pageIntro}>
        <SectionLabel>Home · one meaningful action</SectionLabel>
        <h1>Continue becoming AI-literate.</h1>
        <p>Work on one reviewed capability, then inspect exactly what the evidence can support.</p>
      </header>

      <section className={styles.focusCard} aria-labelledby="next-action-title">
        <span className={styles.focusIcon}><Icon name="search" size={38} /></span>
        <div className={styles.focusCopy}>
          <SectionLabel>Reviewed World · about 22 min</SectionLabel>
          <h2 id="next-action-title">Test a model-generated claim against its sources</h2>
          <p>Because trustworthy AI use starts with knowing what evidence can support.</p>
        </div>
        <Link className={styles.focusAction} href="/learn/ai-and-learning">
          <Icon name="play" size={21} /> Begin focused session
        </Link>
      </section>

      <HomePath />

      <section className={styles.signalGrid} aria-label="Current questions and evidence">
        <Link className={`${styles.signalCard} ${styles.signalCardQuestion}`} href="/learn/ai-and-learning">
          <span className={styles.signalIcon}>?</span>
          <span><small>One question to resolve</small><strong>When does model confidence deserve trust?</strong></span>
          <Icon name="arrow" size={19} />
        </Link>
        <LocalEvidenceSummary />
      </section>

      <section className={styles.projectEmpty} aria-labelledby="home-project-title">
        <span className={styles.signalIcon}><Icon name="folder" size={24} /></span>
        <div><SectionLabel>Projects</SectionLabel><h2 id="home-project-title">No project route is assigned yet.</h2></div>
        <Link className={styles.quietButton} href="/projects">See what is required <Icon name="arrow" size={17} /></Link>
      </section>

      <CommandPreview />
    </AppFrame>
  );
}

const PLAN_STAGES = [
  { number: "1", title: "Orientation", status: "Reviewed first", state: "complete" },
  { number: "2", title: "Claims & evidence", status: "Current reviewed step", state: "current" },
  { number: "3", title: "Model limits", status: "Reviewed next", state: "next" },
  { number: "4", title: "Build with AI responsibly", status: "Candidate · needs review", state: "gap" },
] as const;

function PlanGapEditor() {
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreview(draft.trim());
  }

  return (
    <section className={styles.gapEditor} aria-labelledby="gap-editor-title">
      <div>
        <SectionLabel>Visible gap</SectionLabel>
        <h2 id="gap-editor-title">A future step cannot become active until it is reviewed.</h2>
        <p>Name what you need. This produces a local preview, not a runnable step or capability claim.</p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="plan-gap">Describe the gap you want reviewed</label>
        <textarea
          id="plan-gap"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Example: I need a safe way to compare model answers."
          rows={3}
        />
        <button type="submit">Preview gap request</button>
      </form>
      <div className={styles.gapPreview} aria-live="polite">
        <small>Unsaved local preview</small>
        <strong>{preview || "Nothing has been proposed."}</strong>
        <span>No path, due date, or review status changed.</span>
      </div>
    </section>
  );
}

export function PlanExperience() {
  return (
    <AppFrame active="plan">
      <header className={styles.pageIntro}>
        <SectionLabel>My Plan · reviewed sequence</SectionLabel>
        <h1>The route from better questions to better judgment.</h1>
        <p>Use AI while preserving source judgment, model limits, and independent reasoning.</p>
      </header>

      <ol className={styles.planTimeline}>
        {PLAN_STAGES.map((stage) => (
          <li data-state={stage.state} key={stage.number}>
            <span className={styles.stageNumber}>{stage.state === "complete" ? <Icon name="check" size={18} /> : stage.number}</span>
            <div><h2>{stage.title}</h2><p>{stage.status}</p></div>
            {stage.state === "current" ? (
              <Link href="/learn/ai-and-learning"><Icon name="play" size={17} /> Test a claim against its sources <Icon name="arrow" size={17} /></Link>
            ) : null}
            {stage.state === "next" ? <small>Why next: evidence judgment comes before reasoning about model limits.</small> : null}
            {stage.state === "gap" ? <small>No reviewed activity or proof family is assigned.</small> : null}
          </li>
        ))}
      </ol>

      <section className={styles.planColumns}>
        <article>
          <header><Icon name="document" /><h2>Resources</h2></header>
          <Link href="/learn/ai-and-learning"><span><small>Reviewed inside a World</small><strong>What evidence can support</strong></span><Icon name="arrow" size={18} /></Link>
          <Link href="/app/library"><span><small>Exact source receipts</small><strong>Inspect the governed library</strong></span><Icon name="arrow" size={18} /></Link>
        </article>
        <article>
          <header><Icon name="path" /><h2>Available work</h2></header>
          <Link href="/learn/ai-and-learning"><span><small>Working World</small><strong>Corroborate a model-generated claim</strong></span><Icon name="arrow" size={18} /></Link>
          <Link href="/learn/force-and-motion"><span><small>Optional reviewed World</small><strong>Identify force and model limits</strong></span><Icon name="arrow" size={18} /></Link>
        </article>
        <article>
          <header><Icon name="evidence" /><h2>Proof &amp; return</h2></header>
          <Link href="/app/evidence"><span><small>Browser-local</small><strong>Inspect bounded evidence</strong></span><Icon name="arrow" size={18} /></Link>
          <div className={styles.unavailableRow}><span><small>Unavailable</small><strong>Return after delay</strong></span><span>Not released</span></div>
        </article>
      </section>

      <PlanGapEditor />
    </AppFrame>
  );
}

const WORLDS = [
  {
    href: "/learn/ai-and-learning",
    title: "AI & learning",
    description: "Test a model-generated claim against reviewed sources, then complete an independent corroboration transfer.",
    capability: "Source judgment",
    accent: "gold",
  },
  {
    href: "/learn/force-and-motion",
    title: "Force & motion",
    description: "Commit a model, test it against authored physics, and distinguish net force from velocity.",
    capability: "Model reasoning",
    accent: "cyan",
  },
  {
    href: "/learn/proportional-reasoning",
    title: "Ratios that stay the same",
    description: "Compare and scale proportional relationships with exact deterministic checking.",
    capability: "Quantitative reasoning",
    accent: "green",
  },
  {
    href: "/learn/primary-source-reasoning",
    title: "What can a photograph prove?",
    description: "Keep historical claims inside the evidence boundary of a primary source.",
    capability: "Primary-source judgment",
    accent: "violet",
  },
] as const;

export function ExploreExperience() {
  const [query, setQuery] = useState("");
  const visibleWorlds = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return WORLDS;
    return WORLDS.filter((world) =>
      `${world.title} ${world.description} ${world.capability}`.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <AppFrame active="explore">
      <header className={styles.pageIntro}>
        <SectionLabel>Explore · released experiences only</SectionLabel>
        <h1>Explore four working Worlds.</h1>
        <p>Each World has reviewed sources, a deterministic boundary, and an honest evidence contract.</p>
      </header>

      <label className={styles.searchField} htmlFor="world-search">
        <Icon name="search" />
        <span className={styles.srOnly}>Search working Worlds</span>
        <input
          id="world-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search working Worlds"
        />
        <small>{visibleWorlds.length} of 4 available</small>
      </label>

      <section className={styles.worldGrid} aria-live="polite" aria-label="Working Worlds">
        {visibleWorlds.map((world) => (
          <article className={styles.worldCard} data-accent={world.accent} key={world.href}>
            <div className={styles.worldMark}><Icon name="compass" size={29} /></div>
            <SectionLabel>Working World</SectionLabel>
            <h2>{world.title}</h2>
            <p>{world.description}</p>
            <span className={styles.capabilityTag}>{world.capability}</span>
            <Link href={world.href}>Open World <Icon name="arrow" size={18} /></Link>
          </article>
        ))}
        {visibleWorlds.length === 0 ? (
          <div className={styles.emptySearch}>
            <Icon name="search" size={30} />
            <h2>No working World matches that search.</h2>
            <p>Try source, force, ratios, photograph, or AI.</p>
          </div>
        ) : null}
      </section>

      <section className={styles.candidateShelf} aria-labelledby="candidate-title">
        <div>
          <SectionLabel>Candidate directions</SectionLabel>
          <h2 id="candidate-title">Visible, but unavailable until reviewed.</h2>
          <p>FORGE will not make an unreleased direction look runnable.</p>
        </div>
        <article><Icon name="warning" /><span><strong>Build with AI responsibly</strong><small>Needs activity, source, proof, and publication review</small></span><em>Unavailable</em></article>
        <article><Icon name="warning" /><span><strong>Real-world project studio</strong><small>Needs reviewer authority and a released proof family</small></span><em>Unavailable</em></article>
      </section>
    </AppFrame>
  );
}

export function ProjectsExperience() {
  return (
    <AppFrame active="projects">
      <header className={styles.pageIntro}>
        <SectionLabel>Projects · honest assignment state</SectionLabel>
        <h1>Projects start when the proof contract is real.</h1>
        <p>A real project needs constraints, provenance, critique, defence, transfer, and clear review authority.</p>
      </header>

      <section className={styles.projectHero} aria-labelledby="project-state-title">
        <span className={styles.projectHeroIcon}><Icon name="folder" size={38} /></span>
        <div>
          <SectionLabel>Not assigned</SectionLabel>
          <h2 id="project-state-title">No canonical project is available on this device.</h2>
          <p>The source-verification World can support your thinking, but finishing it does not create project evidence or a project status.</p>
        </div>
        <Link className={styles.secondaryButton} href="/app/projects">Inspect the full project contract</Link>
      </section>

      <section className={styles.prototypeGrid}>
        <article className={styles.prototypeCard}>
          <header><span>Candidate prototype</span><em>Unavailable as project</em></header>
          <h2>Explain a consequential claim with sources.</h2>
          <p>A future project could bind a verification memo to critique and independent defence. Those proof tasks are not published today.</p>
          <ol>
            <li><span>1</span>Choose a claim without private or high-stakes data.</li>
            <li><span>2</span>Separate the claim, source, and inference.</li>
            <li><span>3</span>Seek contradiction and corroboration.</li>
            <li><span>4</span>Revise the decision language.</li>
            <li data-unavailable="true"><span>5</span>Independent defence · not released.</li>
          </ol>
          <Link href="/learn/ai-and-learning">Open the supporting World <Icon name="arrow" size={18} /></Link>
        </article>

        <aside className={styles.requirementsCard}>
          <SectionLabel>Release gate</SectionLabel>
          <h2>What must exist before assignment</h2>
          <ul>
            <li><Icon name="check" size={17} /> A bounded learner goal and real constraints</li>
            <li><Icon name="check" size={17} /> Exact source and AI-use provenance</li>
            <li><Icon name="warning" size={17} /> Reviewer authority</li>
            <li><Icon name="warning" size={17} /> Critique and defence tasks</li>
            <li><Icon name="warning" size={17} /> An unfamiliar transfer proof family</li>
          </ul>
          <p>Current state: prototype only. No completion, evidence, or capability claim is created.</p>
        </aside>
      </section>
    </AppFrame>
  );
}

function ProfileControls() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [ageMode, setAgeMode] = useState<ForgeDeviceProfile["ageMode"]>("adult");
  const [guardianPresent, setGuardianPresent] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPreferences(readPreferences());
      const profile = readForgeDeviceProfile(window.localStorage);
      if (profile) {
        setAgeMode(profile.ageMode);
        setGuardianPresent(profile.guardianPresent);
        setProfileExists(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      writePreferences(preferences);
      setMessage("Interface preferences saved in this browser.");
    } catch {
      setMessage("Interface preferences could not be saved in this browser.");
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ageMode === "child_with_grown_up" && !guardianPresent) {
      setMessage("A grown-up must be present to use the under-13 device mode.");
      return;
    }
    try {
      createForgeDeviceProfile(window.localStorage, ageMode, guardianPresent);
      window.dispatchEvent(new Event(FORGE_DEVICE_PROFILE_EVENT));
      setProfileExists(true);
      setMessage("Device mode saved locally. This is not a verified identity or account.");
    } catch {
      setMessage("Device mode could not be saved.");
    }
  }

  function resetInterface() {
    try {
      window.localStorage.removeItem(PREFERENCES_KEY);
      window.dispatchEvent(new Event(PREFERENCES_EVENT));
      setPreferences(DEFAULT_PREFERENCES);
      setMessage("Interface preferences reset. Evidence and path records were not changed.");
    } catch {
      setMessage("Interface preferences could not be reset.");
    }
  }

  function removeProfile() {
    const result = clearForgeDeviceProfile(window.localStorage);
    if (!result.ok) {
      setMessage("The local device mode and its profile-bound data could not be confirmed removed. The existing device mode remains active.");
      return;
    }
    window.dispatchEvent(new Event(FORGE_DEVICE_PROFILE_EVENT));
    setProfileExists(false);
    setAgeMode("adult");
    setGuardianPresent(false);
    setMessage("The local device mode and its profile-bound evidence and path records were removed.");
  }

  return (
    <>
      <section className={styles.settingsGrid}>
        <form className={styles.settingsCard} onSubmit={savePreferences}>
          <header><Icon name="spark" /><div><SectionLabel>Accessibility</SectionLabel><h2>Interface preferences</h2></div></header>
          <p>These choices affect this FORGE shell and stay in this browser.</p>
          <label className={styles.toggleRow}>
            <span><strong>Reduce motion</strong><small>Stops decorative transitions in this workspace.</small></span>
            <input
              type="checkbox"
              checked={preferences.reduceMotion}
              onChange={(event) => setPreferences({ ...preferences, reduceMotion: event.target.checked })}
            />
          </label>
          <label className={styles.toggleRow}>
            <span><strong>Higher contrast</strong><small>Strengthens borders and secondary text.</small></span>
            <input
              type="checkbox"
              checked={preferences.higherContrast}
              onChange={(event) => setPreferences({ ...preferences, higherContrast: event.target.checked })}
            />
          </label>
          <label className={styles.toggleRow}>
            <span><strong>Larger text</strong><small>Raises the base size without changing content.</small></span>
            <input
              type="checkbox"
              checked={preferences.largerText}
              onChange={(event) => setPreferences({ ...preferences, largerText: event.target.checked })}
            />
          </label>
          <div className={styles.formActions}>
            <button type="submit">Save interface preferences</button>
            <button type="button" onClick={resetInterface}>Reset</button>
          </div>
        </form>

        <form className={styles.settingsCard} onSubmit={saveProfile}>
          <header><Icon name="profile" /><div><SectionLabel>Device mode</SectionLabel><h2>Choose the local experience</h2></div></header>
          <p>This helps apply age-appropriate boundaries. It is not identity verification and is not cloud-backed.</p>
          <fieldset>
            <legend>Who is using this device?</legend>
            <label><input type="radio" name="age-mode" value="adult" checked={ageMode === "adult"} onChange={() => { setAgeMode("adult"); setGuardianPresent(false); }} /> Adult</label>
            <label><input type="radio" name="age-mode" value="teen" checked={ageMode === "teen"} onChange={() => { setAgeMode("teen"); setGuardianPresent(false); }} /> Teen</label>
            <label><input type="radio" name="age-mode" value="child_with_grown_up" checked={ageMode === "child_with_grown_up"} onChange={() => setAgeMode("child_with_grown_up")} /> Under 13 with a grown-up</label>
          </fieldset>
          {ageMode === "child_with_grown_up" ? (
            <label className={styles.guardianCheck}><input type="checkbox" checked={guardianPresent} onChange={(event) => setGuardianPresent(event.target.checked)} /> A grown-up is present</label>
          ) : null}
          <div className={styles.formActions}>
            <button type="submit">Save device mode</button>
            {profileExists ? <button type="button" onClick={removeProfile}>Remove mode</button> : null}
          </div>
        </form>
      </section>
      <p className={styles.saveMessage} aria-live="polite">{message || "No settings leave this browser from this page."}</p>
    </>
  );
}

export function ProfileExperience() {
  return (
    <AppFrame active="profile">
      <header className={styles.pageIntro}>
        <SectionLabel>Profile · device-local controls</SectionLabel>
        <h1>Your device. Your choices.</h1>
        <p>Control the local experience without implying an account, cloud sync, billing, notifications, or a connected provider.</p>
      </header>

      <ProfileControls />

      <section className={styles.privacyPanel} aria-labelledby="privacy-title">
        <div>
          <SectionLabel>Privacy</SectionLabel>
          <h2 id="privacy-title">Know where every record lives.</h2>
          <p>Profile mode, interface preferences, accepted paths, and evidence are separate browser-local records. Nothing here claims cross-device backup.</p>
        </div>
        <Link href="/app/evidence"><Icon name="evidence" /><span><strong>Evidence controls</strong><small>Inspect, export, share explicitly, or delete local entries</small></span><Icon name="arrow" size={18} /></Link>
        <Link href="/app/settings"><Icon name="lock" /><span><strong>Account boundary</strong><small>See which account and cloud capabilities are unavailable</small></span><Icon name="arrow" size={18} /></Link>
        <Link href="/start"><Icon name="compass" /><span><strong>Learning direction</strong><small>Review a new learner-owned goal</small></span><Icon name="arrow" size={18} /></Link>
      </section>
    </AppFrame>
  );
}
