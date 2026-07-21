# ModelShift — Final Product Specification

**Decision:** REFRAME Forge into ModelShift  
**Track:** OpenAI Build Week — Education  
**Prototype deadline:** July 21, 2026 at 5:00 p.m. Pacific / July 22, 2026 at 5:30 a.m. IST  
**Primary deployment:** Public standalone Next.js app on Vercel  
**Working subtitle:** Proof after help

## 1. Product in one sentence

**ModelShift converts a learner's free-form causal explanation into the smallest validated experiment that can distinguish the plausible mental models, then removes AI assistance and asks the learner to prove the revised model in an unfamiliar representation.**

## 2. Exact user, problem, and wedge

### User

A learner aged approximately 13–16 who has already encountered introductory force and motion in school but still relies on an everyday model such as “an object needs a continuing force to keep moving.”

### Moment of use

The learner can repeat Newton's first law or solve a familiar formula problem, but cannot correctly predict what happens when a force stops acting.

### Narrow problem

Some AI assistance can improve immediate task performance without producing equivalent unaided learning. Most interfaces make that difference invisible. ModelShift tests whether AI can help expose and challenge a learner's causal model while deterministic code preserves correctness and an assistance-free transfer task provides immediate evidence of independent understanding.

### Initial concept

> **Zero net force does not imply zero velocity. It implies zero acceleration; an object already moving continues at constant velocity unless a net force changes it.**

The first build supports only this concept and the closely related distinction between frictional slowing and force-free coasting.

## 3. Primary product primitive

### Primary primitive: mental-model-to-experiment compilation

The model interprets a learner's natural-language explanation as uncertain evidence for a small authored set of plausible mental models. The application then selects an authored experiment in which those models predict visibly different outcomes.

### Supporting primitive 1: deterministic assistance governor

Code—not the language model—controls when support may appear, which level is permitted, and when all assistance is disabled.

### Supporting primitive 2: proof after help

After the experiment and reconstruction, the interface removes hints and gives a visually different near-transfer task. The learner's prediction is checked deterministically. Any model-based analysis of the explanation occurs only after submission and cannot help solve the task.

## 4. What the product does not claim

The prototype does **not** claim to:

- measure intelligence, general physics mastery, creativity, or far transfer;
- prove seven-day retention;
- prove that all unrestricted AI harms learning;
- replace teachers, PhET, Brilliant, Khan Academy, laboratories, or curricula;
- diagnose a learner in a medical or psychological sense;
- infer a learner's mental model with certainty;
- generalize to every subject;
- demonstrate population-level learning effects from a hackathon demo.

It demonstrates a technically complete mechanism that can later be evaluated against a strong fixed lesson.

## 5. Product promise

> **State what you think. Test the model that produced it. Then prove what remains without help.**

## 6. Must build

1. One polished deterministic force-and-motion microworld.
2. Three authored scenario families: mystery, discriminating experiment, and cold transfer.
3. Four authored hypothesis states plus an explicit uncertain/abstain state.
4. Prediction and confidence capture before any assistance.
5. A short free-form causal explanation.
6. A strict GPT-5.6 structured interpretation that includes evidence spans, uncertainty, and an allowed probe ID.
7. Deterministic validation and override of every model-selected action.
8. A typed learning-state machine that prevents skipped steps and disables help in proof mode.
9. A three-level assistance ladder with authored content.
10. Learner reconstruction after observing the experiment.
11. One immediate assistance-free transfer task in a different representation.
12. A student-facing “Proof after help” evidence card.
13. A deterministic fallback path that preserves the complete loop when the API fails.
14. Unit, invariant, schema, adversarial, accessibility, responsive, and end-to-end tests.
15. A public deployment requiring no login or test account.

## 7. Explicitly excluded

Do not add:

- a general chat window;
- a second subject or concept;
- a full curriculum or prerequisite graph;
- accounts, profiles, a database, email capture, or a teacher dashboard;
- a social feed, streaks, points, badges, leaderboards, or a companion personality;
- generated physics, generated simulations, or generated numerical answers;
- unreviewed model-generated transfer questions;
- a five-level tutoring dialogue;
- voice, camera, AR, phone sensors, or physical-world missions;
- a mentor marketplace, credentials, school integrations, or analytics dashboards;
- an Apps SDK version before the public web product is complete;
- ChatGPT Sites work on the critical path.

## 8. Content and scenario contract

### Scenario A — Mystery

A spacecraft or puck receives a short push. The force arrow disappears. The animation freezes before the outcome.

Learner chooses:

- stops immediately;
- gradually slows;
- continues at constant velocity;
- speeds up.

The learner records confidence from 0–100 and explains why in no more than 600 characters.

### Scenario B — Discriminating experiment

The application selects one experiment from an authored library:

1. `friction_contrast`  
   Two objects receive the same short push. One experiences no horizontal resistance; the other experiences friction.

2. `brief_vs_continuous_force`  
   Compare a one-second force with a continuing force and observe the velocity-time graph.

3. `zero_force_velocity_contrast`  
   Compare an object initially at rest with an object already moving when both have zero net force.

4. `neutral_core_probe`  
   The safe default when the explanation is mixed, correct, too short, or uncertain.

Every experiment uses authored parameters and the same deterministic engine.

### Scenario C — Cold transfer

A visually different cargo pod is shown with a force-time graph. The learner predicts the velocity-time graph after the thruster switches off and explains the causal rule. No hint controls, AI messages, or experiment replay are available.

This is near transfer across context and representation. Do not call it far transfer.

## 9. Authored mental-model set

The learner never sees clinical labels. Internal IDs are:

- `continuous_force_required` — motion is sustained by a continuing force;
- `implicit_resistance` — the learner assumes air, space, or an unspecified medium necessarily slows the object;
- `force_equals_velocity` — force is treated as directly determining current velocity rather than change in velocity;
- `scientific_or_near_scientific` — the explanation contains the essential distinction;
- `mixed_or_unclear` — insufficient, contradictory, irrelevant, or genuinely ambiguous evidence.

Learner-facing language:

- “One model that fits what you wrote is…”
- “Another explanation is still possible…”
- “Let's use a situation where these explanations predict different outcomes.”

Never display “misconception detected,” a probability presented as fact, or a permanent learner label.

## 10. GPT-5.6 responsibilities

GPT-5.6 may:

- interpret the learner's free-form explanation;
- return ranked hypothesis IDs from the authored set;
- quote short evidence spans from the learner's own text;
- identify one or two missing causal distinctions from an authored enum;
- recommend one probe ID from the authored library;
- abstain when evidence is insufficient;
- recommend one authored Level-1 question ID;
- after cold-transfer submission, identify whether authored causal distinctions appear in the explanation and quote evidence spans.

GPT-5.6 may not:

- calculate or determine physical outcomes;
- create equations, scenario parameters, simulations, correct option IDs, or scores;
- authorize a hint level;
- provide a solution during proof mode;
- invent a probe, misconception ID, or transfer problem;
- retain learner data across sessions;
- turn a hypothesis into a definitive diagnosis.

## 11. Initial interpretation schema

Use the Responses API with Structured Outputs and a strict Zod/JSON schema. The output shape should be equivalent to:

```json
{
  "schema_version": "1.0",
  "hypotheses": [
    {
      "id": "continuous_force_required",
      "support": "high",
      "evidence_spans": ["the engine is no longer pushing it"],
      "rationale": "The explanation treats continuing force as necessary to sustain motion."
    }
  ],
  "missing_distinctions": ["force_changes_velocity_not_velocity_itself"],
  "recommended_probe_id": "friction_contrast",
  "recommended_level_1_question_id": "what_differs_between_cases",
  "abstain": false,
  "abstain_reason": "none"
}
```

Constraints:

- 1–3 hypotheses;
- enum-only IDs;
- support is `high`, `medium`, or `low`, not a student-facing numeric probability;
- at most two evidence spans, each copied from the submitted text and at most 120 characters;
- at most two missing distinctions;
- one probe ID from the allowed list;
- one authored question ID;
- `additionalProperties: false` throughout;
- no correct answer, numerical physics result, or direct explanation in the output.

Server validation must confirm that evidence spans occur in the original text, enum values are allowed, and the selected probe is valid for the current scenario.

## 12. Uncertainty and deterministic fallback

Use personalized adaptation only when:

- the output parses successfully;
- the top hypothesis has `high` or `medium` support;
- the output is not internally contradictory;
- the probe is allowed for that hypothesis;
- evidence spans are valid.

Otherwise:

1. set the internal state to `mixed_or_unclear`;
2. select `neutral_core_probe`;
3. show learner-facing wording: “There are a few ways to read that explanation, so we'll run the baseline test.”

Timeout target: 6 seconds. On timeout, refusal, API error, malformed output, or policy rejection, use the same neutral fallback. The learning flow must never dead-end because the model is unavailable.

## 13. Explanation-evidence schema after proof

After the learner submits the cold-transfer answer, a second optional structured call may return:

```json
{
  "concept_evidence": {
    "zero_net_force_means_zero_acceleration": {
      "present": true,
      "evidence_spans": ["no net force means its velocity does not change"]
    },
    "existing_velocity_can_persist": {
      "present": true,
      "evidence_spans": ["it keeps the speed it already had"]
    },
    "friction_is_a_force": {
      "present": false,
      "evidence_spans": []
    }
  },
  "ambiguous": false
}
```

This call is post-submission analysis, not assistance. The deterministic option result remains the primary proof. If the call fails, display “Explanation evidence unavailable” rather than guessing.

## 14. Deterministic simulation engine

Implement a pure TypeScript, one-dimensional, piecewise-constant-force engine.

For each segment:

- `a = F_net / m`;
- `v(t) = v0 + a*t`;
- `x(t) = x0 + v0*t + 0.5*a*t^2`;
- friction acts opposite the direction of motion;
- a friction segment clamps at rest rather than numerically reversing direction;
- after the push ends in the no-resistance condition, `F_net = 0`, `a = 0`, and velocity remains constant.

Precompute a deterministic trajectory and animate its samples. Rendering must not integrate the physics independently.

### Required invariants

- Zero net force preserves velocity within tolerance.
- Equal and opposite forces produce zero acceleration.
- Doubling net force doubles acceleration at fixed mass.
- Doubling mass halves acceleration at fixed force.
- Friction reduces speed and never creates a sign reversal after stopping.
- Trajectories remain within authored bounds.
- Results are independent of visual frame rate.

## 15. Learning state machine

Use a typed reducer or transition table, not ad hoc component booleans.

```text
HOOK
  → PREDICT
  → EXPLAIN
  → INTERPRET
  → PROBE_PREDICT
  → EXPERIMENT
  → REFLECT
  → RECONSTRUCT
  → COLD_TRANSFER
  → PROOF_RESULT
```

Important guards:

- prediction and confidence must be committed before explanation;
- explanation must meet minimum meaningful-input rules or the learner chooses “I genuinely don't know”;
- experiment cannot run before the probe prediction is committed;
- reconstruction must occur after observation;
- `COLD_TRANSFER` has no hint or interpretation events;
- transfer answer cannot be changed after submission;
- the final result records exactly which support was consumed.

The server must reject any attempt to call a hint task during `COLD_TRANSFER`.

## 16. Assistance governor

The MVP has only four states:

- **Level 0 — No conceptual help.** Default.
- **Level 1 — Attention cue.** An authored question that directs attention without naming the principle.
- **Level 2 — Contrast.** Highlights one difference between two cases or reveals a second representation.
- **Level 3 — Principle.** Gives a concise authored explanation, followed by required reconstruction.

Unlock rules:

- Level 1: after a committed attempt and either an explicit “I'm stuck” action or 20–30 seconds without progress.
- Level 2: after a revised attempt still conflicts with the observed evidence, or a second explicit request.
- Level 3: after two unsuccessful reconstruction attempts, or when the learner explicitly chooses “Show the principle.”

GPT-5.6 may recommend an authored Level-1 question ID. Code authorizes the level and renders the authored text. GPT-5.6 does not author Level-2 or Level-3 content in the MVP.

Accessibility accommodations—reduced motion, text descriptions, keyboard controls, extended time, replay, captions—do not count as conceptual assistance.

The learner may always choose “I genuinely don't know.” That records uncertainty and unlocks the next minimal step without punishment.

## 17. Student-facing result: Proof after help

Do not display a single intelligence-like score. Show a compact evidence card with at most five elements:

1. **Before** — initial prediction and a short quote from the explanation.
2. **Test** — the experiment used to separate the candidate models.
3. **Support** — none, attention cue, contrast, or principle.
4. **Alone** — cold-transfer prediction result and explanation evidence.
5. **Later** — “not tested yet” unless a return challenge is implemented.

Suggested copy:

> “At first, your model predicted that motion fades when the push ends. The friction contrast showed that slowing requires a force. You used one attention cue. In a new representation, you predicted constant velocity without hints.”

### Technical metrics

Keep separate measures rather than collapsing them prematurely:

- `U`: unaided transfer evidence in `[0,1]`;
- `H`: normalized support load in `[0,1]`;
- `M`: evidence that the learner revised the relevant causal distinction in `[0,1]`;
- `C`: confidence calibration in `[0,1]`.

An exploratory analytics index may be:

`ProofAfterHelp = 0.55U + 0.25M + 0.10(1-H) + 0.10C`

Do not expose this as a learner score in the MVP. A true “capability gap” requires equated assisted and unaided tasks plus a baseline; this single lesson does not provide that psychometric basis.

## 18. Minimum interface

### Screen 1 — Mystery

- frozen SVG scene at force cutoff;
- one-sentence setup;
- prediction choices;
- confidence control;
- no chat or explanatory text.

### Screen 2 — Your model

- short explanation field;
- “I genuinely don't know” path;
- after submission, a calm summary: “Two models could fit what you wrote.”
- optional collapsible “How the system read this” developer lens for judges.

### Screen 3 — The deciding experiment

- selected experiment title;
- prediction before run;
- manipulable friction/force control only where educationally relevant;
- SVG animation, force arrows, and velocity-time graph;
- one authored attention question at a time.

### Screen 4 — Rebuild the rule

- learner writes or assembles the causal rule;
- optional authored contrast;
- clear transition: “Now the world changes.”

### Screen 5 — Proof mode

- visually distinct, quieter interface;
- “AI assistance off” badge;
- unfamiliar context and representation;
- no hints, replay, interpretation panel, or chat;
- submit once.

### Screen 6 — Proof after help

- evidence card;
- no celebratory confetti, streak, or rank;
- optional “Test this again later” local reminder only as a stretch feature.

## 19. Visual and interaction principles

- The world, not motivational copy, creates curiosity.
- Show force and velocity as different visual objects.
- Use motion and graph changes to make the contradiction legible.
- Never shame the initial everyday model; friction makes it reasonable in ordinary experience.
- Reveal internal AI uncertainty rather than fake precision.
- Keep the main flow linear and completable in 4–6 minutes.
- Support keyboard, screen reader, text-only trajectory, reduced motion, and high contrast.
- Make the “AI assistance off” transition unmistakable.

## 20. Technical architecture

```text
Browser
├─ React/Next.js experience
├─ SVG simulation renderer
├─ typed learning reducer
├─ authored scenarios, probes, hints, rubrics
└─ localStorage session state (optional, minimal)

Next.js server route
├─ input validation and size limits
├─ OpenAI Responses API
├─ GPT-5.6 strict Structured Outputs
├─ enum/evidence-span validation
├─ timeout/refusal/error handling
└─ neutral deterministic fallback

Test layers
├─ physics unit and invariant tests
├─ state-transition tests
├─ schema and explanation-fixture evals
├─ leakage/adversarial tests
├─ Playwright end-to-end tests
└─ accessibility and responsive checks
```

### Recommended stack

- Next.js App Router, React, TypeScript strict mode;
- SVG rather than canvas for accessibility and deterministic inspection;
- Zod for runtime validation and Structured Outputs;
- OpenAI Responses API with model alias `gpt-5.6-sol`;
- Vitest for unit and contract tests;
- Playwright for end-to-end and viewport tests;
- Vercel for deployment;
- no database and no authentication.

## 21. Persistence and privacy

Persist only what is necessary for the current session:

- scenario ID;
- prediction and confidence;
- explanation;
- returned hypothesis IDs and evidence spans;
- selected probe;
- support levels used;
- reconstruction;
- cold-transfer response;
- optional local return timestamp.

Default to browser-local state. Do not store names, email, school, location, age, or a long-term psychological profile. Do not log raw explanations in production server logs. Log only latency, schema success, fallback reason, and anonymous scenario/event IDs.

The public prototype is explicitly for users 13+. It requires no account and should contain an age-appropriate disclosure that AI interpretation may be wrong and that the physics world is produced by deterministic code.

The OpenAI API key must exist only as a server-side secret and must never use a `NEXT_PUBLIC_` prefix.

## 22. Reliability and cost controls

- Maximum explanation length: 600 characters.
- Maximum two model calls per completed session.
- Strict output token limit.
- Six-second application timeout with neutral fallback.
- No web search, file tools, or model-generated external calls.
- No streaming dependency for core flow.
- No raw output rendered before server validation.
- Same-origin and content-type checks on API routes.
- Production spending limit configured in the OpenAI project.
- Clear non-AI fallback so the demo remains usable during an outage.

## 23. Required evaluation fixtures

Create at least 50 authored inputs covering:

- clear examples of each hypothesis;
- negation (“I don't think it needs force”);
- correct statements written informally;
- mixed explanations;
- irrelevant text;
- extremely short text;
- adversarial requests for the answer;
- prompt injection attempts;
- unusual but valid reasoning;
- same prediction supported by different explanations.

Acceptance targets before submission:

- 100% schema parse success under normal API operation;
- 100% output enum validity;
- zero direct-answer leakage from rendered learner-facing support;
- at least 85% primary-category agreement on clear authored fixtures;
- appropriate abstention on ambiguous fixtures;
- zero model-selected probes outside the authored compatibility table;
- p95 interpretation latency under 6 seconds in the production smoke sample;
- complete learning loop succeeds with the model disabled.

These targets validate implementation reliability, not educational efficacy.

## 24. Required deterministic and end-to-end tests

### Physics

- all invariants in Section 14;
- segment-boundary continuity;
- stop clamping under friction;
- deterministic snapshots for all three scenario families.

### State machine

- no skipped prediction;
- no experiment before probe prediction;
- no hint event accepted in proof mode;
- no transfer resubmission;
- support load recorded exactly once;
- API failure transitions to neutral probe.

### Model boundary

- strict schema parsing;
- refusal and timeout handling;
- evidence-span verification;
- prompt-injection resistance;
- answer-leakage checks;
- fallback copy.

### Interface

- full keyboard path;
- screen-reader names for controls;
- reduced-motion mode;
- text alternative for trajectory and graph;
- 390×844 and 1440×900 viewport tests;
- no horizontal overflow;
- full live and stubbed end-to-end paths.

## 25. Falsification conditions

Narrow or abandon the adaptive mechanism if:

- GPT mapping performs no better than a simple keyword/rule baseline;
- selected experiments do not improve immediate unaided transfer or reduce support relative to the neutral authored sequence;
- the model confidently misreads more than 10–15% of clear explanations;
- learners interpret the experience as judgment rather than inquiry;
- the interface teaches the visual pattern rather than the force/velocity distinction;
- a strong fixed predict-observe-explain lesson matches or outperforms the adaptive version at lower cost;
- authoring each concept requires so much expert work that expansion is uneconomic;
- the system's result card encourages score gaming or false mastery claims.

## 26. Deployment decision

### Primary

Deploy the standalone Next.js application to Vercel. This provides a direct public URL, server-side functions for the OpenAI call, encrypted environment variables, preview deployments, and a repository that remains portable.

### Secondary

After the Vercel production flow is stable, optionally import the compatible repository into ChatGPT Sites. Sites is a public beta and may depend on plan, region, workspace settings, and framework compatibility; it is not on the critical path.

### Rejected for the deadline

A ChatGPT App using the Apps SDK adds an MCP server, iframe host, and judge-access friction without strengthening the core learning interaction. It may become an optional later surface, not the submission's primary experience.

## 27. Definition of done

The product is ready to submit only when a first-time judge can:

1. open a public URL without signing in;
2. understand the mystery in under 10 seconds;
3. commit a prediction and explanation;
4. see that GPT-5.6 interpreted the explanation with uncertainty and selected an authored test;
5. run a deterministic experiment whose result is visibly correct;
6. receive no more help than the state machine allows;
7. enter an unmistakable assistance-free proof mode;
8. solve a different representation and submit once;
9. see a truthful evidence card with no inflated mastery claim;
10. repeat the flow successfully when the model is slow or unavailable;
11. inspect a repository with passing tests, setup instructions, Codex documentation, and a principal `/feedback` session ID.

## 28. Final instruction

**Build ModelShift's single force-and-motion loop. Do not build the broader Forge platform. The first proof that matters is a learner expressing “motion needs force,” receiving the correct discriminating experiment, and then solving an unfamiliar zero-net-force problem without assistance.**
