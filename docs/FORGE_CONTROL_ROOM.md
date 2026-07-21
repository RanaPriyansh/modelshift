# FORGE Parallel Build Control Room

Status: active integration board for the July 22, 2026 FORGE expansion.

The root Codex task owns product authority, shared integration, release claims, production verification, and deployment. Parallel builders own only the paths listed below. `AGENTS.md`, `FINAL_PRODUCT_SPEC.md`, `CODEX_MASTER_PROMPT.md`, and the original submission materials remain historical ModelShift-v1 evidence; new FORGE documents supersede their narrow product scope without rewriting that history.

## Shared outcome

Build the first honest FORGE foundation: a universal learning front door, typed evidence tiers, multiple domain grammars, an inspectable AI boundary, learner-owned evidence, delayed-proof scheduling, a production data model, and three working Learning Worlds. Do not claim a complete curriculum, accreditation, legal homeschool compliance, child-safety certification, or measured learning efficacy.

## Work lanes

| Lane | Owner | Exclusive paths | Handoff gate |
| --- | --- | --- | --- |
| Product and architecture | background task `019f86ae-9b6c-7590-8b58-6982a15cc23d` | `FORGE_PRODUCT_SPEC.md`, four named FORGE architecture/delivery docs | Constitution, failure map, schemas, safety, claim boundary, phased gates |
| Core contracts | background task `019f86ae-bfd6-7b53-ae0c-da9eb4057375` | `src/forge/**` | Registry and invariants pass Vitest; two manifests; fail-closed age/proof/source policy |
| AI evidence World | background task `019f86ae-9618-7683-bfa1-3d5f49c04c21` | `src/worlds/ai-learning/**`, matching component tree | Full Evidence World, primary-source provenance, deterministic scoring, unit tests |
| Universal shell | background task `019f86ae-a8e5-79a1-90e4-446903ee9836` | `app/page.tsx`, `app/learn/**`, `app/trail/**`, `app/evidence/**`, `src/components/forge/**`, `app/forge.css` | Responsive home, Learning Contract, routes, Trail, Evidence, AI disclosure |
| Local evidence ledger | background task `019f86ae-a011-7c22-8a45-71e7c96d4243` | `src/lib/forge-evidence/**` | Versioned privacy-minimal store, export/delete/schedule, corrupt-data tests |
| Path compiler | background task `019f86ae-b498-7e31-83f8-30fc4391e31a` | `src/lib/forge-planner/**`, `app/api/forge/plan/route.ts` | Strict planner, deterministic fallback, age/safety gates, adversarial tests |
| Database and RLS | subagent `backend_schema` | `supabase/**`, `docs/FORGE_DATABASE.md` | Indexed constrained schema, forced RLS, scoped sharing, append-only evidence |
| Proportional reasoning World | subagent `math_world` | proportional-reasoning World and component trees | Exact arithmetic World, cold transfer, bounded evidence, unit tests |
| Live design review | subagent `broad_ux` | read-only | Chrome-backed behavioral review of all design-lab routes |
| Integration and release | root task | shared glue, metadata, README, QA, deployment | Full lint/typecheck/tests/build/E2E, public deploy, evidence-backed release note |

## Integration order

1. Freeze product terms: FORGE, ModelShift protocol, Learning World, evidence tiers, AI modes, age policy.
2. Land contracts and registry.
3. Land domain Worlds without changing their pure reducers.
4. Land the shell and route each World through a thin adapter.
5. Connect evidence outputs to the local ledger.
6. Connect universal intake to the planner and Learning Contract.
7. Reconcile styles and responsive composition using the governing design system.
8. Add cross-World policy, route, accessibility, and E2E coverage.
9. Run the complete local verification matrix.
10. Deploy the Next.js application to Vercel and verify public production.

## Shared message contract

Every lane handoff must provide:

```text
Outcome
Files changed
Public exports or routes
Tests run and exact result
Known limitations
Integration assumptions
```

No lane may call a partial implementation `production-ready`, `homeschool-ready`, `safe for all ages`, or `validated learning`. The root task assigns the final claim.

## Failure and recovery

- Conflicting edits: stop the later owner, preserve both diffs, and integrate explicitly.
- Missing contract: use a narrow local adapter; do not invent shared authority silently.
- Model unavailable: retain a complete deterministic authored path.
- Unsupported learner goal: return an exploratory or restricted Learning Contract, not a fabricated lesson.
- Missing reviewed source: stop the factual claim or show it as unverified.
- Proof contamination: reject the attempt as independent evidence and schedule a new case.
- Missing human/offline work: keep the programme requirement open; software cannot auto-complete it.
- Broken age/safety policy: fail closed and remove the affected World from the child catalogue.

## Release gates

- All published World manifests validate.
- Three structurally different Worlds complete without model access.
- No proof mode exposes hints, replay, answers, or instructional AI.
- Factual claims in source-grounded Worlds trace to reviewed versioned sources.
- Under-13 planning requires guardian-managed mode and curated retrieval.
- Learner evidence can be inspected, exported, and deleted locally.
- No raw chat, emotion, personality, or hidden ranking enters canonical memory.
- Desktop, mobile, keyboard, reduced-motion, console, and overflow checks pass.
- Public copy distinguishes implemented capability from architecture and research hypotheses.

