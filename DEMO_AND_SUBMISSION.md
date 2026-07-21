# ModelShift — Demo and Submission Package

**Track:** OpenAI Build Week — Education  
**Decision:** REFRAME Forge into ModelShift  
**Working subtitle:** Proof after help  
**Submission deadline:** July 21, 2026 at 5:00 p.m. Pacific / July 22, 2026 at 5:30 a.m. IST  
**Primary deployment:** Public Vercel URL with no login  
**Required demo:** Public YouTube video, with audio, shorter than three minutes

## Current execution status — 2026-07-22 01:56 IST

```text
Live app: https://modelshift.vercel.app
Immutable deployment: https://modelshift-pjs4krelq-ranapriyanshs-projects.vercel.app
Repository: https://github.com/RanaPriyansh/modelshift
Tested source release: 350ed2ca44cc4c9565def562842f19373f637968
Runtime mode: fallback-only; OPENAI_API_KEY absent; live GPT-5.6 evaluation NOT RUN
Production E2E: 6 passed, 4 intentional duplicate-project skips, 0 failed
Demo video: NOT RECORDED OR PUBLISHED
Primary Codex /feedback session ID: NOT INVOKED OR RECORDED
Devpost submission: NOT COMPLETED
```

The public product and repository are complete. The remaining items require a live OpenAI API credential and account-owned actions. Do not use the live-path narration below until `pnpm eval:live` passes and a real production response is verified; if credentials remain unavailable, record the fallback path and state that limitation explicitly rather than presenting a fixture or stub as live GPT output.

## 1. Submission identity

### Product name

**ModelShift**

Use **ModelShift Lab** only if an avoidable naming collision appears during submission. Do not spend implementation time on further naming.

### Product-facing subtitle

**Proof after help**

### Devpost tagline

> **Turn a learner's explanation into the experiment that tests it—then remove AI and ask for proof.**

### Education-track category description

> ModelShift is an AI-native learning lab that interprets a student's causal explanation, selects a deterministic experiment that distinguishes the plausible mental models, and then removes assistance for an unfamiliar transfer task.

### One-sentence judge takeaway

> **Most AI tutors show what a learner can do with AI; ModelShift tests what remains when the AI leaves.**

### Final spoken line

> **The AI succeeds when the learner no longer needs it.**

## 2. Claims discipline

### What the working product demonstrates

- A learner commits to a prediction before assistance.
- GPT-5.6 converts a free-form explanation into uncertain, structured mental-model hypotheses drawn from an authored set.
- The system selects an authored experiment in which those hypotheses make different predictions.
- Deterministic code owns every physical outcome and correctness check.
- A state machine restricts assistance and disables it in proof mode.
- The learner then completes an unfamiliar near-transfer problem without hints.
- The product presents evidence about what changed without claiming comprehensive mastery.

### What the submission must not claim

Do not say that the prototype:

- has proven long-term retention;
- closes the capability gap for all learners;
- proves that AI tutoring generally harms learning;
- diagnoses a child or infers a mental model with certainty;
- demonstrates far transfer;
- replaces teachers, curricula, PhET, Brilliant, Khan Academy, or laboratories;
- has been validated in a randomized study;
- has reinvented education.

Use this sentence when needed:

> The prototype demonstrates the mechanism end to end. A controlled learner study would still be required to establish whether it improves retention or transfer relative to a strong fixed lesson.

## 3. Three-minute demonstration

### Recording target

**Target final duration: 2 minutes 52 seconds.**  
Never upload a video at 2:59. Leave margin for platform timing and edits.

Use a pre-validated demonstration fixture, but run the actual product. Do not fake an API result, a transfer score, a deployment, or a delayed outcome.

### Exact timeline and narration

| Time | Screen and learner action | Narration |
|---|---|---|
| **0:00–0:07** | Open directly on the mystery. A spacecraft receives a brief thrust. The force arrow disappears and the scene freezes. No title animation. | “The engine is off. What happens next?” |
| **0:07–0:18** | Select **gradually slows**, set confidence to **80%**, and submit. | “A student can remember Newton's first law and still believe motion needs a continuing force.” |
| **0:18–0:31** | Type: “It should slow down because the engine is no longer pushing it.” Submit. | “ModelShift does not begin by explaining. It first asks for the causal model behind the answer.” |
| **0:31–0:47** | Show the compact “How this test was chosen” lens. It highlights the exact evidence span and displays two possible models: continuing force is required; hidden resistance may be assumed. Then show the selected probe: friction versus no friction. | “GPT-5.6 interprets the student's language as uncertain evidence. It may choose only from validated model and experiment IDs. It cannot calculate the physics, invent a lesson, or give the answer.” |
| **0:47–1:10** | Run two side-by-side pucks after the same short push. One coasts; one slows under friction. Show force and velocity arrows plus the velocity-time traces. Change friction once and rerun. | “Codex built the deterministic world. The same tested engine computes both cases: force changes velocity; friction explains the slowing case.” |
| **1:10–1:24** | A single Level-1 prompt appears: “What is present in the slowing case that is absent in the coasting case?” Enter a short response. | “The assistance governor authorizes the smallest useful question. The language model cannot unlock a stronger hint.” |
| **1:24–1:39** | Reconstruction screen. Enter: “When net force is zero, acceleration is zero. A moving object keeps the same velocity; friction changes it.” | “The learner reconstructs the rule rather than receiving a polished answer to copy.” |
| **1:39–1:45** | Transition to a quiet dark-on-light proof screen. Visible banner: **AI assistance is now off**. Chat/help controls are absent. | “Now the AI leaves.” |
| **1:45–2:11** | Show a visually different cargo pod with a force-time graph. Choose the correct velocity-time graph and add a one-sentence explanation. Submit once. | “The context and representation change. There are no hints, no replay, and no model call before submission.” |
| **2:11–2:29** | Result evidence card animates in: **Before — expected slowing**; **Test — separated friction from force-free motion**; **Support — one attention cue**; **Alone — transferred correctly**; **Later — not yet tested**. | “This is not a mastery score. It is an evidence trail: the starting model, the test, the help consumed, and what the learner could then do alone.” |
| **2:29–2:44** | Rapid split-screen: invariant tests, state-machine tests, strict schema/eval fixtures, API-failure E2E run, responsive UI, and the principal Codex thread. | “Codex designed and implemented the simulation, learning state machine, strict GPT-5.6 schema, adversarial evaluations, fallbacks, accessibility checks, and public deployment.” |
| **2:44–2:52** | Return to product result. Product name and public URL appear. | “Most AI tutors show what a learner can do with AI. ModelShift tests what remains when the AI leaves. The AI succeeds when the learner no longer needs it.” |

### What must be visible without narration

A judge watching on mute should still see:

1. the committed wrong prediction;
2. the student's causal explanation;
3. evidence-grounded GPT-5.6 interpretation;
4. a different experiment selected because of that explanation;
5. deterministic simulation and graphs;
6. assistance being removed;
7. an unfamiliar transfer task;
8. the evidence card;
9. tests and Codex work.

### Recording fixture

Use this exact explanation unless the model evaluation shows a more reliable natural alternative:

> It should slow down because the engine is no longer pushing it.

Expected validated interpretation:

- primary hypothesis: `continuous_force_required`;
- secondary possibility: `implicit_resistance`;
- evidence span copied from learner text;
- selected probe: `friction_contrast`;
- authorized question ID: `what_differs_between_cases`;
- no learner-facing numeric confidence.

The app must still behave safely if the result differs. Record only after the production model and fallback are both tested.

## 4. Recording procedure

### Before recording

- Freeze production code.
- Test the exact fixture against production at least five times.
- Confirm the fallback journey also works.
- Clear browser extensions, notifications, bookmarks bar, personal profile image, and unrelated tabs.
- Use a clean browser profile at 1440×900 or 1512×982.
- Set browser zoom to 100%.
- Confirm cursor visibility and readable UI text in the recorded resolution.
- Use the production URL, not localhost.
- Preload the page once, then start a fresh session.
- Record voice separately only if synchronization is reliable; otherwise narrate live from the final script.
- Use no copyrighted music, third-party logos, or unlicensed assets.

### Capture plan

Record three complete takes before editing:

1. a normal live production run;
2. a second normal run for replacement clips;
3. an offline/model-fallback run for documentation, not necessarily the main demo.

Capture a separate 10–15 second repository/test montage. Do not rush terminal text past readability. Show test names that communicate the architecture:

- `zero net force preserves velocity`;
- `proof mode rejects hint events`;
- `invalid probe IDs fall back to neutral`;
- `model timeout does not block journey`;
- `cold transfer submits only once`.

### Edit rules

- Product appears in the first frame.
- No education history or research preamble.
- No splash animation longer than one second.
- Prefer hard cuts and short crossfades.
- Use captions for every spoken sentence.
- Accelerate only waiting/typing, never the conceptual outcome.
- Do not hide model latency with an edit that implies an instantaneous live response; a short “interpreting your explanation” state is honest.
- Keep the final uploaded file below 2:55.
- Watch the uploaded YouTube version from start to finish before submission.

## 5. Devpost copy

### Problem statement

AI can make schoolwork easier without necessarily producing equivalent independent learning. A 2025 field experiment with nearly 1,000 high-school mathematics students found that an unrestricted GPT interface improved assisted practice performance but reduced subsequent unaided exam performance, while teacher-designed safeguards largely mitigated that harm. The result is important but narrow: it does not mean all AI tutoring harms learning. It shows that product design must distinguish completed performance from capability that remains when assistance is removed.

Most learning products separately offer explanations, hints, simulations, or assessments. They rarely turn the learner's own causal explanation into the experiment that tests it and then make assistance-free transfer the visible completion condition.

### Solution description

ModelShift is a focused learning lab for one introductory physics idea: zero net force means zero acceleration, not zero velocity.

The learner first predicts what happens after a spacecraft's engine switches off and explains why. GPT-5.6 maps that free-form explanation onto an authored set of plausible mental models, quotes the supporting evidence, states uncertainty, and recommends a validated discriminating experiment. A deterministic physics engine then lets the learner compare force-free coasting with frictional slowing. A code-controlled assistance governor permits only the minimum authored support. Finally, all assistance disappears and the learner solves a structurally related problem in a new representation.

The result is not a broad mastery score. It is a compact evidence trail showing the starting model, the experiment that tested it, the support used, and what the learner could then do alone.

### Technical description

ModelShift is a Next.js and TypeScript web application built with Codex and deployed publicly on Vercel.

- **GPT-5.6** interprets natural-language causal explanations through the Responses API using strict Structured Outputs. It may return only authored hypothesis, missing-distinction, probe, and question IDs, together with evidence spans and an abstention state.
- **Deterministic physics code** owns force schedules, acceleration, velocity, position, scenario parameters, numerical outcomes, and primary answer checking.
- **A typed learning state machine** owns stage transitions, support permissions, hint ceilings, proof mode, and evidence capture.
- **An assistance governor** uses authored support levels; model output may select an allowed Level-1 question but cannot authorize or write stronger help.
- **Fallback behavior** routes invalid, ambiguous, refused, or timed-out model output to a neutral authored probe, so the product remains complete without the API.
- **Evaluation** includes physics invariants, state-transition tests, schema validation, adversarial explanation fixtures, hint-leakage checks, accessibility tests, responsive checks, and end-to-end journeys with the model available and unavailable.

### Impact case

The prototype demonstrates that an AI learning interface can optimize for a different completion condition: not “the learner got the answer while AI was present,” but “the learner revised a causal model and then succeeded after assistance was removed.”

It does **not** yet demonstrate a learning-effect advantage. The next credible study would compare ModelShift with a strong authored predict-observe-explain lesson, a general chatbot, and ordinary self-study, measuring immediate near transfer and delayed retention.

### Existing alternatives

PhET provides excellent research-based simulations. Brilliant provides polished interactive sequences and feedback. ChatGPT Study Mode and Khanmigo provide guided conversation and hints, and Khanmigo already disables assistance during some assessments. Earlier intelligent tutors analyzed natural-language physics explanations and modeled misconceptions.

ModelShift's narrower contribution is the integration of three mechanisms into the visible product object:

1. free-form explanation to uncertain model hypotheses;
2. hypotheses to a discriminating deterministic experiment;
3. experiment to code-enforced proof after help.

The submission should not imply that any component has no prior art. The claim is that this complete, visible orchestration is the product primitive.

### Codex story

Codex was the principal engineering environment rather than a code-completion accessory. The primary Codex thread:

- translated the product specification into the repository architecture;
- implemented the deterministic physics engine and invariant tests;
- implemented the learning state machine and assistance policy;
- integrated GPT-5.6 Structured Outputs with schema validation and fallbacks;
- built the interactive SVG simulation and transfer interface;
- created adversarial fixtures and end-to-end tests;
- inspected the rendered experience and fixed accessibility, responsiveness, and error states;
- configured and verified the public deployment;
- produced the architecture, evaluation, and setup documentation.

Separate worktrees may be used for isolated simulation, model-integration, frontend, and QA tasks, but the principal thread remains the integration authority and contains the majority of the core implementation. The `/feedback` session ID from that thread is included in the submission.

## 6. Judge test instructions

### Five-minute path

1. Open the public URL. No account is required.
2. Select what happens after the engine turns off.
3. Set confidence and explain the prediction in one or two sentences.
4. Inspect “How this test was chosen” to see the evidence span, uncertain model alternatives, and selected experiment.
5. Run the experiment and answer the single reflection question.
6. Reconstruct the rule.
7. Complete the assistance-free cargo-pod transfer task.
8. Review the evidence card.

### Suggested test inputs

Use at least two explanations to verify that identical predictions can lead to different probes:

**Input A — continuing-force model**

> It slows because once the engine turns off there is no force keeping it moving.

Expected: `continuous_force_required`; usually `friction_contrast` or `brief_vs_continuous_force`.

**Input B — hidden-resistance model**

> It slows because space probably has some resistance even when the engine is off.

Expected: `implicit_resistance`; usually `friction_contrast`.

**Input C — ambiguous**

> I am not sure. It just seems like it should change.

Expected: abstention or `mixed_or_unclear`; neutral probe.

The judge should never need a particular exact phrase for the core journey to continue.

## 7. README structure

The public repository README should use this order:

1. **ModelShift — Proof after help**
2. **Live demo and video**
3. **What it does in 30 seconds**
4. **Why this problem matters**
5. **What is new—and what has prior art**
6. **Architecture diagram**
7. **Correctness ownership: deterministic vs GPT-5.6**
8. **Learning state machine**
9. **Structured-output schema and fallback**
10. **Local setup**
11. **Environment variables**
12. **Test and evaluation commands**
13. **Judge test path**
14. **How Codex was used**
15. **How GPT-5.6 was used**
16. **Pre-existing work versus Build Week implementation**
17. **Safety and privacy**
18. **Limitations and falsification conditions**
19. **Repository structure**
20. **License and asset attribution**
21. **Primary Codex `/feedback` session ID**

### Required README links/placeholders

Current values; replace the remaining `NOT COMPLETE` fields before submission:

```text
Live app: https://modelshift.vercel.app
Demo video: NOT COMPLETE — add public YouTube URL
Repository: https://github.com/RanaPriyansh/modelshift
Primary Codex /feedback session ID: NOT COMPLETE — invoke from principal task
Tested source release: 350ed2ca44cc4c9565def562842f19373f637968
```

## 8. Repository evidence package

The repository should include:

```text
FINAL_PRODUCT_SPEC.md
CODEX_MASTER_PROMPT.md
BUILD_CHECKLIST.md
DEMO_AND_SUBMISSION.md
AGENTS.md
README.md
LICENSE
docs/ARCHITECTURE.md
docs/CODEX_AND_GPT_USAGE.md
docs/EVALUATION.md
docs/PREEXISTING_WORK.md
evals/explanations.jsonl
```

`docs/PREEXISTING_WORK.md` must explain that the education research and prior product exploration preceded or accompanied implementation, while the submitted software and meaningful product extension were created during the official submission period. Include dated commits and the primary Codex session as evidence.

## 9. Submission checklist

### Official requirements

- [ ] Education category selected.
- [x] Project built with Codex and GPT-5.6.
- [x] Product runs consistently in its documented fallback-only mode.
- [ ] Text description complete.
- [ ] Demo is under three minutes.
- [ ] Demo includes audio.
- [ ] Demo explicitly covers Codex and GPT-5.6 use.
- [ ] Demo is publicly visible on YouTube.
- [x] Repository is public with an explicit license.
- [x] README documents Codex collaboration and key human decisions.
- [ ] Primary Codex `/feedback` session ID included.
- [x] Working project is free and unrestricted for judges through the judging period.
- [x] Pre-existing work and new Build Week work are distinguished.
- [x] All external code, APIs, fonts, music, and assets are licensed or original.
- [x] Submission language is English.

### Product reliability

- [x] Public URL works without authentication or deployment protection.
- [ ] Public URL works from a second network/device.
- [x] No Vercel deployment protection or login wall.
- [x] No API secret is exposed client-side; the current deployment has no key.
- [ ] Normal model path works.
- [x] timeout path works at the seven-second client boundary.
- [x] invalid-structure path works.
- [x] explicit abstention path works.
- [x] full no-model path works.
- [x] simulation invariants pass.
- [x] proof mode has no hint event, control, or pre-submission model call.
- [x] cold-transfer answer cannot be resubmitted repeatedly.
- [x] evidence card never claims retention before a delayed test.
- [x] mobile and desktop smoke tests pass.
- [x] keyboard and reduced-motion paths pass.

### Evidence integrity

- [x] No fabricated student results.
- [x] No fabricated delayed outcome.
- [x] No “diagnosis” language.
- [x] No claim of far transfer.
- [x] No claim that all AI tutoring is harmful.
- [x] No numeric model confidence shown to the learner as truth.
- [x] No competitor straw man.
- [x] ModelShift described as a prototype mechanism requiring evaluation.

### Submission freeze

- [ ] Devpost draft created before the final hours.
- [ ] All URLs inserted and tested.
- [ ] YouTube processing complete at full resolution.
- [ ] Captions checked.
- [ ] Repository default branch points to tested commit.
- [ ] Production deployment points to the same tested commit.
- [ ] `/feedback` ID copied and verified.
- [ ] Final submission completed with at least four hours of buffer.
- [ ] Confirmation page and email saved.
- [ ] Production kept live and free at least through the judging period; preferably through the winner announcement.

## 10. Optional submission images

Create only after the product, deployment, video, and README are complete.

### Hero image

A split visual:

- left: learner's sentence with highlighted evidence;
- center: two competing model cards flowing into the selected experiment;
- right: **AI assistance off** and a successful transfer graph.

Headline:

> **What remains after the AI leaves?**

### Architecture image

Three horizontal layers:

1. **Language interpretation — GPT-5.6**
2. **Correctness and policy — deterministic TypeScript**
3. **Proof — assistance-free transfer**

Do not show a generic chatbot mockup.

## 11. Final submission wording

Use this as the closing paragraph of the Devpost description:

> ModelShift does not claim that one physics lesson proves better education. It demonstrates a different technical contract for AI learning systems: the model interprets language and chooses among validated tests, deterministic code owns truth and assistance, and the experience is not complete until the learner attempts a new problem without AI. The next proof is empirical—whether this design improves delayed learning compared with a strong fixed lesson. The Build Week prototype makes that question concrete, testable, and visible.

## 12. Final operating instruction

> **Build ModelShift. Do not build the broad Forge platform. The first proof that matters is a learner expressing one causal model, receiving the experiment that distinguishes it, and succeeding on an unfamiliar task after every assistance path has been removed.**
