# FORGE Release and Evaluation Operations

## Scope and authority

This runbook covers deterministic CI gates, offline evaluation regression, minimal release observability, and read-only deployment verification for the FORGE Learning OS. It does not authorize a deployment, environment-variable change, live model call, database operation, rollback, or any other external mutation.

The operational vocabulary is exact:

- `PASS`: the named gate has current evidence and met its threshold.
- `FAIL`: the named gate ran and did not meet its threshold.
- `NOT_EVALUATED`: required evidence was unavailable or intentionally outside this automation.

Missing evidence is never converted into `PASS`. In particular, an offline evaluation pass is not a live GPT pass, a health response is not learner-journey readiness, and a reachable URL is not the expected release until its Git SHA matches.

## CI quality gates

`.github/workflows/quality-gates.yml` runs with read-only repository permission, no deployment credential, an empty `OPENAI_API_KEY`, and Next.js telemetry disabled. All third-party actions are pinned to immutable commits.

| Gate | Command or evidence | Release condition |
| --- | --- | --- |
| Reproducible dependencies | `pnpm install --frozen-lockfile` | lockfile and manifest agree |
| Lint | `pnpm lint` | zero warnings and errors |
| Type safety | `pnpm typecheck` | zero TypeScript errors |
| Unit and contract tests | `pnpm test` | all deterministic application and evaluator tests pass |
| Existing offline evaluation | `pnpm eval` | fixture validity and authored-probe safety pass |
| Production compilation | `pnpm build` | optimized production build succeeds |
| Browser contract | `pnpm test:e2e` | desktop/mobile, keyboard, reduced-motion, fallback, adaptive fixture, and proof-lock paths pass |
| Offline regression report | `scripts/ops/evaluation-report.ts` | every checked-in regression gate passes |
| Local production verification | `scripts/ops/run-local-production-verification.ts` | built server exposes the expected SHA and passes the same read-only deployment checks |

CI uploads only the sanitized Markdown and JSON operations reports. Playwright traces, screenshots, server logs, learner explanations, model transcripts, environment dumps, and response bodies are not uploaded by the operations workflow.

## Evaluation objective and dataset plan

The offline objective is narrow: detect accidental regression in the versioned interpretation fixture corpus and transparent keyword comparison baseline while proving that every selected probe remains authored. This is implementation evidence, not learning-outcome evidence and not model-quality evidence.

The checked-in dataset is `evals/fixtures.ts`, version `1.0.0`:

- 54 authored fixtures;
- 38 clear fixtures across the four substantive hypothesis families and phrasing variants;
- 16 ambiguous, irrelevant, short, mixed, outside-domain, answer-seeking, or adversarial fixtures;
- fixed expected primary hypotheses and authored probes; and
- no production learner records.

Dataset changes require a version change and a reviewed update to `scripts/ops/evaluation-baseline.json`. Expansion should preserve representative, edge, adversarial, and ambiguous cases. Production learner text must never be copied into the fixture corpus without a separate consent, de-identification, retention, and review process that is outside this slice.

## Metrics, rubric, and judge design

The deterministic report records:

- fixture contract validity and unique IDs;
- clear-fixture primary-category agreement;
- authored-probe safety;
- ambiguous-input neutralization as a diagnostic metric; and
- dataset, evaluator, runtime, and Git versions.

The rule baseline is a transparent comparator, not a judge and not production adaptation. Its regression floor is 29/38 clear fixtures and at least 75% agreement, with 100% authored-probe safety. Ambiguous neutralization is reported but is not promoted to a release pass for the keyword baseline.

The separate credentialed evaluator remains governed by `evals/live-eval-core.ts` and `docs/EVALUATION.md`. Its automated rubric requires schema validity, semantic validity, authored probe compatibility, exact neutral fallback for ambiguous fixtures, at least 85% clear-fixture primary agreement, no runner errors, and p95 contract latency below six seconds. A high-stakes release should also calibrate any subjective model rubric against human labels, include a clear pass, clear fail, adversarial case, and ambiguous case, and use blinded/order-swapped judging if pairwise judgments are introduced. This CI slice does not run or simulate that live evaluation.

## Golden strategy and regression gate

The authored fixture IDs, expected categories, expected probes, deterministic physics/state tests, and Playwright proof-lock journeys are the golden artifacts. The report retains per-fixture IDs and bounded decisions but omits explanation text. That is enough to locate a regression in the source corpus without duplicating minor-facing text into an operations artifact.

The offline gate fails closed when any of these occur:

- dataset version mismatch;
- fewer than 54 fixtures, 38 clear fixtures, or 16 ambiguous fixtures;
- duplicate fixture IDs or invalid fixture contracts;
- fewer than 29 correct clear-fixture primary categories or less than 75% agreement; or
- any non-authored selected probe.

Live model metrics remain `NOT_EVALUATED` in this report and are required separately for a live-model release claim.

## Reporting format and retention

The generator writes:

- `test-results/release-ops/evaluation-regression.json`;
- `test-results/release-ops/evaluation-regression.md`;
- `test-results/release-ops/deployment-verification.json`; and
- `test-results/release-ops/deployment-verification.md`.

The JSON formats carry a schema version, exact Git SHA, evaluator/verifier version, aggregate gates, and sanitized per-fixture or per-check records. CI artifact retention is 14 days. Reports contain no raw learner explanation, request/response body, authorization header, cookie, environment dump, model transcript, or secret value.

## Observability contract

`GET /api/health` is a minimal liveness and release-identity probe. Its allowlisted payload is:

```json
{
  "schema_version": "1.0",
  "status": "ok",
  "service": "forge-learning-os",
  "release_sha": "<40-character Git SHA or unknown>"
}
```

The route reads only `FORGE_RELEASE_SHA` or `VERCEL_GIT_COMMIT_SHA`, validates a full Git SHA, returns `unknown` otherwise, and sends `Cache-Control: no-store`. It does not inspect model credentials, database state, user state, learner content, or upstream dependency health. Therefore `status: ok` means only that this application process can serve the bounded probe.

Operational evidence comes from three signals:

1. CI gate status for the immutable source SHA.
2. Health release identity for the running artifact.
3. Read-only route, header, public-access, and client-bundle checks from the deployment verifier.

Do not add raw learner text, predictions, confidence, evidence spans, IP addresses, cookies, tokens, or full request bodies to logs. If aggregate product telemetry is later proposed, it requires an explicit data contract, purpose, retention period, access policy, consent/legal review, and tests before collection begins.

## Read-only deployment verification

The verifier requires an explicit 40-character expected SHA and either an allowlisted HTTPS host or the explicit local-only flag. It performs bounded same-origin `GET` requests to:

- `/api/health`;
- `/`;
- `/learn/force-and-motion`; and
- same-origin versioned `/_next/static/` scripts referenced by those pages.

It does not follow redirects, submit forms, call `/api/interpret`, send learner data, retain response bodies, or issue state-changing requests. It checks release identity, public reachability, expected page markers, security headers, same-origin client assets, and a small denylist of server-secret indicators in browser-delivered HTML/JavaScript. Detection reports pattern categories only, never the detected value.

Verify the canonical production origin manually or through `.github/workflows/deployment-verification.yml`:

```bash
pnpm exec tsx scripts/ops/deployment-verifier.ts \
  --base-url https://modelshift.vercel.app \
  --allowed-host modelshift.vercel.app \
  --expected-sha <40-character-git-sha> \
  --output-dir test-results/release-ops
```

The workflow is manual and read-only. It contains no deployment job, environment secret, cloud credential, OIDC permission, or mutable target URL.

## Incident response

| Severity | Trigger | Immediate action |
| --- | --- | --- |
| SEV-1 | answer leakage, proof-lock bypass, exposed credential, cross-user data, or unsafe model output reaching objective behavior | stop release promotion; restrict access if authorized; preserve sanitized evidence; notify product/security owner |
| SEV-2 | wrong release SHA, missing security header, public access challenge, broken critical journey, or deterministic gate regression | hold release; compare expected/observed SHA; identify first failing gate; prepare rollback recommendation |
| SEV-3 | non-critical route degradation, report generation defect, or diagnostic metric movement above all hard gates | open tracked follow-up; preserve report; define owner and next verification time |

Triage sequence:

1. Record target origin, expected SHA, observed SHA, UTC time, workflow run, and failing check IDs. Do not paste response bodies or credentials.
2. Confirm whether the failure reproduces against the immutable deployment and canonical alias.
3. Separate source failure, build failure, platform/routing failure, configuration failure, and verifier failure.
4. For a possible secret exposure, stop scanning after the category is confirmed, rotate through the authorized secret owner, and purge affected artifacts under the applicable retention process.
5. For model-path failures, force or preserve the authored fallback path; do not weaken schema, semantic, leakage, proof-lock, or origin controls.
6. Re-run the narrow failing check, then the complete quality and deployment verification gates.

## Rollback and recovery

There is no automatic rollback in this slice. An authorized operator may select the last immutable deployment whose source SHA has a complete passing quality report, then change the production alias using the hosting provider's reviewed procedure. Record the old SHA, failed SHA, restored SHA, reason, operator, and timestamps without copying secrets or learner data.

After any rollback, run the deployment verifier with the restored full SHA. Reachability without SHA equality is a failed recovery. Reopen traffic or resume promotion only after the relevant SEV-1/SEV-2 condition is resolved and the complete gate set passes.
