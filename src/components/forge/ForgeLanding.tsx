"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { PUBLIC_GOAL_DIRECTIONS } from "@/src/forge/public-paths";
import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";

import { ForgeKicker, ForgeSectionHeading, ForgeStatus, ForgeTrustLine } from "./ForgePrimitives";
import { ForgeArrow, ForgeShell } from "./ForgeShell";
import { writeStartDraft } from "./start-draft";

const JOURNEY = [
  ["Goal", "Name what you want to understand, make, decide, or become able to do."],
  ["Credible path", "Inspect prerequisites, active work, authority, and visible gaps before accepting."],
  ["Study and practice", "Read, watch, retrieve, explain, compare, and practise toward a meaningful operation."],
  ["Project or ModelShift", "Meet real constraints—or challenge a mental model with a separating experience."],
  ["Proof and return", "Remove instructional help, transfer into an unfamiliar case, and test again after delay."],
] as const;

export function ForgeLanding() {
  const router = useRouter();
  const [goalMessage, setGoalMessage] = useState("");
  const componentDirections = PUBLIC_GOAL_DIRECTIONS.filter(
    (direction) => direction.status === "reviewed_components",
  );

  function beginGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("goal");
    if (typeof value !== "string" || !writeStartDraft({ goal: value, desiredOutcome: "" })) {
      setGoalMessage("This browser could not keep the goal in tab-local storage. Open Start learning and enter it there.");
      return;
    }
    setGoalMessage("");
    router.push("/start");
  }

  return (
    <ForgeShell active="home" surface="public">
      <main id="forge-main" tabIndex={-1}>
        <section className="forge-landing-hero" aria-labelledby="forge-landing-title">
          <Image
            alt=""
            className="forge-landing-hero__image"
            fill
            priority
            sizes="100vw"
            src="/forge/through-the-door.png"
          />
          <div className="forge-landing-hero__shade" aria-hidden="true" />
          <div className="forge-landing-hero__content">
            <ForgeKicker>Goal → capability → honest evidence</ForgeKicker>
            <h1 id="forge-landing-title">
              A path from ambition to <em>capability.</em>
            </h1>
            <p>
              FORGE turns a personally meaningful goal into active work, practical projects,
              selective ModelShift experiences, and proof that distinguishes supported practice
              from what you can do independently.
            </p>
            <form className="forge-landing-goal" onSubmit={beginGoal}>
              <label htmlFor="forge-public-goal">
                <span>Your goal</span>
                <small>What do you want to understand, build, or become able to do?</small>
              </label>
              <div>
                <input
                  autoComplete="off"
                  id="forge-public-goal"
                  maxLength={600}
                  name="goal"
                  placeholder="I want to become AI-literate."
                  required
                  type="text"
                />
                <button type="submit">Shape the path <ForgeArrow /></button>
              </div>
              {goalMessage ? <p role="status">{goalMessage}</p> : null}
            </form>
            <div className="forge-landing-hero__links">
              <Link href="/modelshift">See how ModelShift works</Link>
              <span>Four reviewed activities work today. Broader paths remain visible candidates.</span>
            </div>
          </div>
        </section>

        <section className="forge-landing-section" aria-labelledby="forge-journey-title">
          <ForgeSectionHeading
            id="forge-journey-title"
            label="One continuous journey"
            title="Find the path. Do the work. Prove what remains."
            description="AI can make assistance abundant. FORGE organizes the scarcer things: a credible route, reviewed authority, active work, real consequence, support withdrawal, and delayed evidence."
          />
          <ol className="forge-landing-journey">
            {JOURNEY.map(([title, body], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{title}</h3><p>{body}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="forge-landing-section forge-landing-section--dark" aria-labelledby="forge-worlds-title">
          <ForgeSectionHeading
            id="forge-worlds-title"
            label="Working truth"
            title="Four reviewed Worlds. Many honest directions."
            description="A working component is not a complete course. FORGE keeps broad ambitions open while refusing to disguise an outline, video list, or generated lesson as published coverage."
          />
          <div className="forge-landing-worlds">
            {PUBLIC_WORLD_CATALOG.map((world) => (
              <article key={world.id}>
                <ForgeStatus tone="evidence">Released · v{world.version}</ForgeStatus>
                <h3>{world.title}</h3>
                <p>{world.summary}</p>
                <Link href={world.route}>Open World <ForgeArrow /></Link>
              </article>
            ))}
          </div>
          <div className="forge-landing-directions">
            <span>Broader directions with reviewed components</span>
            <p>{componentDirections.map((direction) => direction.title).join(" · ")}</p>
            <Link className="forge-secondary-action" href="/paths">Inspect every direction and gap <ForgeArrow /></Link>
          </div>
        </section>

        <section className="forge-landing-section forge-landing-modelshift" aria-labelledby="forge-modelshift-title">
          <div>
            <ForgeKicker>FORGE’s selective learning engine</ForgeKicker>
            <h2 id="forge-modelshift-title">Use ModelShift when an explanation needs to lose.</h2>
            <p>
              The learner commits a claim. Two plausible readings expose a disagreement. An
              authored experience separates them. Assistance then leaves before an unfamiliar
              transfer. Not every activity needs this instrument.
            </p>
            <Link className="forge-primary-action" href="/modelshift">Inspect the protocol <ForgeArrow /></Link>
          </div>
          <ol>
            {[
              "Learner claim",
              "Two plausible readings",
              "Point of disagreement",
              "Separating experience",
              "Assistance withdrawal",
              "Bounded unaided proof",
            ].map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
          </ol>
        </section>

        <section className="forge-landing-section forge-landing-truth" aria-labelledby="forge-truth-title">
          <ForgeStatus tone="human">Truth before scale</ForgeStatus>
          <h2 id="forge-truth-title">FORGE can start with any goal. It cannot yet teach everything.</h2>
          <p>
            Unknown goals become contestable maps and explicit coverage gaps—not fabricated
            courses. Cloud identity, live providers, open-web child discovery, social surfaces,
            broad homeschool coverage, accreditation, and universal efficacy claims remain off.
          </p>
          <div>
            <Link className="forge-primary-action" href="/start">Start with my goal <ForgeArrow /></Link>
            <Link className="forge-secondary-action" href="/trust">Inspect evidence and trust</Link>
          </div>
        </section>
      </main>
      <footer className="forge-footer">
        <div><strong>FORGE</strong><span>Learning OS</span></div>
        <p>Learner-owned paths. Reviewed authority. Proof after help.</p>
        <ForgeTrustLine />
      </footer>
    </ForgeShell>
  );
}
