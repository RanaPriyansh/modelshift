# ModelShift Evaluation

## Evidence boundary

ModelShift evaluation is divided into four different questions:

1. **Implementation validation:** does the software enforce its physics, state, schema, and safety contracts?
2. **Model-behavior evaluation:** does live GPT-5.6 safely map authored explanations to compatible authored probes?
3. **Usability evaluation:** can intended users and judges understand and complete the experience?
4. **Learning evaluation:** does the mechanism improve learning relative to a fixed lesson and persist over time?

The current local release candidate has passing automated implementation evidence across unit/contract tests, lint, typecheck, production build, and the local browser matrix. The offline fixture corpus establishes a comparison set and rule baseline, but it is not a live model evaluation. No student-learning result is claimed.

## Verification snapshot

Commands were run locally in `/Users/Priyansh/Documents/codex-buildweek/education` on 2026-07-22 at approximately 01:20 IST.

### Unit and contract tests

```text
$ pnpm test
Test Files  4 passed (4)
Tests       25 passed (25)
```

| File | Count | Verified behaviors |
| --- | ---: | --- |
| `src/domain/physics/physics.test.ts` | 8 | zero-force velocity, balanced forces, force/mass scaling, friction stop clamp, continuity, determinism, authored bounds, frame-rate-independent endpoints |
| `src/domain/learning/index.test.ts` | 7 | invalid event matrix, proof-mode rejection, input gates, neutral fallback transition, probe/observation gates, support accounting, full single-submit evidence path |
| `src/lib/ai/interpret.test.ts` | 8 | strict schemas, valid semantic result, unsupported evidence, incompatibility, contradiction, leakage, missing/disabled/refusal/timeout fallback, Responses configuration, adversarial input, corpus coverage |
| `src/lib/ai/route.contract.test.ts` | 2 | missing-key route fallback; cross-origin, non-JSON, invalid-stage, and oversized request rejection |

These tests are deterministic and use mocked model clients where a model-shaped response is required. They do not prove live model quality.

### Offline fixture and baseline report

```text
$ pnpm eval
fixtures: 54 (version 1.0.0)
fixture input validity: PASS
rule baseline primary-category agreement on clear fixtures: 29/38 (76.3%)
rule baseline always selects an authored probe: PASS
live model evaluation: NOT RUN (OPENAI_API_KEY is absent)
```

The corpus covers clear instances of all four substantive hypothesis families, informal scientific reasoning, negation, double negation, mixed reasoning, very short and irrelevant text, outside-domain text, answer requests, prompt injection, unusual valid phrasing, and same-prediction/different-reason cases.

The baseline is intentionally transparent and is not used for production adaptation. Its `76.3%` result is the comparison floor for clear fixtures, not a GPT score and not educational evidence.

### Static and production build checks

The same QA cycle passed:

```text
pnpm lint       PASS
pnpm typecheck  PASS
pnpm build      PASS
```

### Local browser checks

Development E2E:

```text
$ pnpm exec playwright test
target: http://127.0.0.1:3000 (Playwright-managed Next.js dev server)
result: 5 passed, 3 intentional skips, 0 failed (25.0s)
```

Optimized local production E2E:

```text
$ pnpm start --hostname 127.0.0.1 --port 3100
$ PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm test:e2e:prod
result: 5 passed, 3 intentional skips, 0 failed (24.8s)
```

Desktop ran all four cases: complete fallback journey and evidence, keyboard-only completion, timeout fallback, and reduced motion. Mobile Chromium at 390×844 ran the complete fallback journey; the three viewport-independent policy cases are intentionally skipped in the mobile project. The suite also checks proof-control absence, single-submit progression, evidence-card labels, horizontal overflow, and console/page errors. The production-labeled run used local `next start`; it was not a public-deployment test.

## What is not yet verified

The following required evidence is absent at this snapshot:

- a credentialed run against `gpt-5.6-sol`;
- live parse/fallback rate over all 54 fixtures;
- 100% enum, evidence-span, and probe compatibility among accepted live outputs;
- zero rendered answer leakage across live outputs;
- at least 85% primary-category agreement on the 38 clear fixtures;
- appropriate neutralization of ambiguous fixtures;
- production latency samples and a truthfully scoped p95;
- a complete live-model browser journey;
- a public-deployment browser smoke tied to one release commit;
- a real OpenAI timeout response rather than the browser's forced network-timeout path;
- external screen-reader validation of announcements and graph text alternatives; and
- external usability, accessibility, educator, or child-safety review.

Passing `pnpm eval` must not be summarized as “GPT-5.6 passed 54 fixtures.” The current runner does not call GPT-5.6.

## Final implementation-validation gate

The release candidate should record command output for:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
pnpm build
pnpm test:e2e
PLAYWRIGHT_BASE_URL=https://production.example pnpm test:e2e:prod
```

The final evidence should include the tested Git SHA, runtime versions, environment mode (`live`, forced fallback, or missing key), and exact failures or skips. The three current skips are intentional duplicate-project exclusions, not passes. Public production and live-model checks still require separate evidence.

## Live model evaluation protocol

A separate credentialed runner is required because `evals/run-evals.ts` is offline by design.

For every fixture, record without storing unnecessary learner data:

- fixture ID and expected category/probe;
- response source (`model` or `fallback`);
- schema parse outcome;
- post-validation outcome and bounded rejection reason;
- primary hypothesis and selected probe, if accepted;
- whether evidence spans are verbatim substrings;
- leakage flag; and
- end-to-end latency.

Report at least:

- fixture count and model name;
- clear and ambiguous fixture counts;
- accepted model output count;
- parse-or-explicit-fallback rate;
- accepted-output enum/span/probe validity;
- primary-category agreement on clear fixtures;
- neutralization rate on ambiguous/adversarial fixtures;
- rendered answer leakage count; and
- latency sample size, median, p95, and maximum.

The acceptance targets from the final specification are 100% parse or explicit fallback, 100% validity among accepted outputs, zero rendered answer leakage, at least 85% primary-category agreement on clear fixtures, compatible probes only, and a production p95 under the six-second application deadline. If the sample is too small for a meaningful p95, report raw latencies and the small sample size instead.

## Browser evaluation protocol

The end-to-end matrix should cover both 1440×900 desktop and 390×844 mobile:

- neutral fallback from missing key;
- forced timeout;
- one validated live interpretation that chooses an adaptive non-neutral probe;
- same prediction with different explanations selecting two distinct compatible probes;
- committed prediction before explanation;
- committed probe prediction before experiment;
- authored support consumed exactly once;
- “I don't know” paths;
- structural absence of AI, hint, and replay controls in proof mode;
- route and reducer rejection of proof-mode interpretation/help events;
- transfer submission exactly once;
- truthful result card;
- keyboard-only completion and visible focus;
- reduced-motion behavior;
- semantic names and text alternatives;
- no horizontal overflow; and
- no console errors or unhandled request failures.

Production smoke must also confirm no login or Vercel protection and no exposed `OPENAI_API_KEY` or `NEXT_PUBLIC_*` secret.

## Usability evaluation

No representative learner or fresh-user session has been run. A minimum pre-submission check should ask at least three fresh users, ideally including someone close to the target age with appropriate consent and supervision:

- Can they explain the mystery within ten seconds?
- Do they understand that the interpretation is provisional rather than diagnostic?
- Can they tell why the selected experiment distinguishes the models?
- Can they distinguish force, acceleration, and velocity in the graphs?
- Do they notice that assistance is removed in proof mode?
- Do they interpret the evidence card as a record rather than a grade?

Record observations and breakdowns, not invented success percentages.

## Future learning study

One immediate transfer item is not an efficacy study. A future evaluation should compare the adaptive mechanism with a strong fixed predict-observe-explain lesson using the same deterministic simulation and assessment. Outcomes should remain separate:

- unaided immediate near-transfer accuracy;
- support consumed;
- quality of causal reconstruction under an authored rubric;
- confidence calibration;
- delayed retention after a defined interval; and
- learner perception of inquiry versus judgment.

The study should preregister the task set, comparison condition, analysis, exclusions, and minimum sample size. Until then, the product should be described as a prototype mechanism.

## Falsification conditions

Narrow or abandon adaptation if:

- live GPT mapping does not materially outperform the 76.3% rule baseline on paraphrase, negation, mixed reasoning, and evidence extraction;
- confident misreads exceed an acceptable safety threshold;
- adaptive probe selection does not improve immediate unaided transfer or reduce support relative to the neutral sequence;
- learners experience the interpretation as diagnosis or judgment;
- learners solve a visual pattern without understanding the force/velocity distinction;
- a fixed lesson matches or outperforms the adaptive version at lower cost;
- expert authoring cost makes extension uneconomic; or
- the evidence card encourages gaming or false mastery claims.
