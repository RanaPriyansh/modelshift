# Compressed Execution Board

Deadline: 2026-07-22 05:30 IST. This board uses the under-five-hour kill switches from the governing mandate.

| Order | Workstream | Owner / model | Branch or environment | Owned files | Dependency | Acceptance test | Status | Kill switch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Goal and architecture authority | Separate Codex task, GPT-5.6 Sol xhigh | Same-project local, read-first | `docs/GOAL_AUTHORITY.md` only | Governing context | Durable goal plus acceptance/risk/integration order | In progress | Do not block safe scaffold work |
| 1 | Integration and shared contracts | Principal, GPT-5.6 Sol high | `main` | Root config, `AGENTS.md`, shared types/content, integration | Preflight | Strict typecheck and no ownership overlap | In progress | Freeze contracts before feature agents |
| 2 | Physics engine | Bounded Terra high agent | `codex/physics-engine` worktree | `src/domain/physics/**` | Shared scenario types | Physics invariants, determinism, continuity, stop clamp | Pending | Use authored analytical samples; no renderer integration |
| 3 | Learning state and policy | Bounded Terra high agent | `codex/learning-state` worktree | `src/domain/learning/**` | Shared learning types | Transition table, invalid-event matrix, proof rejection | Pending | Remove optional persistence before weakening guards |
| 4 | GPT contract and eval | Bounded Terra high agent | `codex/gpt-contract` worktree | `src/lib/ai/**`, `app/api/**`, `evals/**` | Shared enums/schemas | Schema/semantic/leakage/fallback tests and 50-fixture report | Pending | Force neutral fallback; never render model-authored help |
| 5 | Frontend and integration | Principal with frontend-builder skill | `main` | `app/page.tsx`, `src/components/**`, styles | Frozen contracts; deterministic APIs | Complete fallback path in browser at both viewports | Pending | Cut optional motion/panels, never cold transfer |
| 6 | Independent QA | Fresh Terra high reviewer | Read-only first; tests only if assigned | `tests/**` | Integrated build | Browser, keyboard, reduced-motion, console, timeout, proof checks | Pending | Findings-first; no broad refactor |
| 7 | Deployment and docs | Principal; Vercel skill at build-green gate | `main` / Vercel production | README, docs, Vercel metadata | Production build green | Public incognito journey and source/deploy SHA match | Pending | Stop polish until deployment works |

## Compressed phases

- **00:50–01:10** — context, authority, repo, contracts, tool/credential preflight, implementation lanes.
- **01:10–02:20** — deterministic physics/state, complete no-AI UI loop, first integration tests.
- **02:20–03:20** — validated GPT boundary, fixtures, production build, first preview deployment.
- **03:20–04:30** — browser QA, responsive/accessibility fixes, full suite, production deployment.
- **04:30–05:05** — documentation, demo rehearsal assets, repository/public link verification.
- **05:05–05:30** — frozen submission buffer; no optional features.

## Merge order

Shared contracts → physics → learning policy → deterministic UI integration → GPT contract → independent QA → deployment/docs. Every merge requires diff inspection plus targeted and integration tests.
