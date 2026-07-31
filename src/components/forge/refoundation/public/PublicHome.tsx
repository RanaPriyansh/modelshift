"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { writeStartDraft } from "@/src/components/forge/start-draft";
import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";

import { PublicFrame } from "./PublicFrame";
import styles from "./StudentHome.module.css";

const LEARNING_LOOP = [
  ["Recall", "Bring the model back before help appears."],
  ["Attempt", "Work the difficult part and make your thinking visible."],
  ["Repair", "Use specific feedback and the smallest useful hint."],
  ["Prove", "Transfer the idea to a fresh case without instructional help."],
  ["Return", "Check the same capability later, after spacing."],
] as const;

const PROOF_STATES = [
  ["Encountered", "You met the idea."],
  ["Practised", "You worked with support."],
  ["Demonstrated", "You transferred it independently."],
  ["Retained", "A reviewed later check held."],
  ["Not tested", "FORGE does not guess."],
] as const;

const WORLD_COPY: Record<string, string> = {
  "world.force-and-motion": "Test two models of motion, then transfer the result without help.",
  "world.proportional-reasoning": "Find the invariant relationship, then apply it in a new case.",
  "world.source-corroboration": "Trace a model claim to reviewed sources and state uncertainty.",
  "world.primary-source-reasoning": "Observe first, compare evidence, and defend one bounded claim.",
};

export function PublicHome() {
  const router = useRouter();
  const [goalMessage, setGoalMessage] = useState("");

  function beginGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const goal = new FormData(event.currentTarget).get("goal");
    if (typeof goal !== "string" || !writeStartDraft({ goal, desiredOutcome: "" })) {
      setGoalMessage("This tab could not keep the goal. Open Start learning and enter the goal there.");
      return;
    }
    setGoalMessage("");
    router.push("/start");
  }

  return (
    <PublicFrame active="home" overlayHeader>
      <main id="forge-main" className={styles.main} tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="home-title">
          <Image
            className={styles.heroImage}
            src="/forge/landscapes/learning-threshold-cobalt.png"
            alt=""
            fill
            priority
            sizes="100vw"
          />
          <div className={styles.heroInner}>
            <h1 id="home-title">Learn what matters next.</h1>
            <p>
              Choose one real goal. FORGE turns it into hard practice, clear feedback,
              independent proof, and a planned return.
            </p>
            <form className={styles.goalForm} onSubmit={beginGoal}>
              <label htmlFor="forge-public-goal">Your next goal</label>
              <div>
                <input
                  id="forge-public-goal"
                  name="goal"
                  type="text"
                  maxLength={240}
                  required
                  autoComplete="off"
                  aria-describedby={goalMessage ? "forge-public-goal-message" : undefined}
                  placeholder="I want to understand why this method works."
                />
                <button type="submit">Start learning</button>
              </div>
              {goalMessage ? (
                <span id="forge-public-goal-message" role="status">{goalMessage}</span>
              ) : null}
            </form>
          </div>
        </section>

        <section className={styles.loopSection} aria-labelledby="loop-title">
          <header>
            <h2 id="loop-title">Hard problems need a better rhythm.</h2>
            <p>
              Each action moves from memory to effort, feedback, independent transfer, and a later check.
            </p>
          </header>
          <ol className={styles.loop}>
            {LEARNING_LOOP.map(([title, body]) => (
              <li key={title}>
                <strong>{title}</strong>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.proofSection} aria-labelledby="proof-title">
          <div className={styles.proofImage}>
            <Image
              src="/forge/through-the-door.png"
              alt="A mountain path visible through a bright doorway."
              fill
              loading="eager"
              sizes="(max-width: 760px) 100vw, 48vw"
            />
          </div>
          <div className={styles.proofCopy}>
            <h2 id="proof-title">Progress means more than completion.</h2>
            <p>
              FORGE keeps supported practice separate from independent proof. A later return can test what remains.
            </p>
            <ol className={styles.proofStates}>
              {PROOF_STATES.map(([state, body]) => (
                <li key={state}>
                  <strong>{state}</strong>
                  <span>{body}</span>
                </li>
              ))}
            </ol>
            <Link href="/trust">See the evidence rules</Link>
          </div>
        </section>

        <section className={styles.worldsSection} aria-labelledby="worlds-title">
          <header>
            <h2 id="worlds-title">Four Worlds. Four ways to think.</h2>
            <p>
              Each released World uses reviewed sources, a bounded task, and explicit proof conditions.
            </p>
          </header>
          <div className={styles.worldMosaic}>
            {PUBLIC_WORLD_CATALOG.map((world, index) => (
              <Link
                className={styles.worldCard}
                data-tone={String(index + 1)}
                href={world.route}
                key={world.id}
              >
                <span>Reviewed World</span>
                <h3>{world.title}</h3>
                <p>{WORLD_COPY[world.id] ?? world.summary}</p>
                <small>Open World</small>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.closingSection} aria-labelledby="closing-title">
          <div>
            <h2 id="closing-title">Bring the question you cannot leave alone.</h2>
            <p>Start with one goal. Keep every gap, source, hint, result, and return visible.</p>
          </div>
          <Link href="/start">Start learning</Link>
        </section>
      </main>
    </PublicFrame>
  );
}
