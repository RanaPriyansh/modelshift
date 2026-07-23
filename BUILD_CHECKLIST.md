# ModelShift — Build Checklist

> **RETIRED HISTORICAL ARTIFACT — 2026-07-23.** This deadline and submission checklist no longer governs FORGE. Demo video, YouTube, Devpost, judging, and hackathon-scoped exclusions are not active work. The real-product implementation board is [`docs/program/V1_EXECUTION_BOARD.md`](docs/program/V1_EXECUTION_BOARD.md); broad FORGE claims remain constrained by the product specification and delivery gates.

**Submission deadline:** July 21, 2026 at 5:00 p.m. Pacific / July 22, 2026 at 5:30 a.m. IST  
**Research cut-off used for this plan:** July 20, 2026 at approximately 5:02 a.m. IST  
**Time available at cut-off:** approximately 48.5 hours  
**Primary path:** Codex → GitHub → Vercel → public judge test → YouTube → Devpost

## Decision lock

- [ ] Product name is **ModelShift**; subtitle is **Proof after help**.
- [ ] Product is one force-and-motion learning loop, not a platform.
- [ ] Primary primitive is mental-model-to-experiment compilation.
- [ ] Supporting primitives are deterministic help control and assistance-free transfer proof.
- [ ] No second concept enters scope.
- [ ] `FINAL_PRODUCT_SPEC.md` is committed before implementation begins.
- [ ] Pre-existing research is separated from Build Week implementation in `docs/PREEXISTING_WORK.md`.

## Must build

- [ ] Mystery freezes at the moment a short force ends.
- [ ] Learner commits prediction and confidence.
- [ ] Learner supplies a short free-form causal explanation or chooses “I genuinely don't know.”
- [ ] GPT-5.6 returns a strict structured interpretation from authored enums.
- [ ] Server validates evidence spans, enum values, and probe compatibility.
- [ ] Uncertain, invalid, refused, or timed-out output selects the neutral probe.
- [ ] Deterministic SVG simulation runs authored physics.
- [ ] State machine controls all learning stages and permissions.
- [ ] Three-level authored assistance ladder works.
- [ ] Learner reconstructs the causal rule.
- [ ] Proof mode visibly removes assistance.
- [ ] Cold transfer uses a new context/representation and submits once.
- [ ] Prediction correctness is deterministic.
- [ ] Result card shows Before, Test, Support, Alone, and optional Later.
- [ ] Full product works with the OpenAI client forced to fail.
- [ ] Public deployment requires no account or login.

## Forbidden scope

- [ ] No general chat.
- [ ] No broad tutor personality.
- [ ] No second lesson, subject, or curriculum.
- [ ] No accounts, database, email, profiles, or teacher dashboard.
- [ ] No social features, streaks, badges, points, or leaderboards.
- [ ] No generated physics, simulations, numerical outcomes, or transfer questions.
- [ ] No model-authored Level-2 or Level-3 hints.
- [ ] No voice, camera, AR, sensors, physical mission, or mobile app.
- [ ] No Apps SDK version before submission.
- [ ] No ChatGPT Sites work before Vercel production is stable.
- [ ] No feature work after recording freeze.

# Timeline and gates

## T+0 to T+2 hours — Preflight and contracts

### Principal Codex thread

- [ ] Create or verify Git repository.
- [ ] Read all governing files.
- [ ] Run `/init` or create root `AGENTS.md`.
- [ ] Record package manager and Node version.
- [ ] Confirm OpenAI API key and `gpt-5.6-sol` access with a minimal server-side call.
- [ ] Confirm Vercel account, CLI, and ability to create a public project.
- [ ] Create `docs/ARCHITECTURE.md`.
- [ ] Freeze shared types, authored enums, probe IDs, and state names.
- [ ] Create initial commit with timestamp inside the submission period.

### Physics thread

- [ ] Create physics types and analytical segment engine.
- [ ] Add first zero-net-force invariant test.

### Gate 1

Proceed only when:

- [ ] repository and instructions exist;
- [ ] model/API preflight succeeds or a documented credential blocker exists;
- [ ] Vercel preflight succeeds;
- [ ] first invariant test passes;
- [ ] no one is editing shared files in conflicting worktrees.

## T+2 to T+6 hours — Complete no-AI product loop

- [ ] Implement all physics invariants.
- [ ] Implement authored mystery, neutral experiment, and cold transfer.
- [ ] Implement typed state reducer and invalid-transition tests.
- [ ] Build basic linear UI.
- [ ] Capture prediction, confidence, explanation, probe prediction, reconstruction, and transfer.
- [ ] Implement assistance-free proof-mode guards.
- [ ] Implement result evidence card.
- [ ] Stub interpretation to neutral probe.
- [ ] Run full no-AI journey manually and in one Playwright test.

### Gate 2 — Non-negotiable

By T+6, a user must be able to complete the entire learning loop without GPT.

- [ ] If the simulation is unstable, replace live integration with precomputed analytical trajectory samples.
- [ ] If controls are confusing, reduce them to friction on/off and run/reset.
- [ ] If the probe library is incomplete, keep `friction_contrast` plus `neutral_core_probe` and defer the third adaptive branch.
- [ ] Do not begin model integration until this gate passes.

## T+6 to T+12 hours — GPT-5.6 and adaptive selection

### Model-integration thread

- [ ] Implement strict Zod interpretation schema.
- [ ] Call Responses API through a server route.
- [ ] Validate evidence spans and enums.
- [ ] Add timeout, refusal, malformed-output, and API-error fallbacks.
- [ ] Create at least 50 explanation fixtures.
- [ ] Add adversarial prompt-injection and answer-request fixtures.
- [ ] Add eval command and report.

### Principal thread

- [ ] Integrate validated probe selection into the state machine.
- [ ] Add calm uncertainty copy.
- [ ] Add optional judge-facing “How this test was chosen” panel.
- [ ] Ensure arbitrary model prose is never rendered as a hint.
- [ ] Add stubbed adaptive E2E path.
- [ ] Create first Vercel preview.

### Gate 3

- [ ] 100% schema parse in normal test runs.
- [ ] 100% enum validity.
- [ ] No illegal probe IDs.
- [ ] No answer leakage in learner-facing support.
- [ ] Clear-fixture primary-category agreement at or above 85%.
- [ ] Ambiguous inputs abstain or choose neutral probe.
- [ ] Full product continues after model timeout.
- [ ] Preview URL opens from an incognito browser.

If this gate fails:

- [ ] force neutral probe for all low/medium-confidence cases;
- [ ] remove all model-authored learner copy;
- [ ] keep the structured interpretation visible only as an uncertain judge/developer lens;
- [ ] do not add a second model call until the first is reliable.

## T+12 to T+18 hours — Product design and accessibility

### Frontend thread after contracts are frozen

- [ ] Mystery understood without narration.
- [ ] Force arrow disappears at force cutoff.
- [ ] Velocity remains visually distinct from force.
- [ ] Side-by-side friction contrast is legible.
- [ ] Velocity-time graph updates correctly.
- [ ] Proof mode has a distinct quiet visual state.
- [ ] No chat-like layout dominates the screen.
- [ ] One primary action per stage.
- [ ] Mobile layout at 390×844.
- [ ] Desktop layout at 1440×900.
- [ ] Keyboard path and visible focus.
- [ ] Reduced-motion behavior.
- [ ] Text alternative for animation and graph.
- [ ] Screen-reader announcements for stage changes.

### Principal thread

- [ ] Merge simulation and frontend in order.
- [ ] Run `/review` against the base branch.
- [ ] Resolve high-severity findings.
- [ ] Check browser console and network failures.

## T+18 to T+24 hours — Production, QA, and documentation

- [ ] Configure `OPENAI_API_KEY` server-side on Vercel.
- [ ] Configure `OPENAI_MODEL=gpt-5.6-sol` if needed.
- [ ] Verify no secret in browser bundles or `NEXT_PUBLIC_*` variables.
- [ ] Deploy production.
- [ ] Disable deployment protection for public judging.
- [ ] Run live smoke journey from incognito and a second device/network.
- [ ] Run model failure journey.
- [ ] Run all unit, invariant, contract, eval, and E2E commands.
- [ ] Complete `README.md`.
- [ ] Complete `docs/CODEX_AND_GPT_USAGE.md`.
- [ ] Complete `docs/EVALUATION.md`.
- [ ] Complete `docs/PREEXISTING_WORK.md`.
- [ ] Add MIT license or another appropriate explicit license.
- [ ] Use only original or correctly licensed assets.
- [ ] Draft Devpost submission.

### Gate 4

No optional feature may begin until all are true:

- [ ] public URL works without login;
- [ ] production build passes;
- [ ] automated tests pass;
- [ ] fallback path works;
- [ ] judge can complete the loop in under five minutes;
- [ ] README gives exact test instructions;
- [ ] repository and deployment are linked;
- [ ] demo script is final.

## T+24 to T+32 hours — Harden and rehearse

- [ ] Give the public URL to at least three fresh testers.
- [ ] Observe without explaining for the first minute.
- [ ] Fix only comprehension, reliability, accessibility, or severe visual issues.
- [ ] Confirm the judge-facing AI interpretation is understandable but not clinical.
- [ ] Confirm same prediction/different explanation can select different probes.
- [ ] Confirm proof mode has no hidden hint route.
- [ ] Confirm the result card avoids inflated mastery language.
- [ ] Rehearse exact demo interactions with a stable example explanation.
- [ ] Capture clean test output and brief repository footage.
- [ ] Prepare a production backup URL or Sites preflight only if Vercel is already stable.

## T+32 to T+40 hours — Record and upload

- [ ] Freeze feature code.
- [ ] Record at 1080p with large cursor and readable zoom.
- [ ] Use live GPT-5.6 if stable; do not pretend a fixture is live.
- [ ] Keep final video under 2:58.
- [ ] Narration explicitly says how GPT-5.6 is used.
- [ ] Narration explicitly says what Codex built.
- [ ] Do not include copyrighted music or third-party trademarks without permission.
- [ ] Upload publicly visible YouTube video.
- [ ] Test video from logged-out browser.
- [ ] Add video URL to README and Devpost draft.

## T+40 to T+45 hours — Submit with buffer

Target submission by approximately **July 22 at 1:30 a.m. IST**, leaving roughly four hours before the hard deadline.

- [ ] Final production smoke test.
- [ ] Final repository clean-install check.
- [ ] Confirm public repo and license, or share private repo with both required judging addresses.
- [ ] Confirm setup instructions and sample fixtures.
- [ ] Confirm live app stays free and unrestricted through judging; keep it online through at least August 12 to cover source-date discrepancies safely.
- [ ] In the principal Codex thread, run `/feedback` and copy the session ID.
- [ ] Put the principal session ID in README and Devpost.
- [ ] Submit Devpost entry.
- [ ] Screenshot confirmation page.
- [ ] Reopen every submitted link from the confirmation page.

# Worktree ownership and merge order

## Principal thread / local main

Owns:

- `AGENTS.md`;
- package and root configuration;
- shared types and authored enums;
- `src/domain/learning/**`;
- integration;
- final tests;
- documentation;
- deployment;
- final `/feedback` session.

## Simulation worktree

Owns only:

- `src/domain/physics/**`;
- deterministic scenario generation;
- physics tests;
- trajectory text alternatives.

## Model-integration worktree

Owns only:

- `src/lib/ai/**`;
- `app/api/**`;
- `evals/**`;
- AI contract tests.

## Frontend worktree

Starts after contracts freeze and owns only:

- `src/components/**`;
- page presentation and styles;
- accessibility behavior.

## QA review

- [ ] Use a detached reviewer or `/review` after integration.
- [ ] QA may add tests but does not perform broad refactors.

## Merge order

- [ ] Contracts and skeleton on main.
- [ ] Simulation branch.
- [ ] Learning reducer/policy on main.
- [ ] Frontend branch.
- [ ] Model branch.
- [ ] Full integration.
- [ ] QA tests/findings.
- [ ] Deployment and docs.

# Test checklist

## Physics

- [ ] Zero force preserves velocity.
- [ ] Opposing equal forces cancel.
- [ ] Force/acceleration proportionality.
- [ ] Mass/acceleration inverse relationship.
- [ ] Friction slows without reversal.
- [ ] Segment continuity.
- [ ] Deterministic repeated trajectories.
- [ ] Frame-rate independence.

## State and policy

- [ ] Cannot skip initial prediction.
- [ ] Cannot run probe before probe prediction.
- [ ] Cannot enter transfer before reconstruction.
- [ ] Hint events rejected in proof mode.
- [ ] Server hint task rejected in proof mode.
- [ ] Transfer submits once.
- [ ] Support load recorded once.
- [ ] Model failure selects neutral probe.

## GPT boundary

- [ ] Strict schema.
- [ ] Evidence spans verified.
- [ ] Enum-only action space.
- [ ] Prompt injection fixtures.
- [ ] Negation fixtures.
- [ ] Same answer/different explanation fixtures.
- [ ] Refusal handling.
- [ ] Timeout handling.
- [ ] Invalid-output handling.
- [ ] Zero learner-facing answer leakage.

## Interface

- [ ] No horizontal overflow.
- [ ] Keyboard-only completion.
- [ ] Visible focus.
- [ ] Reduced motion.
- [ ] Text alternative.
- [ ] Mobile viewport.
- [ ] Desktop viewport.
- [ ] Incognito public access.
- [ ] Console clean.

# Kill switches

- [ ] **At six hours:** if no-AI loop is incomplete, simplify simulation and reduce adaptive branches.
- [ ] **At twelve hours:** if model mapping is unreliable, force neutral fallback and remove generated wording.
- [ ] **At eighteen hours:** if branches conflict, stop parallel work and integrate on main.
- [ ] **At twenty-four hours:** if production is not public, stop all visual polish and fix deployment.
- [ ] **Eight hours before deadline:** freeze code and record even if stretch features are absent.
- [ ] If the result looks like a score, replace it with evidence statements.
- [ ] If the flow exceeds six minutes, remove optional copy/panels—not the transfer proof.
- [ ] If Sites preflight creates friction, abandon it immediately; Vercel remains primary.

# Stretch features in order

Only after Gate 4:

1. [ ] Second explanation path showing a different probe for the same prediction.
2. [ ] Local-only delayed return challenge timestamp.
3. [ ] Post-submission explanation-evidence call.
4. [ ] Shareable anonymized result image generated locally.
5. [ ] Optional ChatGPT Sites deployment from the same repository.

# Final submission checklist

- [ ] Product name and tagline consistent everywhere.
- [ ] Category set to Education.
- [ ] Description claims only what the build demonstrates.
- [ ] Public app link.
- [ ] Public YouTube video under three minutes.
- [ ] Repository link and license.
- [ ] README setup, sample data, Codex/GPT use, test instructions.
- [ ] Principal `/feedback` session ID.
- [ ] No copyrighted music or unauthorized media.
- [ ] App free and unrestricted for judges.
- [ ] All links tested while logged out.

## Final instruction

**Build ModelShift. Do not build the broader Forge platform. The first proof that matters is the complete, reliable path from “motion needs force” to the correct discriminating experiment to an assistance-free transfer answer.**
