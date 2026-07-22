# FORGE Repository Rules

This repository now contains **FORGE — Learning OS**, a source-grounded learning system for children learning with adults, teenagers, and adults. The original ModelShift force-and-motion product remains one important Learning World and the reference implementation of **proof after help**; it is no longer the global product boundary.

## Authority and scope

Use this order when instructions conflict:

1. The user's explicit FORGE mandate and current task instructions.
2. `FORGE_PRODUCT_SPEC.md` for product purpose, learner rights, and claim boundaries.
3. `docs/program/README.md`, `docs/program/ARCHITECTURE.md`, and `docs/program/MASTER_PLAN.md` for current architecture, execution order, and cross-lane decisions.
4. `docs/FORGE_ARCHITECTURE.md`, `docs/FORGE_RESEARCH_TO_SYSTEM.md`, and `docs/FORGE_DELIVERY_GATES.md` for the detailed target system and evidence gates.
5. `FINAL_PRODUCT_SPEC.md` for the historical ModelShift v1 force-and-motion World only, where it does not conflict with the FORGE constitution.

The principal Codex task owns architecture changes, shared-contract decisions, integration, claims, and release authorization. Worker tasks own only the paths and bounded goals assigned in `docs/program/THREAD_LEDGER.md`.

## Non-negotiable product rules

1. Build toward the full FORGE North Star across subjects and ages; never promote roadmap breadth into implemented or validated breadth.
2. Preserve the governing loop: learner question → explicit starting model → two plausible readings → point of disagreement → separating experience → reconstruction → assistance withdrawal → unfamiliar proof → bounded evidence → deliberate return or application.
3. The learner performs the protected operation. AI may interpret, compare, rephrase, draft, or direct attention; it may not publish curriculum, determine domain truth, grade protected proof, upgrade evidence, grant authority, or impersonate a relationship.
4. Deterministic code owns state transitions, permissions, proof locks, idempotency, and evidence derivation. Authored domain validators, reviewed sources, or accountable human review own correctness according to the World type.
5. Every published World has reviewed/versioned sources where factual claims require them, a deterministic or accountable validator, explicit limitations, accessibility alternatives, proof conditions, and rollback provenance.
6. Every learner path remains useful when model and external-source services fail. Generated drafts remain unverified until the complete review and publication gate passes.
7. Instructional assistance, answer-changing, experiment replay, and solution-generating AI are structurally absent from protected proof. Accessibility support remains available and is recorded separately from cognitive help.
8. Children receive stricter defaults: device-only use, curated sources, grown-up-managed sessions where required, no open adult contact, and no cloud evidence by default. A local age preference or checkbox is never verified age, consent, assent, or guardian authority.
9. Learner data is not an engagement product. Do not create advertising profiles, hidden rank, emotion/personality/learning-style inference, raw-chat archives, permanent ability labels, or automatic cloud sharing.
10. No persistent chat companion, AI avatar, streak, points, badges, leaderboard, infinite feed, dark pattern, or mastery percentage.
11. Projects and human relationships remain first-class goals, but interpersonal or institutional features cannot ship before role verification, consent, scope, expiry, reporting, safeguarding, appeals, audit, and revocation are operationally proven.
12. Claims stay bounded to the exact World, version, population, conditions, assistance profile, task, delay, and evidence actually tested. One response is never mastery, retention, intelligence, efficacy, accreditation, homeschool readiness, or education replacement.
13. Negative, uncertain, contaminated, and not-yet-tested results remain visible and useful.
14. Tests and rendered evidence are required in proportion to risk. A broad green count never overrules a specific negative regression.
15. No worker merges to `main`, pushes a shared branch, deploys, enables credentials, spends provider credits, mutates a live database, or activates S2–S4 side effects without explicit principal and user authority.

## Engineering boundaries

- `src/forge/**` owns shared IDs, manifests, policies, event contracts, registry invariants, and the evolving World runtime. It must not own subject-specific answers.
- `src/worlds/**` and `src/components/worlds/**` own domain-authored state, separating experiences, support ladders, transfer tasks, and validators. They must not own global identity, publication, or evidence authority.
- `src/lib/forge-planner/**` deterministically routes questions to reviewed Worlds or an explicitly unverified source plan. Optional model output cannot invent IDs, sources, availability, or safety decisions.
- `src/lib/lesson-studio/**` and `app/api/forge/lesson-draft/**` are a proposal surface. Fixed allowlisted provider transports, strict schemas, redacted request handling, budgets, and human publication review are mandatory.
- `src/lib/forge-evidence/**` is currently a privacy-minimal device ledger, not tamper-proof canonical evidence. Durable evidence must flow through the typed event spine and approved server/RLS contracts before stronger claims.
- `src/lib/forge-auth/**`, `app/login/**`, and `app/account/**` must fail closed. Never expose service-role credentials, infer verified age, or convert identity into evidence sync/sharing automatically.
- `supabase/**` is staged durable architecture. RLS, append-only semantics, migrations, backup/restore, two-account isolation, export, deletion, and rollback require disposable then approved-project proof before enablement.
- `tests/**`, `evals/**`, and `docs/operations/**` distinguish engineering health from educational validity and production verification.
- Do not expose secrets through `NEXT_PUBLIC_*`, accept arbitrary provider URLs, log raw learner explanations or keys, or pass external/source text as instructions.
- Any change to cross-lane IDs, event envelope, proof semantics, evidence claim, age/guardian policy, learner-data ownership, provider-key handling, publication state, or side-effect authority requires a principal architecture decision before implementation.

## Worker and integration protocol

1. Confirm the actual nested repository, exact base SHA, branch, worktree, and clean status before editing.
2. Read the complete program control-room package and the assigned work packet.
3. Preserve existing/user work. Old-base handoffs are evidence to reconcile, never blind cherry-pick targets.
4. Stay within assigned paths. Report any ownership deviation before making it.
5. Produce one bounded, reviewable commit and the exact handoff format from `docs/program/THREAD_LEDGER.md`.
6. The principal independently inspects the diff and reruns proportional verification before integration.

## Required verification

Run focused normal, invalid, refusal, timeout, malformed, duplicate, partial-failure, contamination, and rollback cases appropriate to the slice. Before an integrated candidate can advance, run lint, typecheck, unit and evaluator-contract tests, offline evaluations, production build, and browser coverage across all production routes and critical journeys.

Rendered verification includes desktop, mobile, **320 CSS px**, keyboard-only operation, focus continuity, reduced motion, forced colors, noncolor/nonmotion alternatives, console/CSP health, overflow, fallback operation, and structural absence of instructional help in proof mode. Screen-reader and representative-user evidence must be named as unrun until actually performed.

Production is a separate gate: one frozen pushed SHA, immutable READY deployment, release identity, runtime feature-state check, critical-path verification, and a known rollback target.

## Historical ModelShift contract

`FINAL_PRODUCT_SPEC.md` remains unchanged as the record of the original Build Week wedge. Its deterministic physics, language-interpretation, assistance-governor, cold-transfer, and bounded-evidence requirements continue to govern the force-and-motion World. Its former exclusions of other subjects, accounts, databases, curricula, and broader FORGE architecture are historical scope cuts, not current repository-wide prohibitions.
