"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { writeStartDraft } from "@/src/components/forge/start-draft";
import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";

import { PublicFrame } from "./PublicFrame";
import styles from "./PublicExperience.module.css";

const THRESHOLD_STEPS = [
  ["01", "Goal", "Name what you want to understand or be able to do."],
  ["02", "Path", "Inspect a route with prerequisites and visible gaps."],
  ["03", "Work", "Use sources, retrieval, explanation, and active practice."],
  ["04", "Project", "Apply the model to something concrete and consequential."],
  ["05", "Proof", "Remove assistance and test an unfamiliar transfer."],
] as const;

const MODEL_STEPS = [
  "Explain",
  "Compare models",
  "Find disagreement",
  "Run the test",
  "Observe",
  "Reconstruct",
] as const;

const EVIDENCE_STATES = [
  ["Encountered", "You met the idea."],
  ["Practised", "You worked with support."],
  ["Demonstrated", "You transferred it independently."],
  ["Retained", "A later check held."],
  ["Not yet tested", "The system does not guess."],
] as const;

export function PublicHome() {
  const router = useRouter();
  const [goalMessage, setGoalMessage] = useState("");

  function beginGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const goal = new FormData(event.currentTarget).get("goal");
    if (typeof goal !== "string" || !writeStartDraft({ goal, desiredOutcome: "" })) {
      setGoalMessage("The goal could not be held in tab-local storage. Open Create my path and enter it there.");
      return;
    }
    setGoalMessage("");
    router.push("/start");
  }

  return (
    <PublicFrame active="home" overlayHeader>
      <main id="forge-main" className={styles.homeMain} tabIndex={-1}>
        <section className={`${styles.homeChapter} ${styles.darkRoom}`} aria-labelledby="home-title">
          <Image
            className={styles.heroImage}
            src="/forge/through-the-door.png"
            alt=""
            fill
            priority
            sizes="100vw"
          />
          <div className={styles.heroContent}>
            <p className={styles.chapterLabel}>Chapter 1 · Dark room</p>
            <h1 id="home-title">
              A path from ambition to <span>capability.</span>
            </h1>
            <p className={styles.heroLead}>
              Forge turns a real goal into focused work and evidence that distinguishes
              supported practice from what you can do on your own.
            </p>
            <ul className={styles.heroPromises} aria-label="The Forge promise">
              <li>
                <strong>Find the path.</strong>
                <span>See prerequisites and gaps.</span>
              </li>
              <li>
                <strong>Do the work.</strong>
                <span>Build a model through action.</span>
              </li>
              <li>
                <strong>Prove what remains.</strong>
                <span>Test after the help leaves.</span>
              </li>
            </ul>
            <form className={styles.goalForm} onSubmit={beginGoal}>
              <label htmlFor="forge-public-goal">
                Your goal
                <span>What do you want to understand, build, or be able to do?</span>
              </label>
              <div className={styles.goalControls}>
                <input
                  id="forge-public-goal"
                  name="goal"
                  type="text"
                  maxLength={240}
                  required
                  autoComplete="off"
                  placeholder="I want to become AI-literate."
                />
                <button type="submit">
                  Show me the path
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              {goalMessage ? <p role="status">{goalMessage}</p> : null}
            </form>
            <div className={styles.heroLinks}>
              <Link href="/modelshift">See how ModelShift tests understanding</Link>
              <span>Four reviewed Worlds are available now.</span>
            </div>
          </div>
          <a className={styles.scrollCue} href="#threshold">
            See how a goal becomes a path
            <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section
          id="threshold"
          className={`${styles.homeChapter} ${styles.thresholdChapter}`}
          aria-labelledby="threshold-title"
        >
          <div className={styles.thresholdVisual} aria-hidden="true">
            <Image
              src="/forge/through-the-door.png"
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 42vw"
            />
          </div>
          <div className={styles.thresholdBody}>
            <p className={styles.chapterLabel}>Chapter 2 · Threshold</p>
            <h2 id="threshold-title">From where you are to what you can prove.</h2>
            <p>
              Forge does not hide the route behind a recommendation score. The structure stays
              visible, editable, and honest about what has not been published.
            </p>
            <ol className={styles.thresholdSteps}>
              {THRESHOLD_STEPS.map(([number, title, body]) => (
                <li key={number}>
                  <span>{number}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link className={styles.textAction} href="/how-it-works">
              Follow the complete learning journey
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section
          className={`${styles.homeChapter} ${styles.mountainChapter}`}
          aria-labelledby="mountain-title"
        >
          <div className={styles.chapterIntro}>
            <p className={`${styles.chapterLabel} ${styles.chapterLabelGreen}`}>
              Chapter 3 · Mountain system
            </p>
            <h2 id="mountain-title">A path is a knowledge system, not a playlist.</h2>
            <p>
              Elevation means capability. Prerequisites build the approach. Branches remain
              optional until they are needed. The next action is clear without hiding the map.
            </p>
          </div>
          <div className={styles.pathPreview}>
            <div className={styles.pathPreviewHeader}>
              <div>
                <span>Candidate path preview</span>
                <strong>Think like an engineer</strong>
              </div>
              <p>Not a published broad path</p>
            </div>
            <ol className={styles.milestoneList}>
              <li>
                <span>Base camp</span>
                <div>
                  <strong>Define the system</strong>
                  <p>Name the goal, constraints, and measurable behaviour.</p>
                </div>
                <small>Orientation</small>
              </li>
              <li>
                <span>Reviewed World</span>
                <div>
                  <strong>Force &amp; motion</strong>
                  <p>Distinguish net force, acceleration, and velocity.</p>
                </div>
                <small>Available now</small>
              </li>
              <li>
                <span>Reviewed World</span>
                <div>
                  <strong>Ratios that stay the same</strong>
                  <p>Compare relationships exactly, then transfer the model.</p>
                </div>
                <small>Available now</small>
              </li>
              <li>
                <span>Publication gap</span>
                <div>
                  <strong>Design, materials, and safety</strong>
                  <p>Requires reviewed projects and broader capability coverage.</p>
                </div>
                <small>Not released</small>
              </li>
            </ol>
            <div className={styles.nextAction}>
              <div>
                <span>Next action</span>
                <strong>Open the reviewed force-and-motion World</strong>
              </div>
              <Link href="/learn/force-and-motion">
                Begin
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section
          className={`${styles.homeChapter} ${styles.modelShiftChapter}`}
          aria-labelledby="modelshift-title"
        >
          <div className={styles.modelShiftIntro}>
            <p className={`${styles.chapterLabel} ${styles.chapterLabelCyan}`}>
              Chapter 4 · ModelShift storm
            </p>
            <h2 id="modelshift-title">When your first explanation fails, test the model.</h2>
            <p>
              ModelShift makes the disagreement visible, chooses an authored separating
              experience, and keeps correctness outside AI judgment.
            </p>
          </div>
          <ol className={styles.modelSequence} aria-label="The ModelShift sequence">
            {MODEL_STEPS.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
          <div className={styles.modelComparison}>
            <article>
              <span>Model A</span>
              <h3>Motion needs a continuing force.</h3>
              <p>Prediction: when thrust stops, the object should stop.</p>
            </article>
            <div>
              <span>Separating test</span>
              <strong>Remove thrust in a resistance-free system.</strong>
              <p>The authored observation distinguishes the two predictions.</p>
            </div>
            <article>
              <span>Model B</span>
              <h3>Zero net force means zero acceleration.</h3>
              <p>Prediction: existing velocity remains constant.</p>
            </article>
          </div>
          <Link className={styles.cyanAction} href="/modelshift">
            See the mechanism
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section
          className={`${styles.homeChapter} ${styles.proofChapter}`}
          aria-labelledby="proof-title"
        >
          <div className={styles.chapterIntro}>
            <p className={`${styles.chapterLabel} ${styles.chapterLabelGreen}`}>
              Chapter 5 · Summit &amp; proof
            </p>
            <h2 id="proof-title">The tools are gone. This part is yours.</h2>
            <p>
              Practice with support is useful. It is not the same as independent transfer.
              Forge keeps those states separate so the evidence stays legible.
            </p>
          </div>
          <div className={styles.assistanceOff}>
            <span>AI assistance</span>
            <strong>Off for independent proof</strong>
          </div>
          <ol className={styles.evidenceStates}>
            {EVIDENCE_STATES.map(([state, body], index) => (
              <li key={state}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{state}</strong>
                <p>{body}</p>
              </li>
            ))}
          </ol>
          <div className={styles.liveWorlds}>
            <div className={styles.liveWorldsIntro}>
              <span>Working today</span>
              <h3>Four bounded Worlds, each with a real route.</h3>
              <p>
                These are reviewed activities—not proof that a complete broad curriculum has
                been released.
              </p>
            </div>
            <div className={styles.worldLinks}>
              {PUBLIC_WORLD_CATALOG.map((world) => (
                <div className="forge-world-row" key={world.id}>
                  <Link
                    aria-label={`Open ${world.title} World`}
                    href={world.route}
                  >
                    <span>{world.kind} World</span>
                    <h3>{world.title}</h3>
                    <small>{world.evidenceTier} evidence</small>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className={`${styles.homeChapter} ${styles.openPlainChapter}`}
          aria-labelledby="open-plain-title"
        >
          <div>
            <p className={`${styles.chapterLabel} ${styles.chapterLabelGreen}`}>
              Chapter 6 · Open plain
            </p>
            <h2 id="open-plain-title">Choose your mountain.</h2>
            <p>
              Begin with a goal. Inspect what is real, what is proposed, and what proof would
              have to show. You decide whether the route is worth taking.
            </p>
            <div className={styles.finalActions}>
              <Link className={styles.darkAction} href="/start">
                Create my path
                <span aria-hidden="true">→</span>
              </Link>
              <Link className={styles.lightTextAction} href="/explore">
                Explore candidate directions
              </Link>
            </div>
          </div>
          <blockquote>
            <p>Forge did not carry me. It made me capable.</p>
            <footer>The standard for the journey</footer>
          </blockquote>
        </section>
      </main>
    </PublicFrame>
  );
}
