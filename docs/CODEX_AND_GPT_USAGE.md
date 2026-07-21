# Codex and GPT-5.6 Usage

## Two different model roles

ModelShift uses model assistance in two distinct contexts that should not be conflated:

1. **Build-time Codex collaboration:** Codex translated the governing product documents into architecture, implementation, tests, evaluation fixtures, visual direction, and reviewer documentation.
2. **Runtime GPT-5.6 interpretation:** the application is implemented to make one server-side `gpt-5.6-sol` call that maps a learner explanation onto authored IDs. This runtime path has not been live-verified because `OPENAI_API_KEY` is absent.

The deterministic product remains completable without the runtime model. That is a reliability feature, not evidence that the required live GPT path has passed.

## Principal task and goal authority

The principal Codex task owns integration, final QA, deployment, submission evidence, and the required `/feedback` invocation. A separate GPT-5.6 Sol xhigh Codex task was created as goal and architecture authority:

- task ID: `019f861c-51c3-7713-b48d-ebd890507768`;
- artifact: `docs/GOAL_AUTHORITY.md`;
- role: freeze the smallest complete goal, correctness boundary, fallback behavior, acceptance criteria, and kill switches;
- non-role: implementation, deployment, and `/feedback` completion.

This task ID is **not** the principal `/feedback` session ID. No `/feedback` ID has been recorded yet.

## Codex orchestration record

The work was split along low-overlap ownership boundaries, then reviewed and integrated into local `main`:

| Lane | Owned surface | Integrated commit |
| --- | --- | --- |
| Repository and shared contracts | scaffold, authored IDs/content, preflight, decisions, visual concept | `115ff19099d4a518eea9c978e9c42b5911f72124` |
| Deterministic physics | `src/domain/physics/**` and invariant tests | `4873ebea1acb391e1fc06962cc987dde979d3935` |
| Learning policy | `src/domain/learning/**` and transition tests | `acbc5ca3d3e9f8d07ee1f3baab43345892c40b62` |
| GPT contract | `src/lib/ai/**`, `/api/interpret`, fixtures, contract tests | `dba5043f941f90d97cade1f24f7d26f1b487342f` |
| Experience integration | stage UI, simulation renderers, responsive visual system | `bed5c4b06dfa37745e429a784c4f1e9210652412`, corrected by `5af0c75fcfa85644b6e43a6c50b482e05b5041bc` |
| Deterministic binding and fail-closed audit | renderer-derived values, nonnegative graphs, explicit uncertainty, every-hypothesis compatibility | `539b72c`, `6e3be64` |
| Live-evaluation runner | key gate, production semantic revalidation, ambiguity and latency gates | `4b4753d`, `248eb3e`, `3550d75`, `8ae0151` |
| Browser specification | desktop/mobile journey, keyboard, timeout, adaptive fixture, reload, reduced motion, proof lock, overflow, console | `9a46c4d`, expanded by `8bd952d` |
| Reviewer documentation | this evidence package | documentation lane |

The isolated implementation worktrees were merged in dependency order: shared contracts → physics → learning policy → GPT boundary → principal UI integration. The principal task retained cross-layer decisions and validation authority.

## What Codex contributed

Codex work included:

- reading and reconciling the final product specification, build prompt, checklist, demo package, decision previews, and older Forge research;
- choosing the narrow ModelShift loop over the superseded broader learning platform;
- verifying the toolchain, repository baseline, deadline, GitHub state, Vercel capability, and missing OpenAI credential;
- creating the durable goal and architecture authority record;
- generating and inspecting the implementation-grade visual concept in `docs/design/modelshift-concept.png`;
- defining authored hypotheses, probe compatibility, support content, scenarios, and shared TypeScript contracts;
- implementing and reviewing the analytical physics engine;
- implementing and reviewing the fail-closed learning reducer and evidence derivation;
- implementing and reviewing the strict Responses API schema, semantic checks, leakage checks, fallbacks, and 54-fixture corpus;
- implementing a credentialed, fail-closed live-evaluation runner with exact safety, agreement, ambiguity, and p95 latency gates;
- integrating the responsive stage experience and SVG renderers;
- running deterministic unit/contract tests, the offline fixture baseline, local E2E, and public-production E2E;
- publishing the MIT source repository and fallback-only Vercel release; and
- documenting architecture, claims, deployment gates, prior work, and visual fidelity.

Human product decisions remain explicit in `FINAL_PRODUCT_SPEC.md` and `docs/DECISIONS.md`. Codex did not broaden the product into accounts, dashboards, open chat, additional concepts, delayed retention infrastructure, or generated teaching content.

## Exact runtime GPT-5.6 task

During `INTERPRET`, the server submits the learner's scenario ID, prediction ID, confidence, and explanation as untrusted data. GPT-5.6 may return only:

- 1–3 hypothesis IDs from the authored enum;
- `high`, `medium`, or `low` support;
- up to two short verbatim evidence spans per hypothesis;
- up to two authored missing-distinction IDs;
- one authored probe ID;
- one authored Level-1 question ID;
- an abstention flag and authored abstention reason; and
- a short rationale that neither teaches nor leaks the answer.

The call uses the official OpenAI SDK Responses API, strict `zodTextFormat`, `store: false`, no tools, no streaming, 500 maximum output tokens, and a six-second abort deadline. The configured model is `OPENAI_MODEL` or `gpt-5.6-sol` by default.

## What GPT-5.6 does not do

GPT-5.6 does not:

- calculate force, acceleration, velocity, or position;
- choose scenario parameters or correct answers;
- generate probes, simulations, hints, or transfer tasks;
- authorize or count support;
- control stage transitions;
- run during cold transfer before submission;
- score the transfer response or construct the evidence card;
- retain a learner profile; or
- make a diagnostic or mastery claim.

The planned optional post-transfer explanation call was cut. There is one runtime model call at most in the implemented journey.

## Why correctness remains deterministic

A probabilistic interpretation can be useful for selecting a discriminating test, but it is the wrong authority for objective physics or policy. ModelShift therefore treats the model output as a proposal with a narrow schema. Code validates the proposal, chooses fallback when it is unsafe, and independently owns every downstream fact and permission.

This separation makes the two paths equivalent in safety:

```text
valid model proposal → compatible authored probe → deterministic world
any other condition  → neutral authored probe    → deterministic world
```

## Validation after Structured Outputs

Schema conformance is necessary but insufficient. Server code also rejects:

- duplicate or contradictory hypotheses;
- inconsistent abstention fields;
- low-support personalization;
- evidence spans absent from the original explanation;
- answer or principle leakage in rationale;
- a probe incompatible with the primary hypothesis; and
- a Level-1 question that is not the authored default for that probe.

The route itself rejects cross-origin, non-JSON, oversized, invalid-scenario, invalid-prediction, invalid-confidence, and non-`INTERPRET` requests.

## Fallback modes

The normalized reasons are:

`missing_key`, `disabled`, `timeout`, `api_error`, `refusal`, `malformed_output`, `invalid_enum`, `unsupported_evidence`, `incompatible_probe`, `answer_leakage`, and `ambiguous_input`.

Each returns `mixed_or_unclear`, `neutral_core_probe`, and `neutral_observation_prompt`. The learner sees cautious authored copy and can complete the same experiment, reconstruction, proof, and evidence sequence.

## Current evaluation evidence

Verified locally on 2026-07-22 through 01:56 IST:

- 27/27 application tests and 9/9 live-evaluator tests pass;
- 54 versioned explanation fixtures pass input-validity checks;
- the transparent rule baseline agrees on 29 of 38 clear fixtures (`76.3%`);
- the baseline always returns an authored probe; and
- lint, typecheck, and optimized build pass;
- local development and optimized `next start` Playwright each report 6 passed, 4 intentional duplicate-project skips, and 0 failed;
- public-production Playwright reports 6 passed, 4 intentional duplicate-project skips, and 0 failed against `https://modelshift.vercel.app`; and
- live GPT-5.6 evaluation was not run because `OPENAI_API_KEY` is absent.

The offline eval runner does not call the model even when a key is present. The separate `pnpm eval:live` runner exits before network access when the key is missing. Consequently there is no current evidence for live parse rate, accepted-output enum/span/probe validity across the corpus, primary-category agreement, abstention quality, leakage rate, or real-model latency. Public fallback behavior is verified; live-model behavior remains a release gate documented in `docs/EVALUATION.md`.

## Truthful demo rule

The public demo must identify whether the displayed interpretation came from a validated live model result or deterministic fallback. It must not present a fixture, stub, cached object, or fallback as a live GPT-5.6 response. If live access remains unavailable, the deterministic product can be demonstrated, but the submission must state that the required live runtime path is unverified.
