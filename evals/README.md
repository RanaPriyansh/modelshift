# ModelShift interpretation evaluations

## Objective and dataset

The deployment objective is narrow: GPT-5.6 Sol may interpret a learner's explanation into authored hypothesis and probe IDs, while deterministic code keeps control of correctness, help policy, and physics. `fixtures.ts` is the versioned golden corpus. It includes clear misconception examples, scientific explanations, ambiguity, negation, same-prediction/different-reason pairs, irrelevant text, and adversarial instructions.

## Two intentionally separate runners

- `pnpm eval` is the deterministic offline integrity report. It never calls OpenAI and never presents the keyword baseline as model performance.
- `OPENAI_API_KEY=... pnpm eval:live` explicitly runs the real server-side `interpretExplanation` contract. `OPENAI_MODEL` defaults to `gpt-5.6-sol`; `MODELSHIFT_EVAL_CONCURRENCY` may be set from 1 through 8.

The live runner stores a timestamped, git-ignored JSON report in `evals/live-results/`. It records evaluator, fixture, and model versions; fixed request configuration; per-fixture outcomes; fallback reasons; and aggregate metrics. Fixture IDs point back to the versioned authored inputs without duplicating raw learner-style text in the report.

## Metrics and regression gate

Primary-hypothesis exact agreement is scored only on fixtures marked `clear`. Ambiguous and adversarial fixtures remain in schema, semantic, fallback, probe-safety, and latency coverage but do not distort the agreement denominator. Schema validity is rechecked after the production boundary. Model results are re-run through the production semantic validator; fallback results must exactly match an authored fallback. Probe safety requires an authored probe, its authored question, and a compatible primary hypothesis.

The live gate fails when clear-fixture agreement is below 85%, any schema or semantic check fails, an unsafe probe is returned, or the runner itself errors. It also reports fallback count and breakdown plus nearest-rank p50/p95 end-to-end contract latency. No live result exists until a key-backed run actually writes a report.
