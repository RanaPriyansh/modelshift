# Packet F — Lesson Intelligence worker note

**Scope:** local/staged Lesson Studio proposal workflow only. This note does not assert principal acceptance, production readiness, live-provider success, source review, proof validity, or publication.

## Provider contract check — 2026-07-22

The fixed allowlist in `src/lib/lesson-studio/schema.ts` was checked against current provider documentation before implementation:

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) supports the Responses API with Zod-backed `text.format`; [the model catalog](https://developers.openai.com/api/docs/models) lists `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`.
- [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) documents `output_config.format` with JSON Schema; [the model overview](https://platform.claude.com/docs/en/about-claude/models/overview) lists `claude-sonnet-5`.
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) documents JSON Schema output; [Gemini 3.6 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash) lists model ID `gemini-3.6-flash` and structured-output support.
- [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs) requires a supported model plus strict `response_format.json_schema`; the local policy permits only `openai/gpt-5.6-sol` rather than provider discovery or arbitrary routing.

These are capability references, not a live integration result. Model availability, pricing, and quotas must be rechecked during any separately authorized provider change.

## Boundaries implemented

- Fixed provider endpoints and fixed provider/model allowlists; model text is no longer a free-form override.
- Request-only API keys only; there is no managed Studio credential or environment switch. The public Studio page and direct POST are unavailable unless `readForgeCloudIdentity` returns active server-owned adult authority. The literal/UI authoring declaration and target audience metadata are not authority.
- Per-depth timeout, output-token, conservative estimated-cost budgets; provider refusals, rate limits, timeout, malformed output, output exhaustion, and provider errors have distinct prompt-free failures.
- Random correlation IDs are returned in a no-store response/header without input, source text, or key logging.
- The local package is `generation → deterministic critique → unresolved source plan → unreviewed revision`. Source needs are explicitly unresolved requirements, never source records or citations.
- The pure ADR-002 review machine requires coordinator, source, factual, pedagogy, access, safety, and proof reviewers with state-scoped roles. Every unique decision names exact immutable refs, policy ref, conflicts/dissent, and supersession metadata. A record state, source receipt/ref, and finality are accepted only when deterministic replay from its immutable draft seed reaches the same projection; local supersession is explicitly unsupported. `safety-review` locally maps to ADR-002 `safety_review`; `approved-package` remains `not-published`, with no publication or proof-grade transition.
- A source-needed transition accepts only a digest-checked local package of complete ADR-003 item bindings. Its union of resolved source-need IDs must equal the exact IDs frozen from the pipeline source plan, exactly once. Each item retains nonempty upstream source/rights/claim review IDs; the local source-review decision binds the package digest separately. This is completeness/digest validation only, never authenticity, durability, rights attestation, or publication authority.
- Offline metrics cover two readings, disagreement, separating-test shape, source-need completeness, answer leakage, cold-transfer shape, bounded draft-safety signals (not child-safety proof), latency, and cost across history/physics/mathematics/health and child/teen/adult target audiences.

## Live evaluation status

`pnpm eval:lesson-studio:live` is deliberately **NOT RUN**. It exits without a provider request unless all of the following are present: the explicit opt-in value `run-provider-specific-redacted-suite`, one allowlisted provider, one allowlisted model, and a separate live-eval credential. It exits nonzero for **NOT_RUN**, failed/error, missing-fixture, or contract-metric failure. Its report contains only expected fixture IDs, aggregate booleans/counts, and closed error codes; never prompts, drafts, provider bodies, error messages, or keys.

## Local verification

- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm test` — passed before the correction request; the correction commit requires a fresh final run.
- `pnpm build` — passed.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3117 pnpm playwright test tests/e2e/forge-expansion.spec.ts --project=desktop --project=mobile` — passed: 22 tests. The server used a unique local port; no deployment occurred.
- Manual local Studio inspection at desktop and 320 CSS px confirmed model selection is constrained to allowlisted options, request-only disclosure is visible, no horizontal overflow was present, and keyboard focus reached the skip link then primary navigation. Temporary screenshots were deleted after inspection and are not part of this handoff.

The local development browser did report a `favicon.ico` 404, which is a pre-existing application asset gap outside this packet's ownership; no Packet F console error was observed.

## Deliberate exclusions

This slice does not persist a review record, acquire or bind sources, publish or withdraw a World, grade proof, activate a managed credential, spend provider credits, run live evaluation, modify a World, enable cloud data, deploy, or claim human review/educational validity.
