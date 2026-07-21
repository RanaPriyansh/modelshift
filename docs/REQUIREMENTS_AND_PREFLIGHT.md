# Requirements and Preflight

Verified 2026-07-22 at approximately 00:51 IST.

## Environment inventory

| Area | Verified state |
| --- | --- |
| Repository | New Git repository rooted at `education/`; no pre-existing application or commits |
| Runtime | Node `v22.22.3`, npm `10.9.8`, pnpm `11.9.0` |
| Package manager | None established; use pnpm as required by the governing prompt |
| GitHub | `gh` `2.92.0`, authenticated as `RanaPriyansh`; no remote yet |
| Vercel | Cached CLI `56.4.1` is callable through `npx --no-install`; no authenticated session or project link |
| OpenAI | `OPENAI_API_KEY` and `OPENAI_MODEL` absent from the current process; no adjacent `.env*` file |
| Browser | Google Chrome installed; Codex Browser/IAB capability available; project Playwright setup not yet present |
| Tests | No existing test dependencies or configuration |
| Existing source | Four governing Markdown files, two research reports, and two byte-identical decision-report previews only |

No secret values were read or recorded.

## Deadline

The [official OpenAI Build Week rules](https://openai.devpost.com/rules) state that submissions close July 21, 2026 at 5:00 p.m. PDT, equivalent to July 22, 2026 at 05:30 IST. At 00:51:56 IST, 278 full minutes remained.

## Available capabilities selected for the critical path

- GPT-5.6 Sol xhigh Goal Authority task for durable goal and architecture review.
- Terra high bounded implementation/review agents with isolated ownership.
- Frontend builder and ImageGen for an implementation-grade concept.
- Official OpenAI documentation workflow for current Responses API and Structured Outputs details.
- Codex Browser/IAB first, with repository Playwright for repeatable desktop/mobile E2E.
- GitHub CLI for repository publication.
- Vercel CLI/plugin for deployment once the production build passes.

## Hard requirements

1. One complete flow: mystery → committed prediction/confidence → explanation → bounded interpretation → probe prediction → deterministic experiment → reflection/reconstruction → cold transfer → truthful evidence card.
2. Pure analytical one-dimensional physics with precomputed trajectories and tested invariants.
3. Typed learning reducer with fail-closed guards, support accounting, and structural proof-mode restrictions.
4. GPT-5.6 selects only authored IDs through a strict schema; server validation owns evidence containment, compatibility, timeout, leakage, and fallback.
5. The entire journey completes when the model is missing, slow, invalid, refused, or disabled.
6. Responsive and accessible UI at 1440×900 and 390×844, including keyboard and reduced-motion paths.
7. Public no-login deployment, test/eval evidence, demo script, claims discipline, license, README, and submission documentation.

## Assumptions and blockers

- `preview.html` is the missing named decision report's equivalent; this is recorded in `docs/DECISIONS.md`.
- No live model call can be verified until a server-side OpenAI key is available. This does not block implementation or fallback verification.
- Vercel production deployment requires device/account authentication. Local build and browser QA proceed first.
- GitHub has no existing target repository; creation is an authorized normal delivery step but will occur only after a clean local baseline.
- The optional post-submission explanation call, delayed reminder, share image, Sites mirror, and second concept are outside the critical path.

## Critical path

1. Freeze shared enums/types and scaffold the deterministic application.
2. Pass physics and learning-policy tests.
3. Complete the no-model UI journey and browser smoke test.
4. Add the validated OpenAI boundary and 50-fixture deterministic/eval harness.
5. Pass lint, typecheck, unit, eval, build, desktop/mobile E2E, keyboard, reduced-motion, timeout, and proof-policy checks.
6. Authenticate/link Vercel, deploy, run public smoke, publish GitHub, and finish submission evidence.
