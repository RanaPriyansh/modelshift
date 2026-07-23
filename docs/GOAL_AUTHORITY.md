# HISTORICAL — ModelShift-only Goal and Architecture Authority

> This document is a historical ModelShift v1 planning record, not current FORGE product, release, minor-safety, homeschool, efficacy, or deployment authority. Current authority is `docs/program/README.md` (North Star), `FORGE_PRODUCT_SPEC.md` (product rights), `docs/FORGE_DELIVERY_GATES.md` (claim ladder), and `docs/operations/CURRENT_RELEASE.md` (current public release record).

**Authority role:** Goal, requirements, architecture, and scope authority only. The principal ModelShift thread remains integration, delivery, deployment, and `/feedback` authority.

**Evidence snapshot:** 2026-07-22 00:55:54 IST, 274 minutes before the verified submission deadline of 2026-07-22 05:30 IST / 2026-07-21 17:00 PT.

**Target root:** `/Users/Priyansh/Documents/codex-buildweek/education`. No Git root or application exists yet, but this directory contains the complete authoritative handoff and no sibling implementation. Therefore the requested output belongs at `education/docs/GOAL_AUTHORITY.md`.

## Executive decision

Build one complete ModelShift transformation, not the broader Forge platform:

> A learner who believes motion needs a continuing force commits that model, sees a bounded and uncertain interpretation of their own explanation, runs the authored experiment that best distinguishes the plausible models, reconstructs the force–acceleration–velocity relationship, and then proves the revised model once in a new representation after every assistance path has been removed.

The smallest complete submission is a deterministic-first web product with one runtime GPT-5.6 Sol interpretation call. GPT may interpret language and recommend authored IDs. It must never own physics, correct answers, state transitions, help authorization, proof mode, or scoring. The entire journey must remain completable through a neutral authored probe when the model is missing, slow, ambiguous, refused, or invalid.

This project starts from zero implementation. There is currently no repository, source tree, package manifest, test suite, deployment, ModelShift GitHub repository, or ModelShift Vercel project. The compressed schedule is therefore a material delivery risk, not an ordinary implementation detail.

## Exact durable goal set

The following exact objective was created with the durable goal tool in this Goal Authority task:

> By the verified OpenAI Build Week deadline of 2026-07-22 05:30 IST (2026-07-21 17:00 PT), ship and submit ModelShift — Proof after help as one public, no-login Next.js force-and-motion experience for a learner aged about 13–16: the learner commits a prediction, confidence, and free-form causal explanation; sees a provisional, evidence-grounded interpretation; predicts and runs the smallest compatible authored experiment; observes deterministic physics; receives only code-authorized authored support; reconstructs “zero net force means zero acceleration, not zero velocity”; then completes one single-submit near-transfer graph task with AI, hints, and replay absent and receives a truthful Before/Test/Support/Alone/Later evidence card. Deterministic TypeScript must own authored scenario parameters and correct answers, physics and graphs, probe compatibility, state transitions, help authorization/accounting, proof lock, scoring, and neutral fallback. GPT-5.6 Sol may only interpret language into a strict schema of authored hypothesis/probe/Level-1-question IDs, ordinal support, abstention, and verbatim evidence spans; every output must pass schema plus semantic/leakage validation, and timeout, refusal, ambiguity, invalidity, no key, or unavailable model must route to neutral_core_probe without blocking the journey. Completion requires both no-model and valid-model journeys; passing lint, typecheck, production build, physics/state/schema/semantic/leakage/fallback tests; at least 50 authored explanation fixtures with 100% post-validation enum/span/probe validity, zero rendered answer leakage, and at least 85% primary-category agreement on clear fixtures using live credentials; Playwright desktop 1440x900, mobile 390x844, keyboard, reduced-motion, no-console-error, timeout, and proof-lock paths; a server-only API secret; a public Vercel production URL verified in incognito; a licensed repository and README documenting Codex, GPT-5.6, tests, limitations, and pre-existing work; a truthful public YouTube demo with audio under three minutes; an English Devpost submission; and the principal thread’s /feedback session ID. Exclude every second concept, general chat, generated physics/hints/transfer, accounts, database, dashboards, social/gamified features, voice/camera/AR/sensors, Apps SDK, Sites, delayed-return infrastructure, and the optional post-submission model call. Kill optional work immediately if the deterministic loop, public deployment, recording/submission buffer, or safety boundary is at risk; stop and escalate rather than claim completion if live GPT-5.6 access, deployment access, repository/submission authority, or required evidence remains unavailable.

## Current-state evidence

### Repository and toolchain

- `education/` contains four governing Markdown files and four HTML reports; `preview.html` and `preview (1).html` are byte-identical copies of the ModelShift decision report.
- The project is not a Git repository. There are no commits, branches, worktrees, remotes, source files, tests, package files, environment examples, or deployment metadata.
- Local runtime: Node `v22.22.3`, npm `10.9.8`, pnpm `11.9.0`, Git `2.50.1`, Codex CLI `0.132.0`.
- GitHub CLI is authenticated as `RanaPriyansh`; no existing repository matching ModelShift, Build Week, or education was found.
- Playwright Chromium and headless Chromium are cached locally. Codex exposes durable-goal, thread/worktree coordination, browser/computer inspection, GitHub, Vercel, web research, image inspection, and local command/file tools.

### OpenAI and deployment

- The official model page confirms `gpt-5.6-sol` supports the Responses API and Structured Outputs. The free API tier does not support this model. Runtime access still requires a paid/eligible OpenAI API project and a successful live call. [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-sol)
- `OPENAI_API_KEY` is absent from the current shell, so account-specific `gpt-5.6-sol` access and live fixture reliability are unverified.
- The current npm registry resolves `openai@6.48.0` with Zod 3 or 4 support, and `zod@4.4.3`. Pin the installed versions in the lockfile and prove the exact structured-output call with one server-side smoke test before broad integration.
- Vercel CLI is not installed and `.vercel/project.json` is absent. The installed Vercel connector is authenticated and can list/deploy projects; it currently exposes only two unrelated projects and no ModelShift deployment.
- Vercel environment variables are encrypted at rest and apply only to new deployments. Production secrets must be configured server-side, and the public production domain must not be protected. [Vercel environment variables](https://vercel.com/docs/environment-variables), [Vercel deployment protection](https://vercel.com/docs/deployment-protection)
- The official OpenAI developer-docs MCP endpoint was added during this audit, but it is not callable until Codex reloads its tool registry. Official OpenAI web documentation was used as the current fallback.

### Official submission requirements

The official rules confirm the deadline, require a working project built with Codex and GPT-5.6, a public YouTube demo with audio under three minutes, a repository URL and README, a principal `/feedback` session ID, and free unrestricted judge access through the judging period. The four equally weighted criteria are technological implementation, design, potential impact, and quality of idea. [OpenAI Build Week official rules](https://openai.devpost.com/rules)

## Requirements lock

### Hard product requirements

1. **One learner and one concept.** The target learner is approximately 13–16, has encountered introductory force and motion, but treats continuing force as necessary for continuing motion. The only concept is: zero net force means zero acceleration, not zero velocity; friction is a force that can cause slowing.
2. **One linear transformation.** `HOOK → PREDICT → EXPLAIN → INTERPRET → PROBE_PREDICT → EXPERIMENT → REFLECT → RECONSTRUCT → COLD_TRANSFER → PROOF_RESULT` must be enforced by typed transitions, not component booleans.
3. **Three scenario families.** Mystery, discriminating experiment, and cold transfer are the three families. The authored probe contract retains all four IDs: `friction_contrast`, `brief_vs_continuous_force`, `zero_force_velocity_contrast`, and `neutral_core_probe`.
4. **Visible mental-model-to-experiment compilation.** The learner must see that a phrase from their explanation supports one or more provisional models and why the selected experiment distinguishes them. At least two non-neutral probes plus neutral fallback must be visibly runnable so identical predictions with different explanations can produce different valid tests.
5. **Deterministic physics.** One pure TypeScript 1-D, piecewise-constant-force engine precomputes force, acceleration, velocity, and position. The renderer consumes trajectory data and never integrates physics independently. Friction clamps at rest rather than reversing velocity.
6. **Bounded GPT-5.6 Sol role.** One server-side interpretation call returns only authored hypothesis, missing-distinction, probe, and Level-1-question IDs; ordinal support; abstention; short rationale; and verbatim evidence spans. It cannot generate physics, parameters, answers, hints, transfer tasks, scores, or stage permissions.
7. **Semantic validation after schema validation.** Validate every enum, 1–3 hypothesis count, span presence and length, internal consistency, hypothesis/probe compatibility, abstention, answer leakage, and request stage. Any failure selects `mixed_or_unclear` plus `neutral_core_probe` with authored copy.
8. **Governed assistance.** Level 0 is no conceptual help; Levels 1–3 are the three conceptual support levels. Code authorizes each level. GPT may recommend only an authored Level-1 question ID. Level-2 contrast and Level-3 principle content are authored. Use attempt-based unlocks; do not make a judge wait through an artificial timer.
9. **Proof mode is a technical boundary.** `COLD_TRANSFER` removes hint, replay, interpretation, and experiment controls; the reducer and server reject forbidden events/calls; no OpenAI request occurs before submission; the answer submits exactly once; “I do not know” remains valid.
10. **Truthful evidence, not a score.** The result is limited to Before, Test, Support, Alone, and Later. `Later` is “not tested yet.” Never claim mastery, far transfer, retention, diagnosis, learning gains, or a population effect.
11. **Fallback is a normal path.** Timeout target is six seconds. Missing credentials, network/API error, refusal, malformed or unsafe output, semantic invalidity, ambiguity, and incompatible probes all complete the full journey through neutral authored behavior; no fatal model screen is allowed.
12. **Privacy and minor-facing restraint.** No account or identity; no name, email, school, location, age record, long-term profile, ads, tracking, camera, or microphone. Do not log raw explanations. Keep the key server-side. Display 13+ and a short disclosure that AI interpretation can be wrong while deterministic code owns the physics.
13. **Runnable public submission.** A no-login production URL, repository with license, exact setup/test instructions, pre-existing-work boundary, under-three-minute public YouTube demo with audio, English Devpost entry, and principal `/feedback` session ID are completion requirements, not polish.

### Optional ideas and explicit cuts

The following are out of the critical path and should not be implemented before submission:

- optional post-transfer explanation-evidence model call;
- delayed return challenge, reminder, email, notification, scheduler, or retention claim;
- persistent learner profile or cross-session capability model;
- aggregate `ProofAfterHelp`/capability-gap score;
- ChatGPT Sites mirror or Apps SDK surface;
- shareable result image, custom logo, decorative hero, or secondary visual skin;
- voice, drawing, camera, sensors, AR/VR, physical mission, or location features;
- second subject, second concept, curriculum, prerequisite graph, teacher/parent dashboard, account, database, analytics identity, social layer, or gamification;
- open chat, model-authored tutoring prose, generated simulations, generated transfer items, or generated correct answers.

Minimal browser-local session recovery is permitted only if it is faster and safer than a clean restart. It is not required for the first submission.

## Material conflict resolutions

1. **Forge breadth vs. ModelShift scope:** `FINAL_PRODUCT_SPEC.md` wins. Multiple labs, five support levels, accounts, a database, reality missions, and delayed proof belong to the research roadmap, not this submission.
2. **Delayed evidence vs. immediate evidence:** Cold transfer is immediate near transfer. The result must say delayed retention is untested.
3. **Three levels vs. four states:** Treat Level 0 as the no-help baseline and Levels 1–3 as the three authored conceptual supports.
4. **Time-gated vs. attempt-gated support:** Use attempt/request gates. The later decision report explicitly rejects punitive waiting, and the demo cannot absorb a 20–30 second unlock delay.
5. **Four probe IDs vs. compressed build language:** Keep all four authored IDs, compatibility rules, parameters, and tests. Prioritize visual polish for `friction_contrast`; reuse the same engine/renderer for the other probes. Never cut the second genuinely distinct adaptive path or the neutral path, because that would collapse the invention into answer branching.
6. **High vs. medium adaptation threshold:** Follow the final specification: high or medium support may personalize only after all semantic checks and with no contradictory leading hypothesis. Low, ambiguous, contradictory, or invalid evidence uses neutral fallback.
7. **Second model call:** It is explicitly optional and is cut. The deterministic transfer choice is sufficient for the result.
8. **Model p95 target:** Enforce a six-second application deadline and record measured production latencies. Report sample size honestly; do not present a tiny smoke sample as a statistically robust p95.

## Architecture recommendation

### Runtime shape

Use a single Next.js App Router application with strict TypeScript and no database:

```text
app/
  page.tsx                         linear learner shell
  api/interpret/route.ts          one server-only GPT call
src/
  content/                         authored hypotheses, probes, hints, tasks, rubrics
  domain/physics/                  pure analytical engine and trajectory fixtures
  domain/learning/                 state, reducer, policy, scoring, evidence
  lib/ai/                          Zod schema, prompt, semantic validators, fallback
  components/                      stage UI, SVG world, graphs, proof, result
evals/                             >=50 explanation fixtures and runner
tests/                             browser, accessibility, failure, production smoke
docs/                              architecture, decisions, evals, prior work, deployment
```

Use pnpm because it is already installed. Keep dependencies limited to Next.js/React, TypeScript, Zod, the official OpenAI SDK, Vitest, Playwright, ESLint, and only the minimum accessibility test helper if manual/Playwright checks are insufficient. Do not add a state framework, UI kit, physics library, database client, agent framework, or analytics SDK.

### Deterministic core

- Represent scenarios as immutable authored data with content versions, assumptions, allowed predictions, correct option IDs, probe compatibility, accessibility descriptions, and analytical force segments.
- Sample each force segment analytically using `a = F_net / m`, `v = v0 + at`, and `x = x0 + v0t + 0.5at²`. Handle stopping time inside friction segments so velocity cannot cross through zero.
- Keep one typed `LearningState` union and one event reducer. Invalid transitions return a typed rejection and do not mutate evidence.
- Derive the result card only from committed events. Support is recorded once at the moment content is consumed, not when a control is displayed.

### GPT boundary

- Use `process.env.OPENAI_MODEL ?? "gpt-5.6-sol"` in the server route and the Responses API with strict `text.format` JSON schema or the current SDK's `responses.parse` plus `zodTextFormat` helper.
- Pin the official OpenAI SDK and Zod versions together, smoke-test the generated object schema, then parse the result again with Zod. Schema compliance does not replace semantic validation.
- Delimit learner text as untrusted data. The prompt must classify only; embedded requests never widen permissions.
- Use a six-second abort deadline, bounded input (600 characters), bounded output, no tools, no web search, no streaming dependency, and one retry at most only if it fits inside the same total deadline. Prefer zero retries and immediate neutral fallback under this deadline.
- Return an explicit `source: "model" | "fallback"` and a bounded fallback reason for judge/debug visibility. Never return raw model output or a stack trace to the browser.

### Interface

- Open directly on the mystery. The main visual grammar is world → evidence → proof, never chat bubbles or a dashboard.
- Preserve prediction before explanation and probe prediction before animation.
- Make force and velocity visually distinct, show force disappearance at cutoff, and pair motion with a velocity-time graph and text alternative.
- Make “AI assistance is now off” unmistakable in proof mode, but do not make it punitive.
- Optimize the complete judge path for three to five minutes and the recording path for 2:52–2:55.

## Executable acceptance criteria

The principal thread should not claim completion until it has command or browser evidence for every applicable item.

### Product behavior

- A first-time user can complete the entire journey with `OPENAI_API_KEY` absent.
- A validated live `gpt-5.6-sol` result changes probe selection for at least one clear explanation.
- Two fixtures with the same prediction but different reasons select different compatible non-neutral probes.
- Ambiguous, irrelevant, adversarial, timed-out, refused, malformed, incompatible, and missing-key inputs all reach the neutral experiment and final result.
- The four probe IDs resolve to authored, deterministic, test-covered configurations.
- The recording fixture selects `continuous_force_required` and normally `friction_contrast`, or honestly falls back without breaking the journey.
- The mystery is understandable in under ten seconds; the full judge path is completable in under five minutes.

### Required commands

The repository must expose and pass equivalent scripts, preferably:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
pnpm build
pnpm test:e2e
pnpm test:e2e:prod
```

### Deterministic tests

- zero net force preserves velocity;
- equal opposing forces produce zero acceleration;
- acceleration scales with force and inversely with mass;
- friction slows and clamps without reversal;
- segment position and velocity remain continuous;
- repeated input produces identical trajectories;
- renderer/frame rate cannot change physical outcomes;
- all authored trajectories stay within configured bounds.

### State and security tests

- every invalid event is rejected from every state;
- prediction/confidence, probe prediction, observation, and reconstruction gates cannot be skipped;
- support authorization and accounting cannot be widened or duplicated by model output;
- proof mode rejects hint, replay, interpretation, and resubmit events in reducer and route guards;
- no pre-submit proof request reaches OpenAI;
- transfer submits once;
- fallback completes the flow;
- no client bundle or `NEXT_PUBLIC_*` variable contains the API key;
- same-origin/content-type and input-size checks protect the API route.

### Model evaluation

- At least 50 versioned fixtures cover every hypothesis, correct informal explanations, same-answer/different-reason cases, negation, double negation, mixed reasoning, nonsense, short text, spelling variation, prompt injection, and answer requests.
- Normal live outputs achieve 100% parse success or explicit fallback; accepted outputs have 100% enum, evidence-span, and probe validity; learner-facing answer leakage is zero.
- Clear-fixture primary-category agreement is at least 85%; ambiguous fixtures abstain or become neutral.
- A simple keyword/rule baseline runs on the same fixtures. If GPT-5.6 does not materially improve safe valid probe selection on paraphrase, negation, mixed reasoning, and evidence extraction, narrow the novelty claim and default more cases to neutral.
- Evaluation reports software/model behavior only, never educational efficacy.

### Rendered and public verification

- Playwright passes at 1440×900 and 390×844, with keyboard-only completion, visible focus, reduced motion, text alternatives, stage announcements, no horizontal overflow, and no console errors.
- The live-model path, no-key/fallback path, forced timeout, and proof-lock path pass in production.
- The production URL is publicly accessible without authentication or Vercel protection in an incognito session and from a second network/device where available.
- The production build commit matches the documented repository commit.

### Submission evidence

- README contains the live URL, video URL, repository URL, build commit, judge path, GPT/deterministic boundaries, setup, exact test/eval results, fallback, privacy/accessibility, limitations, Codex story, pre-existing-work distinction, license/assets, and principal `/feedback` session ID.
- The demo is public on YouTube, contains audio, is under three minutes, uses the real production app, and visibly shows the committed wrong model, evidence-grounded interpretation, chosen experiment, deterministic outcome, assistance removal, transfer, result, tests, and Codex contribution.
- Devpost is submitted in English before the official deadline and the confirmation is preserved.

## Highest-risk assumptions

| Risk assumption | Evidence status | Required response |
|---|---|---|
| A blank directory can become a coherent, tested, deployed submission in 274 minutes | Very high risk; no implementation exists | Time-box every gate; use one engine, one reducer, one page, one model route; freeze early |
| The account can call `gpt-5.6-sol` | Unverified; no API key in shell and model has no free tier | Obtain a server-side key and run a minimal structured-output call immediately |
| GPT-5.6 adds value beyond a small rule classifier | Unproven for this authored domain | Run the same 50 fixtures against both; neutralize uncertain cases; narrow claims if it does not win |
| The explanation changes a genuinely discriminating experiment rather than only copy | Plausible but implementation-dependent | Make two same-prediction/different-reason paths visibly select different probes |
| One near-transfer item is meaningful evidence | It is only immediate task evidence, not efficacy | Use a descriptive evidence trail and keep `Later: not tested yet` |
| Vercel can deploy the new app quickly and publicly | Connector auth works, but no project or CLI link exists | Deploy early; test the production domain and protection settings before polish |
| A minor-facing public prototype is safe enough with minimal data | Product guidance exists; no legal/privacy review has occurred | Keep 13+, no identity/storage, no open chat/tools, authored content, clear limitation notice |
| The user can complete Devpost, YouTube, and account-owned submission steps on time | Not inspectable from this task | Principal must surface these dependencies immediately and preserve a recording/submission buffer |

## Unresolved blockers

1. **OpenAI runtime credential and entitlement:** no `OPENAI_API_KEY` is available in this shell, and live `gpt-5.6-sol` access has not been proven. This blocks truthful valid-model evaluation and final Build Week readiness, though not deterministic implementation.
2. **Repository:** the folder is not initialized; no GitHub repository, license, history, or Build Week implementation commits exist.
3. **Deployment:** no ModelShift Vercel project/deployment exists. The connector is authenticated, but environment variables and public protection state remain unset.
4. **Submission surfaces:** Devpost registration/draft status, YouTube channel/upload readiness, and the entrant's authority to submit are unknown.
5. **Evidence:** no physics tests, model fixtures, keyword baseline, browser runs, accessibility checks, fresh-user observations, or production smoke evidence exists.
6. **External review:** no physics educator, child-safety reviewer, or representative learner has reviewed the implementation because there is no implementation. Do not imply otherwise.
7. **Official docs connector:** the OpenAI developer-docs MCP was installed but requires a Codex tool-registry reload. This is not a critical-path blocker because current official pages are reachable directly.

## Non-negotiable boundaries and kill switches

Never cut:

- committed prediction before explanation;
- deterministic physics and objective scoring;
- typed transition guards and support accounting;
- neutral fallback that completes the full journey;
- visible explanation-to-experiment connection;
- assistance-free, single-submit cold transfer;
- truthful evidence card;
- public no-login deployment, demo, repository, and submission evidence.

Compressed absolute gates from the evidence snapshot:

| Absolute time (IST) | Required state | Kill switch if missed |
|---|---|---|
| 01:15 | Git/package skeleton, frozen enums/types, API-key escalation, Vercel path confirmed | No optional design work; continue deterministic core while credential owner resolves key |
| 02:20 | Complete no-model mystery → neutral experiment → reconstruction → proof → result; physics/state tests green | Replace live integration with analytical precomputed trajectories; simplify controls/copy; preserve proof |
| 03:05 | Strict GPT route, semantic validators, fixtures/baseline, adaptive path, first public preview | Personalize only fully valid high/medium cases; remove all model-authored display prose; never remove real GPT use from the submission requirement |
| 03:50 | Production deployment, core unit/eval/E2E evidence, mobile/desktop/keyboard/reduced-motion pass | Stop all polish and documentation embellishment; repair deployment and critical path only |
| 04:10 | Feature/code freeze; README and demo fixture stable | Start recording; no new features or refactors |
| 04:55 | Public YouTube video and final URLs verified | Use the cleanest valid take; do not hide or fake model behavior |
| 05:15 | Devpost submitted and confirmation preserved | Fifteen-minute emergency buffer only; no product changes |

If a hard external blocker persists, report it plainly. A deterministic fallback is a reliability requirement, not permission to claim the required GPT-5.6 integration was verified when it was not.

## Recommended integration order

1. **Principal root and contracts:** initialize Git at `education/`, add `AGENTS.md`, package/lock/config, shared enums, scenario IDs, state/event types, and environment example. The principal thread owns these files.
2. **Physics plus authored content:** implement one analytical engine and all scenario/probe data with invariants. No UI or model dependency.
3. **Learning reducer and policy:** implement legal transitions, assistance authorization/accounting, neutral fallback event, proof lock, single submission, and evidence derivation.
4. **Complete deterministic UI:** connect mystery, explanation, neutral probe, experiment, reconstruction, proof, and result. Prove the whole journey before adding GPT.
5. **First deployment:** publish the deterministic experience immediately so hosting and public-access defects surface early.
6. **GPT contract and eval harness:** add the strict schema, one server route, semantic/leakage validators, 50 fixtures, keyword baseline, timeout, and fallback. Do not let the route alter shared physics/state contracts.
7. **Adaptive integration:** allow only validated probe/question IDs to affect the reducer; show provisional evidence and discriminating purpose with authored learner-facing copy.
8. **Rendered QA:** run desktop/mobile/keyboard/reduced-motion/failure/proof-lock paths, inspect console and network, and fix only comprehension, correctness, accessibility, and reliability defects.
9. **Production and evidence package:** configure server secrets, verify incognito access, freeze the commit, complete README/required docs/license, and record exact test results.
10. **Demo and submission:** rehearse the exact fixture on production, record and upload under three minutes, verify every URL logged out, invoke `/feedback` in the principal thread, submit Devpost, and preserve confirmation.

No feature implementation belongs to this Goal Authority task. The principal thread must reconcile this document before changing shared contracts or integrating parallel work.
