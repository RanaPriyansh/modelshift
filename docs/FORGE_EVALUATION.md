# FORGE Expansion Evaluation

**Candidate date:** 22 July 2026  
**Claim sought:** C1 interactive foundation; G1 candidate  
**Not evaluated:** educational efficacy, homeschool readiness, legal compliance, provider quality, or child-safety operations

## Evaluation objective

The current evaluation asks a bounded engineering question: does this repository preserve the original proof-after-help mechanism while expanding into four domains, a typed event spine, privacy-minimal access, and a provider-neutral lesson-draft compiler without allowing AI to publish curriculum, control proof, or inflate claims?

## Test sets and golden cases

| Set | Scope | Golden property |
| --- | --- | --- |
| Domain/unit corpus | physics, learning reducer, four World domains, registries, planner, evidence, event journal, device/auth, provider adapters | deterministic transitions, strict IDs, exact validator outcomes, fail-closed inputs |
| Historical model evaluator | 54 authored force/motion explanation fixtures | model-shaped output is post-validated; invalid, absent, or unsafe output falls back |
| Lesson Studio provider fixtures | one schema-valid golden draft plus malformed/prose outputs across four adapters | exactly two readings, required source needs/limits, no arbitrary endpoint, malformed output rejected |
| Cross-route browser matrix | home, four Worlds, trail, evidence, login/account, Studio | operable desktop/mobile interfaces, proof lock, local evidence control, no overflow or console error |
| Primary-source exhaustive validator | every assignment across four evidence categories | all 256 combinations receive the authored deterministic judgment |

The Studio browser journey uses a clearly mocked provider response only to test rendering. It is not recorded or presented as a live Anthropic response.

## Metrics and release thresholds

| Dimension | Threshold | Candidate result |
| --- | --- | --- |
| Application/unit tests | zero failures | **182/182 passed** across 23 files |
| Historical evaluator contracts | zero failures | **9/9 passed** |
| Full Playwright matrix | zero unexpected failures | **42 passed, 16 intentional duplicate-project skips, 0 failed** |
| Studio provider boundary | all four adapters, strict parse, fixed endpoints, no-returned-key error contract | **8/8 targeted tests passed** |
| Auth hardening boundary | privileged-key rejection, cookie policy, refresh anti-cache headers, nonce CSP | **4/4 targeted tests passed** |
| Production compilation | lint, TypeScript, optimized build | **PASS / PASS / PASS** |
| 320 CSS px | no horizontal overflow on Studio and Primary Source World | **PASS** in automated/real-browser checks |
| Live provider behavior | credentialed success plus refusal, timeout, malformed-output samples | **NOT RUN — no provider key available** |
| Durable event replay | idempotent database-backed replay through the UI | **NOT CONNECTED** |

## AI draft rubric

A provider draft is accepted only when every item below passes deterministic validation:

1. one opening phenomenon and commitment prompt;
2. exactly two uncertain plausible readings;
3. a subject-appropriate separating test and why it separates the readings;
4. two to five explanation/reconstruction sections;
5. an unfamiliar cold-transfer prompt that does not contain its answer;
6. a bounded statement of what one transfer could demonstrate and what remains untested;
7. one to six source-review needs with no invented citation requirement;
8. explicit safety notes and at least two draft limitations.

The same Zod schema validates all provider output. OpenAI uses Responses Structured Outputs; Anthropic, Gemini, and OpenRouter use their current JSON-schema output contracts. FORGE independently parses the final object and returns a generic error for refusal, truncation, prose, or malformed structure. See the official [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model), [Anthropic structured-output guide](https://platform.claude.com/docs/en/build-with-claude/structured-outputs?m=1), [Gemini structured-output guide](https://ai.google.dev/gemini-api/docs/structured-output), and [OpenRouter structured-output guide](https://openrouter.ai/docs/guides/features/structured-outputs).

## Privacy and security checks

- A BYOK credential is React component state only, is sent in one same-origin JSON request, and is cleared after success or failure.
- No key is stored in local/session storage, returned in output, accepted in a URL, or sent to an arbitrary base URL.
- The route rejects missing origin, cross-origin requests, JSON lookalikes, oversized bodies, extra fields, prompt-injection markers, restricted requests, and unmanaged child sessions.
- Managed OpenAI use is off unless both the key and explicit Studio enable flag exist server-side.
- Provider output has `Cache-Control: no-store`; the app does not persist a generated draft.
- Cloud session refreshes propagate the anti-cache headers required by `@supabase/ssr`; cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, and scoped to `/`.
- Production script policy uses a per-request nonce and does not permit arbitrary inline script.

These checks are implementation evidence, not a penetration test, privacy certification, provider-retention guarantee, or child-safety approval.

## Regression policy

Any change to a World version, proof validator, provider/model adapter, output schema, key handling, event type, CSP/cookie policy, learner band, source package, or evidence claim must rerun the complete unit, build, and browser matrix. A provider model change additionally requires live structured-output samples before that provider/model pair may be called verified. A generated draft becomes a reviewed World only through a separate source, rights, factual, pedagogical, access, proof-design, and publication gate.

## Residual gaps

- No provider call was made with a live OpenAI, Anthropic, Gemini, or OpenRouter credential.
- Provider-side storage, training, regional processing, rate limits, retries, and cost remain governed by the account and provider selected by the user.
- No live Supabase project, CAPTCHA, application-level auth limiter, guardian-consent service, or cloud evidence migration is deployed.
- Device learner mode and grown-up presence are editable UX preferences, not verified age or consent evidence.
- No representative learner, educator, source expert, accessibility specialist, privacy reviewer, or child-safety reviewer has evaluated the broad FORGE system.
- Immediate cold-transfer results do not establish retention, general capability, accreditation, or mastery.
