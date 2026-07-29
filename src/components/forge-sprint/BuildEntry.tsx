"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ProductShell } from "./ProductShell";
import { ArrowIcon } from "./SprintIcons";

export function StartSprintForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextIdea = idea.trim();
    if (nextIdea.length < 3) {
      setError("Name one useful thing you want to make.");
      return;
    }
    setError("");
    router.push("/build/new?idea=" + encodeURIComponent(nextIdea));
  }

  return (
    <form className={compact ? "forge-start-form forge-start-form--compact" : "forge-start-form"} onSubmit={submit}>
      <label htmlFor={compact ? "landing-sprint-idea" : "build-sprint-idea"}>
        <span>What do you want to ship in 7 days?</span>
        <input
          id={compact ? "landing-sprint-idea" : "build-sprint-idea"}
          name="idea"
          value={idea}
          maxLength={90}
          onChange={(event) => {
            setIdea(event.target.value);
            if (error) setError("");
          }}
          placeholder="A campus tool, case study, explainer…"
          autoComplete="off"
        />
      </label>
      <button type="submit">
        Start a Forge Sprint <ArrowIcon />
      </button>
      {error ? <p className="forge-form-error" role="alert">{error}</p> : null}
    </form>
  );
}

export function BuildEntry() {
  return (
    <ProductShell active="build">
      <main className="forge-build-entry" id="forge-sprint-main" tabIndex={-1}>
        <div className="forge-build-entry__copy">
          <span className="forge-sprint-kicker">One useful outcome · Seven focused days</span>
          <h1>Start smaller.<br />Finish something real.</h1>
          <p>
            Name the artifact, person, or problem first. Forge will turn it into a
            practical daily map you can edit—not a course, streak, or generic AI plan.
          </p>
        </div>
        <div className="forge-build-entry__panel">
          <span>Start with the finish line</span>
          <StartSprintForm />
          <p>Your sprint is saved only in this browser. No account required.</p>
        </div>
      </main>
    </ProductShell>
  );
}
